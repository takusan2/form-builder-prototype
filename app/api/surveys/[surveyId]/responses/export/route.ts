import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseSurvey } from "@/lib/survey-helpers";
import type { Question, Choice, MatrixRow, MatrixColumn } from "@/lib/types/survey";
import { QUESTION_TYPE_LABELS } from "@/lib/types/survey";
import * as XLSX from "xlsx";

// 展開後の1列の定義
interface ExportColumn {
  header: string; // ヘッダー表示名
  questionId: string;
  questionText: string;
  questionType: string;
  pageTitle: string;
  // 展開元の情報
  subLabel?: string; // 選択肢テキスト, 行テキスト等
  subValue?: string; // 選択肢value, 列value等
  // 値の抽出方法
  extract: (data: Record<string, unknown>) => string | number;
}

interface QuestionWithPage extends Question {
  pageTitle: string;
  pageIndex: number;
  questionIndex: number;
}

/**
 * キャリーフォワード設問の選択肢/行を参照元から解決する
 * エクスポートでは回答データに依存せず、参照元の全選択肢を列として展開する
 */
function resolveCarryForwardForExport(
  q: QuestionWithPage,
  allQuestions: QuestionWithPage[]
): { choices: Choice[]; matrixRows: MatrixRow[] } {
  const cf = q.carryForward;
  if (!cf) {
    return { choices: q.choices || [], matrixRows: q.matrixRows || [] };
  }

  const source = allQuestions.find((sq) => sq.id === cf.questionId);
  if (!source) {
    return { choices: q.choices || [], matrixRows: q.matrixRows || [] };
  }

  const sourceChoices = source.choices || [];

  // マトリクス設問: 参照元の選択肢を行に変換
  if (q.type === "matrix_single" || q.type === "matrix_multiple") {
    const matrixRows: MatrixRow[] = sourceChoices.map((c) => ({
      id: c.value, // carry-forward.ts と同じ: 行IDに選択肢のvalueを使う
      text: c.text,
    }));
    return { choices: [], matrixRows };
  }

  // 選択肢設問: 参照元の選択肢をそのまま使う
  return { choices: sourceChoices, matrixRows: [] };
}

function buildExportColumns(questions: QuestionWithPage[]): ExportColumn[] {
  const columns: ExportColumn[] = [];

  for (let qi = 0; qi < questions.length; qi++) {
    const q = questions[qi];
    const qNum = qi + 1; // Q1, Q2, Q3... 通し番号
    const baseInfo = {
      questionId: q.id,
      questionText: q.text || "(無題)",
      questionType: QUESTION_TYPE_LABELS[q.type] || q.type,
      pageTitle: q.pageTitle,
    };

    // キャリーフォワード解決: 参照元の選択肢/行を取得
    const resolved = resolveCarryForwardForExport(q, questions);

    switch (q.type) {
      case "multiple_choice": {
        // 選択肢ごとに列を展開（1/0）
        const choices = resolved.choices;
        for (let ci = 0; ci < choices.length; ci++) {
          const choice = choices[ci];
          columns.push({
            ...baseInfo,
            header: `Q${qNum}_${ci + 1}`,
            subLabel: choice.text,
            subValue: choice.value,
            extract: (data) => {
              const val = data[q.id];
              if (!val) return 0;
              if (Array.isArray(val)) return val.includes(choice.value) ? 1 : 0;
              return String(val).split(",").includes(choice.value) ? 1 : 0;
            },
          });
        }
        break;
      }

      case "matrix_single": {
        // 行ごとに列を展開（Q2-1, Q2-2...）
        const rows = resolved.matrixRows;
        const colMap = new Map((q.matrixColumns || []).map((c) => [c.value, c.text]));
        for (let ri = 0; ri < rows.length; ri++) {
          const row = rows[ri];
          columns.push({
            ...baseInfo,
            header: `Q${qNum}-${ri + 1}`,
            subLabel: row.text,
            extract: (data) => {
              const val = data[q.id];
              if (!val || typeof val !== "object") return "";
              const matrixData = val as Record<string, string>;
              const colVal = matrixData[row.id] || "";
              return colMap.get(colVal) || colVal;
            },
          });
        }
        break;
      }

      case "matrix_multiple": {
        // 行ごとに列を展開、各行の中で選択肢ごとに1/0（Q3-1_選択肢A, Q3-1_選択肢B...）
        const mRows = resolved.matrixRows;
        const mCols = q.matrixColumns || [];
        for (let ri = 0; ri < mRows.length; ri++) {
          const row = mRows[ri];
          for (let ci = 0; ci < mCols.length; ci++) {
            const col = mCols[ci];
            columns.push({
              ...baseInfo,
              header: `Q${qNum}-${ri + 1}_${ci + 1}`,
              subLabel: `${row.text} × ${col.text}`,
              subValue: col.value,
              extract: (data) => {
                const val = data[q.id];
                if (!val || typeof val !== "object") return 0;
                const matrixData = val as Record<string, string>;
                const selected = (matrixData[row.id] || "").split(",").filter(Boolean);
                return selected.includes(col.value) ? 1 : 0;
              },
            });
          }
        }
        break;
      }

      case "single_choice": {
        const choiceMap = new Map(resolved.choices.map((c) => [c.value, c.text]));
        columns.push({
          ...baseInfo,
          header: `Q${qNum}`,
          extract: (data) => {
            const val = data[q.id];
            if (val === undefined || val === null) return "";
            const s = String(val);
            return choiceMap.get(s) || s;
          },
        });
        break;
      }

      default: {
        columns.push({
          ...baseInfo,
          header: `Q${qNum}`,
          extract: (data) => {
            const val = data[q.id];
            if (val === undefined || val === null) return "";
            if (Array.isArray(val)) return val.join(", ");
            return typeof val === "number" ? val : String(val);
          },
        });
        break;
      }
    }
  }

  return columns;
}

/**
 * 設問単位の質問対応表（1行1設問、マトリクスは行ごとにサブ設問展開）
 *
 * 番号体系: Q1, Q2, Q3... （ページ無視の通し番号）
 * マトリクスのサブ設問: Q2-1, Q2-2, Q2-3...
 */
function buildCodebookSheet(
  questions: QuestionWithPage[]
): (string | number)[][] {
  const rows: (string | number)[][] = [];

  const formatChoices = (items: { value: string; text: string }[]) =>
    items.map((c) => `${c.value}: ${c.text}`).join(" / ");

  for (let qi = 0; qi < questions.length; qi++) {
    const q = questions[qi];
    const qNum = qi + 1;
    const resolved = resolveCarryForwardForExport(q, questions);
    const requiredLabel = q.required ? "必須" : "";

    // 備考
    const notes: string[] = [];
    if (q.carryForward) {
      const srcIdx = questions.findIndex((sq) => sq.id === q.carryForward!.questionId);
      const srcLabel = srcIdx !== -1 ? `Q${srcIdx + 1}` : q.carryForward.questionId;
      const modeLabel = q.carryForward.mode === "selected" ? "選択されたもの" : "選択されなかったもの";
      notes.push(`CF: ${srcLabel}の${modeLabel}`);
    }

    switch (q.type) {
      case "single_choice": {
        const choicesStr = formatChoices(resolved.choices);
        rows.push([`Q${qNum}`, q.pageTitle, q.text || "(無題)", "SA", choicesStr, requiredLabel, notes.join("; ")]);
        break;
      }

      case "multiple_choice": {
        const choicesStr = formatChoices(resolved.choices);
        rows.push([`Q${qNum}`, q.pageTitle, q.text || "(無題)", "MA", choicesStr, requiredLabel, notes.join("; ")]);
        break;
      }

      case "matrix_single":
      case "matrix_multiple": {
        const mRows = resolved.matrixRows;
        const mCols = q.matrixColumns || [];
        const colsStr = formatChoices(mCols.map((c) => ({ value: c.value, text: c.text })));
        const subType = q.type === "matrix_single" ? "SA" : "MA";

        for (let ri = 0; ri < mRows.length; ri++) {
          const row = mRows[ri];
          const subText = `[${q.text || "(無題)"}] ${row.text}`;
          rows.push([`Q${qNum}-${ri + 1}`, q.pageTitle, subText, subType, colsStr, requiredLabel, ri === 0 ? notes.join("; ") : ""]);
        }

        if (mRows.length === 0) {
          rows.push([`Q${qNum}`, q.pageTitle, q.text || "(無題)", `マトリクス${subType}`, colsStr, requiredLabel, notes.join("; ")]);
        }
        break;
      }

      case "rating_scale": {
        const min = q.ratingMin ?? 1;
        const max = q.ratingMax ?? 5;
        const minLabel = q.ratingMinLabel ? `(${q.ratingMinLabel})` : "";
        const maxLabel = q.ratingMaxLabel ? `(${q.ratingMaxLabel})` : "";
        const scaleStr = `${min}${minLabel} 〜 ${max}${maxLabel}`;
        rows.push([`Q${qNum}`, q.pageTitle, q.text || "(無題)", "段階評価", scaleStr, requiredLabel, notes.join("; ")]);
        break;
      }

      case "number_input": {
        const parts: string[] = [];
        if (q.validation?.minValue != null) parts.push(`最小${q.validation.minValue}`);
        if (q.validation?.maxValue != null) parts.push(`最大${q.validation.maxValue}`);
        rows.push([`Q${qNum}`, q.pageTitle, q.text || "(無題)", "数値入力", parts.join(" / "), requiredLabel, notes.join("; ")]);
        break;
      }

      case "open_text": {
        const parts: string[] = [];
        if (q.validation?.minLength != null) parts.push(`${q.validation.minLength}文字以上`);
        if (q.validation?.maxLength != null) parts.push(`${q.validation.maxLength}文字以下`);
        rows.push([`Q${qNum}`, q.pageTitle, q.text || "(無題)", "自由記述", parts.join(" / "), requiredLabel, notes.join("; ")]);
        break;
      }

      default: {
        rows.push([`Q${qNum}`, q.pageTitle, q.text || "(無題)", QUESTION_TYPE_LABELS[q.type] || q.type, "", requiredLabel, notes.join("; ")]);
        break;
      }
    }
  }

  return rows;
}

// GET /api/surveys/[surveyId]/responses/export?format=csv|xlsx
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ surveyId: string }> }
) {
  const { surveyId } = await params;
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") || "csv";

  const raw = await prisma.survey.findUnique({ where: { id: surveyId } });
  if (!raw) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const survey = parseSurvey(raw);

  // 全設問（ページ情報付き）
  const allQuestions: QuestionWithPage[] = survey.structure.pages.flatMap(
    (p, pageIndex) =>
      p.questions.map((q, questionIndex) => ({
        ...q,
        pageTitle: p.title,
        pageIndex,
        questionIndex,
      }))
  );

  // 展開カラム定義を構築
  const exportColumns = buildExportColumns(allQuestions);

  const responses = await prisma.response.findMany({
    where: { surveyId },
    orderBy: { completedAt: "asc" },
  });

  // === 回答データシート ===
  const dataHeaders = [
    "回答ID",
    "ステータス",
    "回答者UID",
    ...exportColumns.map((c) => c.header),
    "所要時間(秒)",
    "回答日時",
  ];

  const dataRows = responses.map((r) => {
    const data = r.data as Record<string, unknown>;
    return [
      r.id,
      r.status,
      r.respondentUid || "",
      ...exportColumns.map((c) => c.extract(data)),
      r.duration,
      r.completedAt.toISOString(),
    ];
  });

  const dataSheet = XLSX.utils.aoa_to_sheet([dataHeaders, ...dataRows]);

  // === 質問対応表シート ===
  const codebookHeaders = [
    "設問番号",
    "ページ",
    "設問文",
    "回答形式",
    "選択肢",
    "必須",
    "備考",
  ];
  const codebookRows = buildCodebookSheet(allQuestions);
  const codebookSheet = XLSX.utils.aoa_to_sheet([
    codebookHeaders,
    ...codebookRows,
  ]);

  if (format === "xlsx") {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, dataSheet, "回答データ");
    XLSX.utils.book_append_sheet(wb, codebookSheet, "質問対応表");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buf, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="responses-${surveyId}.xlsx"`,
      },
    });
  }

  // CSV: 回答データ + 空行 + 質問対応表を結合
  const dataCSV = XLSX.utils.sheet_to_csv(dataSheet);
  const codebookCSV = XLSX.utils.sheet_to_csv(codebookSheet);
  const csv = dataCSV + "\n\n--- 質問対応表 ---\n" + codebookCSV;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="responses-${surveyId}.csv"`,
    },
  });
}

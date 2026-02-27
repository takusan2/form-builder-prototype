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

function buildExportColumns(questions: QuestionWithPage[]): ExportColumn[] {
  const columns: ExportColumn[] = [];

  for (const q of questions) {
    const prefix = `Q${q.pageIndex + 1}-${q.questionIndex + 1}`;
    const baseInfo = {
      questionId: q.id,
      questionText: q.text || "(無題)",
      questionType: QUESTION_TYPE_LABELS[q.type] || q.type,
      pageTitle: q.pageTitle,
    };

    switch (q.type) {
      case "multiple_choice": {
        // 選択肢ごとに列を展開（1/0）
        const choices = q.choices || [];
        for (const choice of choices) {
          columns.push({
            ...baseInfo,
            header: `${prefix}_${choice.text}`,
            subLabel: choice.text,
            subValue: choice.value,
            extract: (data) => {
              const val = data[q.id];
              if (!val) return 0;
              // 複数選択は配列またはカンマ区切り
              if (Array.isArray(val)) return val.includes(choice.value) ? 1 : 0;
              return String(val).split(",").includes(choice.value) ? 1 : 0;
            },
          });
        }
        break;
      }

      case "matrix_single": {
        // 行ごとに列を展開（値=選択された列テキスト）
        const rows = q.matrixRows || [];
        const colMap = new Map((q.matrixColumns || []).map((c) => [c.value, c.text]));
        for (const row of rows) {
          columns.push({
            ...baseInfo,
            header: `${prefix}_${row.text}`,
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
        // 行×列ごとに列を展開（1/0）
        const mRows = q.matrixRows || [];
        const mCols = q.matrixColumns || [];
        for (const row of mRows) {
          for (const col of mCols) {
            columns.push({
              ...baseInfo,
              header: `${prefix}_${row.text}_${col.text}`,
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
        // 値列 + テキスト列
        const choiceMap = new Map((q.choices || []).map((c) => [c.value, c.text]));
        columns.push({
          ...baseInfo,
          header: `${prefix}`,
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
        // rating_scale, open_text, ranking, number_input: 単一列
        columns.push({
          ...baseInfo,
          header: `${prefix}`,
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

function buildCodebookRows(columns: ExportColumn[]): (string | number)[][] {
  return columns.map((col, i) => [
    i + 1,
    col.header,
    col.questionId,
    col.questionText,
    col.questionType,
    col.pageTitle,
    col.subLabel || "",
    col.subValue || "",
  ]);
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
    "#",
    "列名",
    "設問ID",
    "設問テキスト",
    "設問タイプ",
    "ページ",
    "選択肢/行列",
    "値",
  ];
  const codebookRows = buildCodebookRows(exportColumns);
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

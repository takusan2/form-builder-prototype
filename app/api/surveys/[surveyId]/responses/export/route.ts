import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseSurvey } from "@/lib/survey-helpers";
import * as XLSX from "xlsx";

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

  // 全設問を取得してヘッダーを構築
  const allQuestions = survey.structure.pages.flatMap((p) =>
    p.questions.map((q) => ({ id: q.id, text: q.text, type: q.type }))
  );

  const responses = await prisma.response.findMany({
    where: { surveyId },
    orderBy: { completedAt: "asc" },
  });

  // ヘッダー行
  const headers = [
    "回答ID",
    "ステータス",
    "回答者UID",
    ...allQuestions.map((q) => q.text || q.id),
    "所要時間(秒)",
    "回答日時",
  ];

  // データ行
  const rows = responses.map((r) => {
    const data = r.data as Record<string, unknown>;
    return [
      r.id,
      r.status,
      r.respondentUid || "",
      ...allQuestions.map((q) => {
        const val = data[q.id];
        if (val === undefined || val === null) return "";
        if (Array.isArray(val)) return val.join(", ");
        if (typeof val === "object") {
          // マトリクス: { rowId: "value" } → "row1: value1, row2: value2"
          return Object.entries(val)
            .map(([k, v]) => `${k}: ${v}`)
            .join(", ");
        }
        return String(val);
      }),
      r.duration,
      r.completedAt.toISOString(),
    ];
  });

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  if (format === "xlsx") {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "回答");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="responses-${surveyId}.xlsx"`,
      },
    });
  }

  // CSV
  const csv = XLSX.utils.sheet_to_csv(ws);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="responses-${surveyId}.csv"`,
    },
  });
}

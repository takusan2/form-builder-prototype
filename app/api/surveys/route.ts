import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseSurvey, serializeSurvey } from "@/lib/survey-helpers";

// GET /api/surveys - 一覧取得
export async function GET() {
  const surveys = await prisma.survey.findMany({
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(surveys.map(parseSurvey));
}

// POST /api/surveys - 新規作成
export async function POST(request: NextRequest) {
  const body = await request.json();
  const defaultStructure = { pages: [{ id: crypto.randomUUID().slice(0, 8), title: "ページ 1", questions: [] }] };
  const data = serializeSurvey({
    title: body.title || "無題のアンケート",
    description: body.description || "",
    status: "draft",
    settings: {
      showProgressBar: true,
      allowBack: true,
      completionMessage: "ご回答ありがとうございました。",
      disqualifyMessage: "申し訳ございませんが、今回の調査対象外となりました。",
    },
    structure: body.structure || defaultStructure,
    quotas: [],
  });
  const survey = await prisma.survey.create({ data: data as Parameters<typeof prisma.survey.create>[0]["data"] });
  return NextResponse.json(parseSurvey(survey), { status: 201 });
}

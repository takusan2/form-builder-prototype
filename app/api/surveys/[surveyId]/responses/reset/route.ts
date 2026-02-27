import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// POST /api/surveys/[surveyId]/responses/reset - 回答とクオータカウンターをリセット
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ surveyId: string }> }
) {
  const { surveyId } = await params;

  const survey = await prisma.survey.findUnique({ where: { id: surveyId } });
  if (!survey) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [deletedResponses, deletedCounters] = await Promise.all([
    prisma.response.deleteMany({ where: { surveyId } }),
    prisma.quotaCounter.deleteMany({ where: { surveyId } }),
  ]);

  return NextResponse.json({
    success: true,
    deletedResponses: deletedResponses.count,
    deletedCounters: deletedCounters.count,
  });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseSurvey } from "@/lib/survey-helpers";

// POST /api/surveys/[surveyId]/publish
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ surveyId: string }> }
) {
  const { surveyId } = await params;
  const survey = await prisma.survey.findUnique({ where: { id: surveyId } });
  if (!survey) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const newStatus = survey.status === "published" ? "closed" : "published";
  const updated = await prisma.survey.update({
    where: { id: surveyId },
    data: { status: newStatus },
  });
  return NextResponse.json(parseSurvey(updated));
}

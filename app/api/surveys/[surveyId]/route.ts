import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseSurvey, serializeSurvey } from "@/lib/survey-helpers";

// GET /api/surveys/[surveyId]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ surveyId: string }> }
) {
  const { surveyId } = await params;
  const survey = await prisma.survey.findUnique({ where: { id: surveyId } });
  if (!survey) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const responseCount = await prisma.response.count({ where: { surveyId } });
  return NextResponse.json({ ...parseSurvey(survey), responseCount });
}

// PUT /api/surveys/[surveyId]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ surveyId: string }> }
) {
  const { surveyId } = await params;
  const body = await request.json();
  const data = serializeSurvey(body);
  const survey = await prisma.survey.update({
    where: { id: surveyId },
    data,
  });
  return NextResponse.json(parseSurvey(survey));
}

// DELETE /api/surveys/[surveyId]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ surveyId: string }> }
) {
  const { surveyId } = await params;
  await prisma.survey.delete({ where: { id: surveyId } });
  return NextResponse.json({ success: true });
}

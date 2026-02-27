import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// DELETE /api/surveys/[surveyId]/responses/[responseId]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ surveyId: string; responseId: string }> }
) {
  const { surveyId, responseId } = await params;

  const response = await prisma.response.findFirst({
    where: { id: responseId, surveyId },
  });

  if (!response) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.response.delete({ where: { id: responseId } });
  return NextResponse.json({ success: true });
}

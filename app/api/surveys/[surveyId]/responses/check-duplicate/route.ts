import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ surveyId: string }> }
) {
  const { surveyId } = await params;
  const { searchParams } = new URL(request.url);
  const uid = searchParams.get("uid");

  if (!uid) {
    return NextResponse.json({ exists: false });
  }

  const existing = await prisma.response.findFirst({
    where: {
      surveyId,
      respondentUid: uid,
      status: "completed",
    },
    select: { id: true },
  });

  return NextResponse.json({ exists: !!existing });
}

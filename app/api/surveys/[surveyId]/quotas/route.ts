import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/surveys/[surveyId]/quotas - クオータカウンター取得
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ surveyId: string }> }
) {
  try {
    const { surveyId } = await params;
    const counters = await prisma.quotaCounter.findMany({
      where: { surveyId },
    });
    const map: Record<string, number> = {};
    for (const c of counters) {
      map[c.quotaId] = c.count;
    }
    return NextResponse.json(map);
  } catch (error) {
    console.error("Failed to fetch quota counters:", error);
    return NextResponse.json({}, { status: 200 });
  }
}

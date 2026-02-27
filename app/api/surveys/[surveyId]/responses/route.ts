import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import { parseSurvey } from "@/lib/survey-helpers";
import { sendWebhook } from "@/lib/services/webhook-service";
import { findExceededQuotas, getMatchingQuotaIds } from "@/lib/engine/quota-engine";
import type { WebhookPayload, ResponseData } from "@/lib/types/survey";

// GET /api/surveys/[surveyId]/responses - 回答一覧
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ surveyId: string }> }
) {
  const { surveyId } = await params;
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || "50")));
  const offset = (page - 1) * limit;

  const [responses, total] = await Promise.all([
    prisma.response.findMany({
      where: { surveyId },
      orderBy: { completedAt: "desc" },
      skip: offset,
      take: limit,
    }),
    prisma.response.count({ where: { surveyId } }),
  ]);

  return NextResponse.json({
    responses,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

// POST /api/surveys/[surveyId]/responses - 回答送信
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ surveyId: string }> }
) {
  const { surveyId } = await params;
  const body = await request.json();
  const { data, respondent, metadata } = body as {
    data: ResponseData;
    respondent?: { uid?: string; params: Record<string, string> };
    metadata: { completedAt: string; duration: number; pageHistory: string[] };
  };

  const raw = await prisma.survey.findUnique({
    where: { id: surveyId },
    include: { webhooks: true, quotaCounters: true },
  });

  if (!raw) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const survey = parseSurvey(raw);
  if (survey.status !== "published") {
    return NextResponse.json({ error: "Survey is not published" }, { status: 400 });
  }

  // --- クオータチェック ---
  let responseStatus = "completed";

  if (survey.quotas.length > 0) {
    const counters = new Map(
      raw.quotaCounters.map((c) => [c.quotaId, c.count])
    );

    const exceeded = findExceededQuotas(survey.quotas, data, counters);
    if (exceeded.length > 0) {
      const quota = exceeded[0];
      if (quota.action === "disqualify") {
        responseStatus = "disqualified";
        // 対象外でも回答は保存する
        await prisma.response.create({
          data: {
            surveyId,
            status: "disqualified",
            respondentUid: respondent?.uid,
            respondentParams: respondent?.params || {},
            data: data as Prisma.InputJsonValue,
            duration: metadata?.duration || 0,
            pageHistory: metadata?.pageHistory || [],
            completedAt: metadata?.completedAt ? new Date(metadata.completedAt) : new Date(),
          },
        });
        return NextResponse.json({
          success: false,
          disqualified: true,
          reason: "quota_exceeded",
          quotaId: quota.id,
        });
      }
      if (quota.action === "close") {
        return NextResponse.json({
          success: false,
          closed: true,
          reason: "quota_full",
          quotaId: quota.id,
        });
      }
    }

    // マッチするクオータのカウントをインクリメント
    const matchingIds = getMatchingQuotaIds(survey.quotas, data);
    for (const quotaId of matchingIds) {
      try {
        await prisma.quotaCounter.upsert({
          where: { surveyId_quotaId: { surveyId, quotaId } },
          update: { count: { increment: 1 } },
          create: { surveyId, quotaId, count: 1 },
        });
      } catch (err) {
        console.error("[Quota] failed to upsert counter for", quotaId, err);
      }
    }
  }

  // --- 回答をDBに保存 ---
  await prisma.response.create({
    data: {
      surveyId,
      status: responseStatus,
      respondentUid: respondent?.uid,
      respondentParams: respondent?.params || {},
      data: data as Prisma.InputJsonValue,
      duration: metadata?.duration || 0,
      pageHistory: metadata?.pageHistory || [],
      completedAt: metadata?.completedAt ? new Date(metadata.completedAt) : new Date(),
    },
  });

  // --- Webhook送信 ---
  const payload: WebhookPayload = {
    event: "response.completed",
    surveyId,
    respondent: {
      uid: respondent?.uid,
      params: respondent?.params || {},
    },
    data,
    metadata: {
      completedAt: metadata?.completedAt || new Date().toISOString(),
      duration: metadata?.duration || 0,
      pageHistory: metadata?.pageHistory || [],
    },
  };

  const webhookResults = await Promise.allSettled(
    raw.webhooks
      .filter((w) => w.enabled)
      .map((w) =>
        sendWebhook(
          {
            url: w.url,
            method: w.method,
            headers: (w.headers as Record<string, string>) || {},
            secret: w.secret,
            retryCount: w.retryCount,
            retryInterval: w.retryInterval,
          },
          payload
        )
      )
  );

  return NextResponse.json({
    success: true,
    webhooks: webhookResults.map((r) =>
      r.status === "fulfilled" ? r.value : { success: false, error: "Failed" }
    ),
  });
}

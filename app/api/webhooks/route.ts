import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/webhooks?surveyId=xxx
export async function GET(request: NextRequest) {
  const surveyId = request.nextUrl.searchParams.get("surveyId");
  if (!surveyId) return NextResponse.json({ error: "surveyId required" }, { status: 400 });

  const webhooks = await prisma.webhook.findMany({
    where: { surveyId },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(
    webhooks.map((w) => ({
      ...w,
      createdAt: w.createdAt.toISOString(),
      updatedAt: w.updatedAt.toISOString(),
    }))
  );
}

// POST /api/webhooks
export async function POST(request: NextRequest) {
  const body = await request.json();
  const webhook = await prisma.webhook.create({
    data: {
      surveyId: body.surveyId,
      url: body.url || "",
      method: body.method || "POST",
      headers: body.headers || {},
      secret: body.secret || "",
      enabled: body.enabled ?? true,
      retryCount: body.retryCount ?? 3,
      retryInterval: body.retryInterval ?? 1000,
    },
  });

  return NextResponse.json({
    ...webhook,
    createdAt: webhook.createdAt.toISOString(),
    updatedAt: webhook.updatedAt.toISOString(),
  }, { status: 201 });
}

// PUT /api/webhooks (with id in body)
export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { id, ...data } = body;

  const updateData: Record<string, unknown> = {};
  if (data.url !== undefined) updateData.url = data.url;
  if (data.method !== undefined) updateData.method = data.method;
  if (data.headers !== undefined) updateData.headers = data.headers;
  if (data.secret !== undefined) updateData.secret = data.secret;
  if (data.enabled !== undefined) updateData.enabled = data.enabled;
  if (data.retryCount !== undefined) updateData.retryCount = data.retryCount;
  if (data.retryInterval !== undefined) updateData.retryInterval = data.retryInterval;

  const webhook = await prisma.webhook.update({ where: { id }, data: updateData });

  return NextResponse.json({
    ...webhook,
    createdAt: webhook.createdAt.toISOString(),
    updatedAt: webhook.updatedAt.toISOString(),
  });
}

// DELETE /api/webhooks?id=xxx
export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await prisma.webhook.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

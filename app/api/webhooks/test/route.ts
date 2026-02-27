import { NextRequest, NextResponse } from "next/server";
import { sendWebhook } from "@/lib/services/webhook-service";
import type { WebhookPayload } from "@/lib/types/survey";

// POST /api/webhooks/test - テスト送信
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { url, method, headers, secret } = body;

  const testPayload: WebhookPayload = {
    event: "response.completed",
    surveyId: "test-survey-id",
    respondent: {
      uid: "test-user-001",
      params: { uid: "test-user-001", source: "email" },
    },
    data: {
      "test-q1": "テスト回答1",
      "test-q2": ["選択肢A", "選択肢B"],
      "test-q3": 5,
    },
    metadata: {
      completedAt: new Date().toISOString(),
      duration: 120,
      pageHistory: ["page1", "page2"],
    },
  };

  const result = await sendWebhook(
    {
      url,
      method: method || "POST",
      headers: headers || {},
      secret: secret || "",
      retryCount: 0,
      retryInterval: 0,
    },
    testPayload
  );

  return NextResponse.json(result);
}

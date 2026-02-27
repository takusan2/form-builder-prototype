import type { WebhookPayload } from "@/lib/types/survey";

async function createHmacSignature(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

interface WebhookConfig {
  url: string;
  method: string;
  headers: Record<string, string>;
  secret: string;
  retryCount: number;
  retryInterval: number;
}

export async function sendWebhook(
  config: WebhookConfig,
  payload: WebhookPayload
): Promise<{ success: boolean; statusCode?: number; error?: string }> {
  const body = JSON.stringify(payload);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...config.headers,
  };

  if (config.secret) {
    headers["X-Webhook-Signature"] = await createHmacSignature(body, config.secret);
  }

  let lastError: string | undefined;

  for (let attempt = 0; attempt <= config.retryCount; attempt++) {
    try {
      if (attempt > 0) {
        // Exponential backoff
        const delay = config.retryInterval * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      const response = await fetch(config.url, {
        method: config.method || "POST",
        headers,
        body,
      });

      if (response.ok) {
        return { success: true, statusCode: response.status };
      }

      lastError = `HTTP ${response.status}: ${response.statusText}`;

      // Don't retry on client errors (4xx) except 429
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        return { success: false, statusCode: response.status, error: lastError };
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Unknown error";
    }
  }

  return { success: false, error: lastError };
}

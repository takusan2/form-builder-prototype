"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Webhook {
  id: string;
  surveyId: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  secret: string;
  enabled: boolean;
  retryCount: number;
  retryInterval: number;
}

export default function WebhooksPage() {
  const params = useParams();
  const surveyId = params.surveyId as string;
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingId, setTestingId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/webhooks?surveyId=${surveyId}`)
      .then((res) => res.json())
      .then((data) => {
        setWebhooks(data);
        setLoading(false);
      });
  }, [surveyId]);

  const addWebhook = async () => {
    const res = await fetch("/api/webhooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ surveyId }),
    });
    const webhook = await res.json();
    setWebhooks((prev) => [...prev, webhook]);
  };

  const updateWebhook = async (id: string, updates: Partial<Webhook>) => {
    setWebhooks((prev) =>
      prev.map((w) => (w.id === id ? { ...w, ...updates } : w))
    );
    await fetch("/api/webhooks", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...updates }),
    });
  };

  const deleteWebhook = async (id: string) => {
    await fetch(`/api/webhooks?id=${id}`, { method: "DELETE" });
    setWebhooks((prev) => prev.filter((w) => w.id !== id));
    toast.success("Webhookを削除しました");
  };

  const testWebhook = async (webhook: Webhook) => {
    if (!webhook.url) {
      toast.error("URLを入力してください");
      return;
    }
    setTestingId(webhook.id);
    try {
      const res = await fetch("/api/webhooks/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: webhook.url,
          method: webhook.method,
          headers: webhook.headers,
          secret: webhook.secret,
        }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success(`テスト送信成功 (${result.statusCode})`);
      } else {
        toast.error(`テスト送信失敗: ${result.error}`);
      }
    } catch {
      toast.error("テスト送信中にエラーが発生しました");
    }
    setTestingId(null);
  };

  if (loading) {
    return <div className="flex h-96 items-center justify-center text-muted-foreground">読み込み中...</div>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Webhook設定</h2>
          <p className="text-sm text-muted-foreground">
            回答データを外部サービスへ送信します
          </p>
        </div>
        <Button onClick={addWebhook} size="sm">
          <Plus className="mr-1 h-4 w-4" />
          追加
        </Button>
      </div>

      {webhooks.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Webhookが設定されていません
          </CardContent>
        </Card>
      )}

      {webhooks.map((webhook) => (
        <Card key={webhook.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">Webhook</CardTitle>
                <Badge variant={webhook.enabled ? "default" : "secondary"}>
                  {webhook.enabled ? "有効" : "無効"}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={webhook.enabled}
                  onCheckedChange={(v) => updateWebhook(webhook.id, { enabled: v })}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => deleteWebhook(webhook.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Select
                value={webhook.method}
                onValueChange={(v) => updateWebhook(webhook.id, { method: v })}
              >
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                </SelectContent>
              </Select>
              <Input
                value={webhook.url}
                onChange={(e) => updateWebhook(webhook.id, { url: e.target.value })}
                placeholder="https://example.com/webhook"
                className="flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => testWebhook(webhook)}
                disabled={testingId === webhook.id}
              >
                {testingId === webhook.id ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-1 h-4 w-4" />
                )}
                テスト
              </Button>
            </div>

            <div>
              <Label className="text-xs">シークレットキー（HMAC署名用）</Label>
              <Input
                value={webhook.secret}
                onChange={(e) => updateWebhook(webhook.id, { secret: e.target.value })}
                placeholder="任意の文字列"
                type="password"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">リトライ回数</Label>
                <Input
                  type="number"
                  value={webhook.retryCount}
                  onChange={(e) =>
                    updateWebhook(webhook.id, { retryCount: Number(e.target.value) })
                  }
                  min={0}
                  max={10}
                />
              </div>
              <div>
                <Label className="text-xs">リトライ間隔 (ms)</Label>
                <Input
                  type="number"
                  value={webhook.retryInterval}
                  onChange={(e) =>
                    updateWebhook(webhook.id, { retryInterval: Number(e.target.value) })
                  }
                  min={100}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

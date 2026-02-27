"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { Survey, SurveySettings } from "@/lib/types/survey";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Save, Copy, Check } from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const params = useParams();
  const surveyId = params.surveyId as string;
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [settings, setSettings] = useState<SurveySettings>({});
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`/api/surveys/${surveyId}`)
      .then((res) => res.json())
      .then((data: Survey) => {
        setSurvey(data);
        setSettings(data.settings);
        setTitle(data.title);
        setDescription(data.description);
      });
  }, [surveyId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/surveys/${surveyId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, settings }),
      });
      if (!res.ok) throw new Error();
      toast.success("設定を保存しました");
    } catch {
      toast.error("保存に失敗しました");
    }
    setSaving(false);
  };

  const handlePublish = async () => {
    const res = await fetch(`/api/surveys/${surveyId}/publish`, { method: "POST" });
    const data = await res.json();
    setSurvey(data);
    toast.success(data.status === "published" ? "公開しました" : "終了しました");
  };

  if (!survey) {
    return <div className="flex h-96 items-center justify-center text-muted-foreground">読み込み中...</div>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">一般設定</h2>
        <Button onClick={handleSave} disabled={saving} size="sm">
          <Save className="mr-2 h-4 w-4" />
          {saving ? "保存中..." : "保存"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">基本情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>タイトル</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label>説明</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">回答設定</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>プログレスバーを表示</Label>
            <Switch
              checked={settings.showProgressBar ?? true}
              onCheckedChange={(v) => setSettings({ ...settings, showProgressBar: v })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>前のページに戻ることを許可</Label>
            <Switch
              checked={settings.allowBack ?? true}
              onCheckedChange={(v) => setSettings({ ...settings, allowBack: v })}
            />
          </div>
          <div>
            <Label>完了メッセージ</Label>
            <Textarea
              value={settings.completionMessage || ""}
              onChange={(e) => setSettings({ ...settings, completionMessage: e.target.value })}
              rows={2}
            />
          </div>
          <div>
            <Label>対象外メッセージ</Label>
            <Textarea
              value={settings.disqualifyMessage || ""}
              onChange={(e) => setSettings({ ...settings, disqualifyMessage: e.target.value })}
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">公開ステータス</CardTitle>
          <CardDescription>
            現在のステータス: <Badge variant={survey.status === "published" ? "default" : "secondary"}>{survey.status === "draft" ? "下書き" : survey.status === "published" ? "公開中" : "終了"}</Badge>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handlePublish}
            variant={survey.status === "published" ? "destructive" : "default"}
          >
            {survey.status === "published" ? "終了する" : "公開する"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">回答URL</CardTitle>
          <CardDescription>
            この URL を回答者に配布してください
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {typeof window !== "undefined" && (
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={`${window.location.origin}/s/${survey.id}`}
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                className="shrink-0"
                onClick={() => {
                  navigator.clipboard.writeText(
                    `${window.location.origin}/s/${survey.id}`
                  );
                  setCopied(true);
                  toast.success("コピーしました");
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          )}

          <div className="rounded-md border bg-muted/50 p-4">
            <p className="mb-2 text-sm font-medium">URLパラメータ</p>
            <p className="mb-3 text-xs text-muted-foreground">
              クエリパラメータを付与すると、Webhookペイロードの <code className="rounded bg-muted px-1">respondent</code> に含まれます。
            </p>
            <div className="space-y-2 text-xs">
              <div className="flex items-start gap-2">
                <code className="shrink-0 rounded bg-muted px-1.5 py-0.5">uid</code>
                <span className="text-muted-foreground">
                  ユーザーID。<code className="rounded bg-muted px-1">respondent.uid</code> として取得可能
                </span>
              </div>
              <div className="flex items-start gap-2">
                <code className="shrink-0 rounded bg-muted px-1.5 py-0.5">任意のキー</code>
                <span className="text-muted-foreground">
                  全て <code className="rounded bg-muted px-1">respondent.params</code> に格納
                </span>
              </div>
            </div>
            <div className="mt-3 rounded-md bg-background p-3">
              <p className="mb-1 text-xs text-muted-foreground">例:</p>
              <code className="break-all text-xs">
                {typeof window !== "undefined"
                  ? `${window.location.origin}/s/${survey.id}?uid=user123&source=email`
                  : ""}
              </code>
            </div>
            <div className="mt-3 rounded-md bg-background p-3">
              <p className="mb-1 text-xs text-muted-foreground">Webhookペイロード:</p>
              <pre className="text-xs text-muted-foreground">{`{
  "event": "response.completed",
  "surveyId": "${survey.id}",
  "respondent": {
    "uid": "user123",
    "params": { "uid": "user123", "source": "email" }
  },
  "data": { ... },
  "metadata": { ... }
}`}</pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

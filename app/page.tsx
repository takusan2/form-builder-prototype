"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Survey } from "@/lib/types/survey";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Trash2 } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  draft: "下書き",
  published: "公開中",
  closed: "終了",
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "secondary",
  published: "default",
  closed: "outline",
};

export default function DashboardPage() {
  const router = useRouter();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/surveys")
      .then((res) => res.json())
      .then((data) => {
        setSurveys(data);
        setLoading(false);
      });
  }, []);

  const createSurvey = async () => {
    const res = await fetch("/api/surveys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "無題のアンケート" }),
    });
    const survey = await res.json();
    router.push(`/surveys/${survey.id}/edit`);
  };

  const deleteSurvey = async (id: string) => {
    await fetch(`/api/surveys/${id}`, { method: "DELETE" });
    setSurveys((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <h1 className="text-xl font-bold">Survey Builder</h1>
          <Button onClick={createSurvey}>
            <Plus className="mr-2 h-4 w-4" />
            新規作成
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">
        {loading ? (
          <div className="py-20 text-center text-muted-foreground">読み込み中...</div>
        ) : surveys.length === 0 ? (
          <div className="py-20 text-center">
            <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="mb-4 text-muted-foreground">アンケートがまだありません</p>
            <Button onClick={createSurvey}>
              <Plus className="mr-2 h-4 w-4" />
              最初のアンケートを作成
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {surveys.map((survey) => (
              <Card
                key={survey.id}
                className="cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => router.push(`/surveys/${survey.id}/edit`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{survey.title}</CardTitle>
                    <Badge variant={STATUS_VARIANTS[survey.status]}>
                      {STATUS_LABELS[survey.status]}
                    </Badge>
                  </div>
                  <CardDescription className="line-clamp-2">
                    {survey.description || "説明なし"}
                  </CardDescription>
                </CardHeader>
                <CardFooter className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {survey.structure.pages.length}ページ /{" "}
                    {survey.structure.pages.reduce((a, p) => a + p.questions.length, 0)}問
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSurvey(survey.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

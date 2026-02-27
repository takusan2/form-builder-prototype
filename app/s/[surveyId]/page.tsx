"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import type { Survey, ResponseData } from "@/lib/types/survey";
import { SurveyRenderer } from "@/components/preview/SurveyRenderer";

export default function PublicSurveyPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const surveyId = params.surveyId as string;
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const startTime = useRef(Date.now());
  const pageHistory = useRef<string[]>([]);

  // URLクエリパラメータを全て取得
  const urlParams = useRef<Record<string, string>>({});
  useEffect(() => {
    const p: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      p[key] = value;
    });
    urlParams.current = p;
  }, [searchParams]);

  useEffect(() => {
    fetch(`/api/surveys/${surveyId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then((data: Survey) => {
        if (data.status !== "published") {
          setError("このアンケートは現在公開されていません");
          return;
        }
        setSurvey(data);
        pageHistory.current = [data.structure.pages[0]?.id || ""];
      })
      .catch(() => setError("アンケートが見つかりません"));
  }, [surveyId]);

  const handleComplete = async (data: ResponseData) => {
    const duration = Math.round((Date.now() - startTime.current) / 1000);
    try {
      const res = await fetch(`/api/surveys/${surveyId}/responses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data,
          respondent: {
            uid: urlParams.current.uid || undefined,
            params: urlParams.current,
          },
          metadata: {
            completedAt: new Date().toISOString(),
            duration,
            pageHistory: pageHistory.current,
          },
        }),
      });
      const result = await res.json();
      if (result.disqualified) {
        router.push(`/s/${surveyId}/disqualified`);
        return;
      }
      if (result.closed) {
        setError("このアンケートは受付を終了しました");
        return;
      }
    } catch {
      // Webhook配信失敗等でもユーザーには完了を表示
    }
    router.push(`/s/${surveyId}/complete`);
  };

  const handleDisqualify = () => {
    router.push(`/s/${surveyId}/disqualified`);
  };

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="mx-auto mb-6 max-w-2xl">
        <h1 className="text-2xl font-bold">{survey.title}</h1>
        {survey.description && (
          <p className="mt-2 text-muted-foreground">{survey.description}</p>
        )}
      </div>
      <SurveyRenderer
        survey={survey}
        onComplete={handleComplete}
        onDisqualify={handleDisqualify}
      />
    </div>
  );
}

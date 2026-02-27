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
  const getUrlParams = () => {
    const p: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      p[key] = value;
    });
    return p;
  };
  const urlParams = useRef<Record<string, string>>(getUrlParams());

  useEffect(() => {
    urlParams.current = getUrlParams();
  }, [searchParams]);

  useEffect(() => {
    fetch(`/api/surveys/${surveyId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then(async (data: Survey) => {
        if (data.status !== "published") {
          setError("このアンケートは現在公開されていません");
          return;
        }
        const currentParams = urlParams.current;
        // 必須パラメータチェック
        const required = data.settings.respondent?.requiredParams || [];
        const missing = required.filter((p) => p && !currentParams[p]);
        if (missing.length > 0) {
          setError(`必須パラメータが不足しています: ${missing.join(", ")}`);
          return;
        }
        // 重複回答プリチェック
        const respondentSettings = data.settings.respondent;
        if (respondentSettings?.preventDuplicate && respondentSettings.identifierParam) {
          const uid = currentParams[respondentSettings.identifierParam];
          if (uid) {
            try {
              const checkRes = await fetch(
                `/api/surveys/${surveyId}/responses/check-duplicate?uid=${encodeURIComponent(uid)}`
              );
              const checkData = await checkRes.json();
              if (checkData.exists) {
                setError("この回答者は既に回答済みです");
                return;
              }
            } catch { /* チェック失敗時はそのまま進む */ }
          }
        }
        setSurvey(data);
        pageHistory.current = [data.structure.pages[0]?.id || ""];
      })
      .catch(() => setError("アンケートが見つかりません"));
  }, [surveyId]);

  const handleComplete = async (data: ResponseData) => {
    const duration = Math.round((Date.now() - startTime.current) / 1000);
    // 識別パラメータからuidを解決
    const idParam = survey?.settings.respondent?.identifierParam;
    const resolvedUid = idParam ? urlParams.current[idParam] : urlParams.current.uid;
    try {
      const res = await fetch(`/api/surveys/${surveyId}/responses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data,
          respondent: {
            uid: resolvedUid || undefined,
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
      if (result.error === "duplicate") {
        setError("この回答者は既に回答済みです");
        return;
      }
      if (result.disqualified) {
        if (result.redirectUrl) {
          window.location.href = result.redirectUrl;
        } else {
          router.push(`/s/${surveyId}/disqualified`);
        }
        return;
      }
      if (result.closed) {
        if (result.redirectUrl) {
          window.location.href = result.redirectUrl;
        } else {
          setError("このアンケートは受付を終了しました");
        }
        return;
      }
      if (result.redirectUrl) {
        window.location.href = result.redirectUrl;
        return;
      }
    } catch {
      // Webhook配信失敗等でもユーザーには完了を表示
    }
    router.push(`/s/${surveyId}/complete`);
  };

  const handleDisqualify = () => {
    const redirect = survey?.settings.redirect;
    if (redirect?.disqualifyUrl) {
      let url = redirect.disqualifyUrl;
      if (redirect.passParams && Object.keys(urlParams.current).length > 0) {
        try {
          const u = new URL(url);
          for (const [k, v] of Object.entries(urlParams.current)) {
            u.searchParams.set(k, v);
          }
          url = u.toString();
        } catch { /* use as-is */ }
      }
      window.location.href = url;
      return;
    }
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

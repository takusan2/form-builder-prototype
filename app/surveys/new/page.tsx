"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function NewSurveyPage() {
  const router = useRouter();

  useEffect(() => {
    fetch("/api/surveys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "無題のアンケート" }),
    })
      .then((res) => res.json())
      .then((survey) => router.replace(`/surveys/${survey.id}/edit`));
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground">作成中...</p>
    </div>
  );
}

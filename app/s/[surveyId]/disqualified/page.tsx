"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import type { Survey } from "@/lib/types/survey";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { XCircle } from "lucide-react";

export default function DisqualifiedPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const surveyId = params.surveyId as string;
  const [message, setMessage] = useState(
    "申し訳ございませんが、今回の調査対象外となりました。"
  );

  useEffect(() => {
    fetch(`/api/surveys/${surveyId}`)
      .then((res) => res.json())
      .then((data: Survey) => {
        const redirect = data.settings.redirect;
        if (redirect?.disqualifyUrl) {
          let url = redirect.disqualifyUrl;
          if (redirect.passParams) {
            try {
              const u = new URL(url);
              searchParams.forEach((v, k) => u.searchParams.set(k, v));
              url = u.toString();
            } catch { /* use as-is */ }
          }
          window.location.href = url;
          return;
        }
        if (data.settings.disqualifyMessage) {
          setMessage(data.settings.disqualifyMessage);
        }
      })
      .catch(() => {});
  }, [surveyId, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="max-w-md">
        <CardHeader className="text-center">
          <XCircle className="mx-auto mb-2 h-12 w-12 text-muted-foreground" />
          <CardTitle>調査対象外</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground">{message}</p>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { Survey } from "@/lib/types/survey";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";

export default function CompletePage() {
  const params = useParams();
  const surveyId = params.surveyId as string;
  const [message, setMessage] = useState("ご回答ありがとうございました。");

  useEffect(() => {
    fetch(`/api/surveys/${surveyId}`)
      .then((res) => res.json())
      .then((data: Survey) => {
        if (data.settings.completionMessage) {
          setMessage(data.settings.completionMessage);
        }
      })
      .catch(() => {});
  }, [surveyId]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="max-w-md">
        <CardHeader className="text-center">
          <CheckCircle2 className="mx-auto mb-2 h-12 w-12 text-green-500" />
          <CardTitle>回答完了</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground">{message}</p>
        </CardContent>
      </Card>
    </div>
  );
}

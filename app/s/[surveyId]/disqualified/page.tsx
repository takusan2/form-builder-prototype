"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { Survey } from "@/lib/types/survey";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { XCircle } from "lucide-react";

export default function DisqualifiedPage() {
  const params = useParams();
  const surveyId = params.surveyId as string;
  const [message, setMessage] = useState(
    "申し訳ございませんが、今回の調査対象外となりました。"
  );

  useEffect(() => {
    fetch(`/api/surveys/${surveyId}`)
      .then((res) => res.json())
      .then((data: Survey) => {
        if (data.settings.disqualifyMessage) {
          setMessage(data.settings.disqualifyMessage);
        }
      })
      .catch(() => {});
  }, [surveyId]);

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

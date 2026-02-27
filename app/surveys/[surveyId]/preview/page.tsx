"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { Survey, ResponseData } from "@/lib/types/survey";
import { SurveyRenderer } from "@/components/preview/SurveyRenderer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RotateCcw, Eye } from "lucide-react";

export default function PreviewPage() {
  const params = useParams();
  const surveyId = params.surveyId as string;
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [completed, setCompleted] = useState(false);
  const [disqualified, setDisqualified] = useState(false);
  const [responseData, setResponseData] = useState<ResponseData | null>(null);

  useEffect(() => {
    fetch(`/api/surveys/${surveyId}`)
      .then((res) => res.json())
      .then(setSurvey);
  }, [surveyId]);

  const handleReset = () => {
    setCompleted(false);
    setDisqualified(false);
    setResponseData(null);
  };

  if (!survey) {
    return <div className="flex h-96 items-center justify-center text-muted-foreground">読み込み中...</div>;
  }

  if (completed) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 p-6">
        <Card>
          <CardHeader>
            <CardTitle>回答完了（プレビュー）</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>{survey.settings.completionMessage || "ご回答ありがとうございました。"}</p>
            {responseData && (
              <div>
                <h3 className="mb-2 text-sm font-medium">回答データ:</h3>
                <pre className="overflow-auto rounded-md bg-muted p-4 text-xs">
                  {JSON.stringify(responseData, null, 2)}
                </pre>
              </div>
            )}
            <Button onClick={handleReset} variant="outline">
              <RotateCcw className="mr-2 h-4 w-4" />
              最初からやり直す
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (disqualified) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 p-6">
        <Card>
          <CardHeader>
            <CardTitle>対象外（プレビュー）</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>{survey.settings.disqualifyMessage || "申し訳ございませんが、今回の調査対象外となりました。"}</p>
            <Button onClick={handleReset} variant="outline">
              <RotateCcw className="mr-2 h-4 w-4" />
              最初からやり直す
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mx-auto mb-4 flex max-w-2xl items-center gap-2">
        <Eye className="h-4 w-4 text-muted-foreground" />
        <Badge variant="secondary">プレビューモード</Badge>
      </div>
      <SurveyRenderer
        survey={survey}
        isPreview
        onComplete={(data) => {
          setResponseData(data);
          setCompleted(true);
        }}
        onDisqualify={() => setDisqualified(true)}
      />
    </div>
  );
}

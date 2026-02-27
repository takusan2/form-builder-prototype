"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useSurveyBuilderStore } from "@/lib/store/survey-builder-store";
import { SurveyBuilder } from "@/components/builder/SurveyBuilder";

export default function EditPage() {
  const params = useParams();
  const surveyId = params.surveyId as string;
  const { survey, setSurvey } = useSurveyBuilderStore();

  useEffect(() => {
    fetch(`/api/surveys/${surveyId}`)
      .then((res) => res.json())
      .then((data) => {
        const { responseCount, ...surveyData } = data;
        setSurvey(surveyData, responseCount);
      });
  }, [surveyId, setSurvey]);

  if (!survey) {
    return <div className="flex h-96 items-center justify-center text-muted-foreground">読み込み中...</div>;
  }

  return <SurveyBuilder />;
}

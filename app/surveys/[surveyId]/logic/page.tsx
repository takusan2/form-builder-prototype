"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useSurveyBuilderStore } from "@/lib/store/survey-builder-store";
import { BranchingEditor } from "@/components/logic/BranchingEditor";

export default function LogicPage() {
  const params = useParams();
  const surveyId = params.surveyId as string;
  const { survey, setSurvey } = useSurveyBuilderStore();

  useEffect(() => {
    if (!survey || survey.id !== surveyId) {
      fetch(`/api/surveys/${surveyId}`)
        .then((res) => res.json())
        .then((data) => {
          const { responseCount, ...surveyData } = data;
          setSurvey(surveyData, responseCount);
        });
    }
  }, [surveyId, survey, setSurvey]);

  if (!survey) {
    return <div className="flex h-96 items-center justify-center text-muted-foreground">読み込み中...</div>;
  }

  return <BranchingEditor />;
}

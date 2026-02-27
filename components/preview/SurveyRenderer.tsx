"use client";

import { useState, useCallback, useRef } from "react";
import type { Survey, ResponseData, AnswerValue, SurveyPage } from "@/lib/types/survey";
import { PageRenderer } from "./PageRenderer";
import { ProgressBar } from "./ProgressBar";
import { NavigationButtons } from "./NavigationButtons";
import { validatePage } from "@/lib/engine/validation-engine";
import { determineNextPage, getVisibleQuestions } from "@/lib/engine/branching-engine";
import { resolveCarryForward } from "@/lib/engine/carry-forward";
import type { ValidationError } from "@/lib/engine/validation-engine";

interface SurveyRendererProps {
  survey: Survey;
  isPreview?: boolean;
  onComplete?: (data: ResponseData) => void | Promise<void>;
  onDisqualify?: () => void;
}

export function SurveyRenderer({ survey, isPreview, onComplete, onDisqualify }: SurveyRendererProps) {
  const { pages } = survey.structure;
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [answers, setAnswers] = useState<ResponseData>({});
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [pageHistory, setPageHistory] = useState<number[]>([0]);
  const [submitting, setSubmitting] = useState(false);
  const startTime = useRef(Date.now());

  const currentPage = pages[currentPageIndex];
  const allQuestions = pages.flatMap((p) => p.questions);
  const visibleQuestions = getVisibleQuestions(currentPage.questions, answers);

  const handleAnswer = useCallback((questionId: string, value: AnswerValue) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    setErrors((prev) => prev.filter((e) => e.questionId !== questionId));
  }, []);

  const handleNext = useCallback(async () => {
    if (submitting) return;

    // Validate current page (キャリーフォワード解決済みの設問でバリデーション)
    const resolvedQuestions = visibleQuestions.map((q) =>
      resolveCarryForward(q, allQuestions, answers)
    );
    const pageErrors = validatePage(resolvedQuestions, answers);
    if (pageErrors.length > 0) {
      setErrors(pageErrors);
      return;
    }

    // Determine next page
    const result = determineNextPage(currentPage, pages, answers);

    switch (result.type) {
      case "go_to_page": {
        const targetIndex = pages.findIndex((p) => p.id === result.pageId);
        if (targetIndex !== -1) {
          setCurrentPageIndex(targetIndex);
          setPageHistory((prev) => [...prev, targetIndex]);
        }
        break;
      }
      case "next": {
        const nextIndex = currentPageIndex + 1;
        if (nextIndex < pages.length) {
          setCurrentPageIndex(nextIndex);
          setPageHistory((prev) => [...prev, nextIndex]);
        } else {
          await handleComplete();
        }
        break;
      }
      case "skip_to_end":
        await handleComplete();
        break;
      case "disqualify":
        onDisqualify?.();
        break;
    }

    setErrors([]);
  }, [submitting, visibleQuestions, allQuestions, answers, currentPage, pages, currentPageIndex, onDisqualify]);

  const handleBack = useCallback(() => {
    if (!survey.settings.allowBack) return;
    if (pageHistory.length > 1) {
      const newHistory = [...pageHistory];
      newHistory.pop();
      const prevIndex = newHistory[newHistory.length - 1];
      setCurrentPageIndex(prevIndex);
      setPageHistory(newHistory);
      setErrors([]);
    }
  }, [pageHistory, survey.settings.allowBack]);

  const handleComplete = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await onComplete?.(answers);
    } catch {
      setSubmitting(false);
    }
  }, [submitting, answers, onComplete]);

  const isFirstPage = pageHistory.length <= 1;
  const isLastPage = currentPageIndex === pages.length - 1 && !currentPage.branchingRules?.length;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {survey.settings.showProgressBar && (
        <ProgressBar current={currentPageIndex + 1} total={pages.length} />
      )}
      <PageRenderer
        page={currentPage}
        questions={visibleQuestions}
        allQuestions={allQuestions}
        answers={answers}
        errors={errors}
        onAnswer={handleAnswer}
      />
      <NavigationButtons
        onBack={handleBack}
        onNext={handleNext}
        showBack={survey.settings.allowBack !== false && !isFirstPage}
        isLastPage={isLastPage}
        isPreview={isPreview}
        submitting={submitting}
      />
    </div>
  );
}

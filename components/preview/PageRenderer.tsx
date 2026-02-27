"use client";

import type { SurveyPage, Question, AnswerValue, ResponseData } from "@/lib/types/survey";
import type { ValidationError } from "@/lib/engine/validation-engine";
import { resolveCarryForward } from "@/lib/engine/carry-forward";
import { QuestionRenderer } from "./QuestionRenderer";

interface PageRendererProps {
  page: SurveyPage;
  questions: Question[];
  allQuestions: Question[];
  answers: ResponseData;
  errors: ValidationError[];
  onAnswer: (questionId: string, value: AnswerValue) => void;
}

export function PageRenderer({ page, questions, allQuestions, answers, errors, onAnswer }: PageRendererProps) {
  return (
    <div className="space-y-6">
      {page.title && (
        <div>
          <h2 className="text-xl font-semibold">{page.title}</h2>
          {page.description && (
            <p className="mt-1 text-sm text-muted-foreground">{page.description}</p>
          )}
        </div>
      )}
      {questions.map((question, index) => {
        const resolved = resolveCarryForward(question, allQuestions, answers);
        const error = errors.find((e) => e.questionId === question.id);
        return (
          <QuestionRenderer
            key={question.id}
            question={resolved}
            index={index}
            value={answers[question.id]}
            error={error?.message}
            onChange={(value) => onAnswer(question.id, value)}
          />
        );
      })}
    </div>
  );
}

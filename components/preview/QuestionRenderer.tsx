"use client";

import type { Question, AnswerValue } from "@/lib/types/survey";
import { Badge } from "@/components/ui/badge";
import { SingleChoiceQuestion } from "./questions/SingleChoiceQuestion";
import { MultipleChoiceQuestion } from "./questions/MultipleChoiceQuestion";
import { OpenTextQuestion } from "./questions/OpenTextQuestion";
import { NumberInputQuestion } from "./questions/NumberInputQuestion";
import { RatingScaleQuestion } from "./questions/RatingScaleQuestion";
import { MatrixQuestion } from "./questions/MatrixQuestion";
import { RankingQuestion } from "./questions/RankingQuestion";

interface QuestionRendererProps {
  question: Question;
  index: number;
  value: AnswerValue | undefined;
  error?: string;
  onChange: (value: AnswerValue) => void;
}

export function QuestionRenderer({ question, index, value, error, onChange }: QuestionRendererProps) {
  const renderQuestion = () => {
    switch (question.type) {
      case "single_choice":
        return <SingleChoiceQuestion question={question} value={value as string | undefined} onChange={onChange} />;
      case "multiple_choice":
        return <MultipleChoiceQuestion question={question} value={(value as string[]) || []} onChange={onChange} />;
      case "open_text":
        return <OpenTextQuestion question={question} value={(value as string) || ""} onChange={onChange} />;
      case "number_input":
        return <NumberInputQuestion question={question} value={value as number | undefined} onChange={onChange} />;
      case "rating_scale":
        return <RatingScaleQuestion question={question} value={value as number | undefined} onChange={onChange} />;
      case "matrix_single":
      case "matrix_multiple":
        return (
          <MatrixQuestion
            question={question}
            value={(value as Record<string, string>) || {}}
            onChange={onChange}
          />
        );
      case "ranking":
        return <RankingQuestion question={question} value={(value as string[]) || []} onChange={onChange} />;
      default:
        return <div className="text-muted-foreground">未対応の設問タイプ</div>;
    }
  };

  return (
    <div className={`space-y-3 border-b pb-6 ${error ? "border-destructive" : "border-border"}`}>
      <div className="flex items-start gap-2">
        <p className="text-base font-medium leading-relaxed">
          <span className="mr-1 text-muted-foreground">Q{index + 1}.</span>
          {question.text}
        </p>
        {question.required && (
          <Badge variant="destructive" className="shrink-0 text-xs">
            必須
          </Badge>
        )}
      </div>
      {question.description && (
        <p className="text-sm text-muted-foreground">{question.description}</p>
      )}
      {renderQuestion()}
      {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
    </div>
  );
}

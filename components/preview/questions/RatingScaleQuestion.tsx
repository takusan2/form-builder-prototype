"use client";

import type { Question } from "@/lib/types/survey";
import { cn } from "@/lib/utils";

interface Props {
  question: Question;
  value: number | undefined;
  onChange: (value: number) => void;
}

export function RatingScaleQuestion({ question, value, onChange }: Props) {
  const min = question.ratingMin ?? 1;
  const max = question.ratingMax ?? 5;
  const values = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {question.ratingMinLabel && (
          <span className="text-sm text-muted-foreground">{question.ratingMinLabel}</span>
        )}
        <div className="flex gap-1">
          {values.map((v) => (
            <button
              key={v}
              type="button"
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full border text-sm transition-colors",
                value === v
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input hover:bg-muted"
              )}
              onClick={() => onChange(v)}
            >
              {v}
            </button>
          ))}
        </div>
        {question.ratingMaxLabel && (
          <span className="text-sm text-muted-foreground">{question.ratingMaxLabel}</span>
        )}
      </div>
    </div>
  );
}

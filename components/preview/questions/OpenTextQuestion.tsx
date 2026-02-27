"use client";

import type { Question } from "@/lib/types/survey";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  question: Question;
  value: string;
  onChange: (value: string) => void;
}

export function OpenTextQuestion({ question, value, onChange }: Props) {
  const maxLength = question.validation?.maxLength;

  return (
    <div className="space-y-1">
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="回答を入力してください"
        rows={4}
        maxLength={maxLength}
      />
      {maxLength && (
        <p className="text-right text-xs text-muted-foreground">
          {value.length} / {maxLength}
        </p>
      )}
    </div>
  );
}

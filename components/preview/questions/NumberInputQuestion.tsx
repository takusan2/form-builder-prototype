"use client";

import type { Question } from "@/lib/types/survey";
import { Input } from "@/components/ui/input";

interface Props {
  question: Question;
  value: number | undefined;
  onChange: (value: number) => void;
}

export function NumberInputQuestion({ question, value, onChange }: Props) {
  return (
    <Input
      type="number"
      value={value ?? ""}
      onChange={(e) => onChange(Number(e.target.value))}
      min={question.validation?.minValue}
      max={question.validation?.maxValue}
      placeholder="数値を入力してください"
      className="max-w-xs"
    />
  );
}

"use client";

import type { Question } from "@/lib/types/survey";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface Props {
  question: Question;
  value: string | undefined;
  onChange: (value: string) => void;
}

export function SingleChoiceQuestion({ question, value, onChange }: Props) {
  if (!question.choices) return null;

  return (
    <RadioGroup value={value || ""} onValueChange={onChange}>
      {question.choices.map((choice) => (
        <div key={choice.id} className="flex items-center space-x-2">
          <RadioGroupItem value={choice.value} id={`${question.id}-${choice.id}`} />
          <Label htmlFor={`${question.id}-${choice.id}`} className="cursor-pointer font-normal">
            {choice.text}
          </Label>
        </div>
      ))}
    </RadioGroup>
  );
}

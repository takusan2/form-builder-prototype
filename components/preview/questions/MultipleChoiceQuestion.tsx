"use client";

import type { Question } from "@/lib/types/survey";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface Props {
  question: Question;
  value: string[];
  onChange: (value: string[]) => void;
}

export function MultipleChoiceQuestion({ question, value, onChange }: Props) {
  if (!question.choices) return null;

  const handleChange = (choiceValue: string, checked: boolean) => {
    const choice = question.choices?.find((c) => c.value === choiceValue);
    if (choice?.isExclusive && checked) {
      onChange([choiceValue]);
      return;
    }

    if (checked) {
      // Remove exclusive choices when selecting non-exclusive
      const exclusiveValues = question.choices
        ?.filter((c) => c.isExclusive)
        .map((c) => c.value) || [];
      const filtered = value.filter((v) => !exclusiveValues.includes(v));
      onChange([...filtered, choiceValue]);
    } else {
      onChange(value.filter((v) => v !== choiceValue));
    }
  };

  return (
    <div className="space-y-2">
      {question.choices.map((choice) => (
        <div key={choice.id} className="flex items-center space-x-2">
          <Checkbox
            id={`${question.id}-${choice.id}`}
            checked={value.includes(choice.value)}
            onCheckedChange={(checked) => handleChange(choice.value, checked === true)}
          />
          <Label htmlFor={`${question.id}-${choice.id}`} className="cursor-pointer font-normal">
            {choice.text}
          </Label>
        </div>
      ))}
    </div>
  );
}

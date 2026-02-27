"use client";

import { useState, useEffect } from "react";
import type { Question } from "@/lib/types/survey";
import { GripVertical, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  question: Question;
  value: string[];
  onChange: (value: string[]) => void;
}

export function RankingQuestion({ question, value, onChange }: Props) {
  const choices = question.choices || [];
  const [items, setItems] = useState<string[]>([]);

  useEffect(() => {
    if (value.length > 0) {
      setItems(value);
    } else {
      setItems(choices.map((c) => c.value));
    }
  }, []);

  const moveItem = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= items.length) return;
    const newItems = [...items];
    const [moved] = newItems.splice(fromIndex, 1);
    newItems.splice(toIndex, 0, moved);
    setItems(newItems);
    onChange(newItems);
  };

  const getChoiceText = (val: string) =>
    choices.find((c) => c.value === val)?.text || val;

  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">上下ボタンで順位を変更してください</p>
      {items.map((item, index) => (
        <div
          key={item}
          className="flex items-center gap-2 rounded-md border bg-background px-3 py-2"
        >
          <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
            {index + 1}
          </span>
          <span className="flex-1 text-sm">{getChoiceText(item)}</span>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => moveItem(index, index - 1)}
              disabled={index === 0}
            >
              <ArrowUp className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => moveItem(index, index + 1)}
              disabled={index === items.length - 1}
            >
              <ArrowDown className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

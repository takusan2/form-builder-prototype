"use client";

import type { ConditionGroup, Condition, Question, ConditionOperator } from "@/lib/types/survey";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { nanoid } from "nanoid";

const OPERATOR_LABELS: Record<ConditionOperator, string> = {
  equals: "次と等しい",
  not_equals: "次と等しくない",
  contains: "次を含む",
  not_contains: "次を含まない",
  greater_than: "より大きい",
  less_than: "より小さい",
  greater_equal: "以上",
  less_equal: "以下",
  is_answered: "回答済み",
  is_not_answered: "未回答",
};

interface QuestionInfo extends Question {
  pageId: string;
  pageTitle: string;
}

interface ConditionBuilderProps {
  conditionGroup: ConditionGroup;
  questions: QuestionInfo[];
  onChange: (group: ConditionGroup) => void;
  disabled?: boolean;
}

export function ConditionBuilder({
  conditionGroup,
  questions,
  onChange,
  disabled,
}: ConditionBuilderProps) {
  const updateCondition = (index: number, updates: Partial<Condition>) => {
    const newConditions = [...conditionGroup.conditions];
    newConditions[index] = { ...newConditions[index], ...updates };
    onChange({ ...conditionGroup, conditions: newConditions });
  };

  const addCondition = () => {
    onChange({
      ...conditionGroup,
      conditions: [
        ...conditionGroup.conditions,
        { id: nanoid(8), questionId: "", operator: "equals", value: "" },
      ],
    });
  };

  const removeCondition = (index: number) => {
    if (conditionGroup.conditions.length <= 1) return;
    const newConditions = conditionGroup.conditions.filter((_, i) => i !== index);
    onChange({ ...conditionGroup, conditions: newConditions });
  };

  const toggleConnector = () => {
    onChange({
      ...conditionGroup,
      connector: conditionGroup.connector === "and" ? "or" : "and",
    });
  };

  return (
    <div className="space-y-2">
      {conditionGroup.conditions.map((condition, index) => {
        const selectedQuestion = questions.find((q) => q.id === condition.questionId);
        const needsValue = !["is_answered", "is_not_answered"].includes(condition.operator);
        const hasChoices =
          selectedQuestion &&
          (selectedQuestion.type === "single_choice" ||
            selectedQuestion.type === "multiple_choice");

        return (
          <div key={condition.id}>
            {index > 0 && (
              <div className="my-1 flex justify-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={toggleConnector}
                  disabled={disabled}
                >
                  {conditionGroup.connector === "and" ? "AND" : "OR"}
                </Button>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              {/* Question selector */}
              <Select
                value={condition.questionId}
                onValueChange={(v) => updateCondition(index, { questionId: v, value: "" })}
                disabled={disabled}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="設問を選択" />
                </SelectTrigger>
                <SelectContent>
                  {questions.map((q) => (
                    <SelectItem key={q.id} value={q.id}>
                      {q.pageTitle} - {q.text || "（無題）"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Operator selector */}
              <Select
                value={condition.operator}
                onValueChange={(v) =>
                  updateCondition(index, { operator: v as ConditionOperator })
                }
                disabled={disabled}
              >
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(OPERATOR_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Value input */}
              {needsValue && (
                hasChoices ? (
                  <Select
                    value={String(condition.value)}
                    onValueChange={(v) => updateCondition(index, { value: v })}
                    disabled={disabled}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="値を選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedQuestion.choices?.map((c) => (
                        <SelectItem key={c.id} value={c.value}>
                          {c.text}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={String(condition.value)}
                    onChange={(e) => updateCondition(index, { value: e.target.value })}
                    placeholder="値"
                    className="w-32"
                    disabled={disabled}
                  />
                )
              )}

              {conditionGroup.conditions.length > 1 && !disabled && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => removeCondition(index)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        );
      })}

      {!disabled && (
        <Button variant="ghost" size="sm" className="mt-1" onClick={addCondition}>
          <Plus className="mr-1 h-3 w-3" />
          条件を追加
        </Button>
      )}
    </div>
  );
}

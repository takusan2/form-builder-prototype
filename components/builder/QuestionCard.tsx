"use client";

import { useSurveyBuilderStore } from "@/lib/store/survey-builder-store";
import type { Question } from "@/lib/types/survey";
import { QUESTION_TYPE_LABELS } from "@/lib/types/survey";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Trash2, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChoiceEditor } from "./ChoiceEditor";
import { MatrixEditor } from "./MatrixEditor";
import { RatingEditor } from "./RatingEditor";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface QuestionCardProps {
  question: Question;
  pageId: string;
  index: number;
}

export function QuestionCard({ question, pageId, index }: QuestionCardProps) {
  const { activeQuestionId, setActiveQuestionId, updateQuestion, removeQuestion, isStructureLocked } =
    useSurveyBuilderStore();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id, disabled: isStructureLocked });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isActive = activeQuestionId === question.id;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        "cursor-pointer transition-shadow",
        isActive && "ring-2 ring-primary",
        isDragging && "z-50 shadow-lg"
      )}
      onClick={() => setActiveQuestionId(question.id)}
    >
      <CardHeader className="flex flex-row items-start gap-3 space-y-0 pb-3">
        <GripVertical
          className="mt-1 h-4 w-4 shrink-0 cursor-grab text-muted-foreground"
          {...attributes}
          {...listeners}
        />
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              Q{index + 1}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {QUESTION_TYPE_LABELS[question.type]}
            </Badge>
          </div>
          {isActive ? (
            <Input
              value={question.text}
              onChange={(e) =>
                updateQuestion(pageId, question.id, { text: e.target.value })
              }
              placeholder="設問文を入力"
              className="text-base font-medium"
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
          ) : (
            <p className="text-base font-medium">
              {question.text || (
                <span className="text-muted-foreground">設問文を入力</span>
              )}
            </p>
          )}
        </div>
        {!isStructureLocked && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              removeQuestion(pageId, question.id);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      {isActive && (
        <CardContent className="space-y-4 pt-0" onClick={(e) => e.stopPropagation()}>
          <Textarea
            value={question.description || ""}
            onChange={(e) =>
              updateQuestion(pageId, question.id, { description: e.target.value })
            }
            placeholder="補足説明（任意）"
            className="resize-none"
            rows={2}
          />

          {/* 設問タイプ別エディタ */}
          {(question.type === "single_choice" || question.type === "multiple_choice") && (
            <ChoiceEditor question={question} pageId={pageId} locked={isStructureLocked} />
          )}
          {(question.type === "matrix_single" || question.type === "matrix_multiple") && (
            <MatrixEditor question={question} pageId={pageId} locked={isStructureLocked} />
          )}
          {question.type === "rating_scale" && (
            <RatingEditor question={question} pageId={pageId} locked={isStructureLocked} />
          )}
          {question.type === "number_input" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">最小値</Label>
                <Input
                  type="number"
                  disabled={isStructureLocked}
                  value={question.validation?.minValue ?? ""}
                  onChange={(e) =>
                    updateQuestion(pageId, question.id, {
                      validation: {
                        ...question.validation,
                        minValue: e.target.value ? Number(e.target.value) : undefined,
                      },
                    })
                  }
                />
              </div>
              <div>
                <Label className="text-xs">最大値</Label>
                <Input
                  type="number"
                  disabled={isStructureLocked}
                  value={question.validation?.maxValue ?? ""}
                  onChange={(e) =>
                    updateQuestion(pageId, question.id, {
                      validation: {
                        ...question.validation,
                        maxValue: e.target.value ? Number(e.target.value) : undefined,
                      },
                    })
                  }
                />
              </div>
            </div>
          )}
          {question.type === "open_text" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">最小文字数</Label>
                <Input
                  type="number"
                  disabled={isStructureLocked}
                  value={question.validation?.minLength ?? ""}
                  onChange={(e) =>
                    updateQuestion(pageId, question.id, {
                      validation: {
                        ...question.validation,
                        minLength: e.target.value ? Number(e.target.value) : undefined,
                      },
                    })
                  }
                />
              </div>
              <div>
                <Label className="text-xs">最大文字数</Label>
                <Input
                  type="number"
                  disabled={isStructureLocked}
                  value={question.validation?.maxLength ?? ""}
                  onChange={(e) =>
                    updateQuestion(pageId, question.id, {
                      validation: {
                        ...question.validation,
                        maxLength: e.target.value ? Number(e.target.value) : undefined,
                      },
                    })
                  }
                />
              </div>
            </div>
          )}

          {/* 必須設定 */}
          <div className="flex items-center gap-2 pt-2">
            <Switch
              id={`required-${question.id}`}
              checked={question.required}
              onCheckedChange={(checked) =>
                updateQuestion(pageId, question.id, { required: checked })
              }
            />
            <Label htmlFor={`required-${question.id}`} className="text-sm">
              必須
            </Label>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

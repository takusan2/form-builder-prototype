"use client";

import { useSurveyBuilderStore } from "@/lib/store/survey-builder-store";
import type { Question, Survey } from "@/lib/types/survey";
import { QUESTION_TYPE_LABELS } from "@/lib/types/survey";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, GripVertical, Link2 } from "lucide-react";
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
  const { survey, activeQuestionId, setActiveQuestionId, updateQuestion, removeQuestion, isStructureLocked } =
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
          {(question.type === "single_choice" || question.type === "multiple_choice") &&
            (question.carryForward ? (
              <CarryForwardPreview question={question} survey={survey} />
            ) : (
              <ChoiceEditor question={question} pageId={pageId} locked={isStructureLocked} />
            ))}
          {(question.type === "matrix_single" || question.type === "matrix_multiple") &&
            (question.carryForward ? (
              <div className="space-y-4">
                <CarryForwardMatrixPreview question={question} survey={survey} />
                <MatrixEditor question={question} pageId={pageId} locked={isStructureLocked} columnsOnly />
              </div>
            ) : (
              <MatrixEditor question={question} pageId={pageId} locked={isStructureLocked} />
            ))}
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

          {/* キャリーフォワード設定 */}
          {(question.type === "single_choice" ||
            question.type === "multiple_choice" ||
            question.type === "matrix_single" ||
            question.type === "matrix_multiple") && (() => {
            // 参照元候補: 自分より前にある選択肢系設問
            const candidateQuestions = survey
              ? survey.structure.pages.flatMap((p) =>
                  p.questions
                    .filter(
                      (q) =>
                        q.id !== question.id &&
                        (q.type === "single_choice" || q.type === "multiple_choice")
                    )
                    .map((q) => ({
                      id: q.id,
                      text: q.text,
                      pageTitle: p.title,
                    }))
                )
              : [];
            return (
              <div className="rounded-md border bg-muted/20 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Link2 className="h-3 w-3 text-muted-foreground" />
                  <Label className="text-xs font-medium">選択肢の引き継ぎ（キャリーフォワード）</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={question.carryForward?.questionId || "_none"}
                    onValueChange={(v) => {
                      if (v === "_none") {
                        updateQuestion(pageId, question.id, {
                          carryForward: undefined,
                        });
                      } else {
                        updateQuestion(pageId, question.id, {
                          carryForward: {
                            questionId: v,
                            mode: question.carryForward?.mode || "selected",
                          },
                        });
                      }
                    }}
                  >
                    <SelectTrigger className="flex-1 text-xs">
                      <SelectValue placeholder="参照元を選択" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">なし</SelectItem>
                      {candidateQuestions.map((q) => (
                        <SelectItem key={q.id} value={q.id}>
                          {q.pageTitle} - {q.text || "（無題）"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {question.carryForward && (
                    <Select
                      value={question.carryForward.mode}
                      onValueChange={(v) =>
                        updateQuestion(pageId, question.id, {
                          carryForward: {
                            ...question.carryForward!,
                            mode: v as "selected" | "not_selected",
                          },
                        })
                      }
                    >
                      <SelectTrigger className="w-36 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="selected">選択されたもの</SelectItem>
                        <SelectItem value="not_selected">選択されなかったもの</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
                {question.carryForward && (
                  <p className="text-xs text-muted-foreground">
                    {question.type === "matrix_single" || question.type === "matrix_multiple"
                      ? "参照元で選択された選択肢がマトリクスの行として表示されます"
                      : "参照元で選択された選択肢がこの設問の選択肢として表示されます"}
                  </p>
                )}
              </div>
            );
          })()}

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

/** キャリーフォワード: 選択肢プレビュー（単一/複数選択用） */
function CarryForwardPreview({
  question,
  survey,
}: {
  question: Question;
  survey: Survey | null;
}) {
  const source = survey?.structure.pages
    .flatMap((p) => p.questions)
    .find((q) => q.id === question.carryForward?.questionId);
  const choices = source?.choices || [];
  const mode = question.carryForward?.mode || "selected";

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Link2 className="h-3 w-3 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">
          「{source?.text || "?"}」で{mode === "selected" ? "選択された" : "選択されなかった"}選択肢を表示
        </span>
      </div>
      <div className="space-y-1 rounded-md border bg-muted/20 p-3">
        {choices.map((c, i) => (
          <div key={c.id} className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="flex h-4 w-4 items-center justify-center rounded-sm border text-xs">
              {question.type === "multiple_choice" ? "☐" : "○"}
            </span>
            {c.text}
          </div>
        ))}
        {choices.length === 0 && (
          <p className="text-xs text-muted-foreground">参照元の選択肢がありません</p>
        )}
      </div>
    </div>
  );
}

/** キャリーフォワード: マトリクスプレビュー */
function CarryForwardMatrixPreview({
  question,
  survey,
}: {
  question: Question;
  survey: Survey | null;
}) {
  const source = survey?.structure.pages
    .flatMap((p) => p.questions)
    .find((q) => q.id === question.carryForward?.questionId);
  const choices = source?.choices || [];
  const columns = question.matrixColumns || [];
  const mode = question.carryForward?.mode || "selected";

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Link2 className="h-3 w-3 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">
          行: 「{source?.text || "?"}」で{mode === "selected" ? "選択された" : "選択されなかった"}選択肢
        </span>
      </div>
      <div className="overflow-x-auto rounded-md border bg-muted/20 p-3">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="pb-2 text-left text-xs font-medium text-muted-foreground">行（引き継ぎ）</th>
              {columns.map((col) => (
                <th key={col.id} className="pb-2 text-center text-xs font-medium text-muted-foreground">
                  {col.text}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {choices.map((c) => (
              <tr key={c.id} className="border-t border-muted">
                <td className="py-1.5 text-muted-foreground">{c.text}</td>
                {columns.map((col) => (
                  <td key={col.id} className="py-1.5 text-center text-muted-foreground">
                    {question.type === "matrix_multiple" ? "☐" : "○"}
                  </td>
                ))}
              </tr>
            ))}
            {choices.length === 0 && (
              <tr>
                <td colSpan={columns.length + 1} className="py-2 text-center text-xs text-muted-foreground">
                  参照元の選択肢がありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

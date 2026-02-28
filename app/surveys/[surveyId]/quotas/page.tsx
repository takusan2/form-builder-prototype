"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type {
  Survey,
  Quota,
  QuotaCondition,
  QuotaConditionType,
  QuotaAction,
  NumericOperator,
} from "@/lib/types/survey";
import { NUMERIC_OPERATOR_LABELS } from "@/lib/types/survey";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Save, Lock } from "lucide-react";
import { nanoid } from "nanoid";
import { toast } from "sonner";

function emptyCondition(): QuotaCondition {
  return { questionId: "", conditionType: "choice", selectedValues: [] };
}

// 設問タイプから適切なconditionTypeを推定
function inferConditionType(questionType: string): QuotaConditionType {
  if (questionType === "number_input" || questionType === "rating_scale") {
    return "numeric";
  }
  return "choice";
}

export default function QuotasPage() {
  const params = useParams();
  const surveyId = params.surveyId as string;
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [quotas, setQuotas] = useState<Quota[]>([]);
  const [counters, setCounters] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const surveyRes = await fetch(`/api/surveys/${surveyId}`);
        const surveyData = await surveyRes.json();
        setSurvey(surveyData);
        setIsLocked((surveyData.responseCount ?? 0) > 0);
        // 後方互換: conditionType が無い古いデータに "choice" を補完
        const fixedQuotas = (surveyData.quotas || []).map((q: Quota) => ({
          ...q,
          conditions: q.conditions.map((c) => ({
            ...c,
            conditionType: c.conditionType || "choice",
          })),
        }));
        setQuotas(fixedQuotas);
      } catch {
        // ignore
      }
      try {
        const counterRes = await fetch(`/api/surveys/${surveyId}/quotas`);
        if (counterRes.ok) {
          const text = await counterRes.text();
          setCounters(text ? JSON.parse(text) : {});
        }
      } catch {
        setCounters({});
      }
    }
    load();
  }, [surveyId]);

  const addQuota = () => {
    setQuotas((prev) => [
      ...prev,
      {
        id: nanoid(8),
        name: `クオータ ${prev.length + 1}`,
        conditions: [emptyCondition()],
        limit: 100,
        currentCount: 0,
        action: "close",
        enabled: true,
      },
    ]);
  };

  const updateQuota = (id: string, updates: Partial<Quota>) => {
    setQuotas((prev) =>
      prev.map((q) => (q.id === id ? { ...q, ...updates } : q))
    );
  };

  const addCondition = (quotaId: string) => {
    setQuotas((prev) =>
      prev.map((q) =>
        q.id === quotaId
          ? { ...q, conditions: [...q.conditions, emptyCondition()] }
          : q
      )
    );
  };

  const updateCondition = (
    quotaId: string,
    condIndex: number,
    updates: Partial<QuotaCondition>
  ) => {
    setQuotas((prev) =>
      prev.map((q) => {
        if (q.id !== quotaId) return q;
        const newConditions = [...q.conditions];
        newConditions[condIndex] = { ...newConditions[condIndex], ...updates };
        return { ...q, conditions: newConditions };
      })
    );
  };

  const removeCondition = (quotaId: string, condIndex: number) => {
    setQuotas((prev) =>
      prev.map((q) => {
        if (q.id !== quotaId) return q;
        if (q.conditions.length <= 1) return q;
        return {
          ...q,
          conditions: q.conditions.filter((_, i) => i !== condIndex),
        };
      })
    );
  };

  const removeQuota = (id: string) => {
    setQuotas((prev) => prev.filter((q) => q.id !== id));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/surveys/${surveyId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quotas }),
      });
      if (!res.ok) throw new Error();
      toast.success("クオータ設定を保存しました");
    } catch {
      toast.error("保存に失敗しました");
    }
    setSaving(false);
  };

  if (!survey) {
    return (
      <div className="flex h-96 items-center justify-center text-muted-foreground">
        読み込み中...
      </div>
    );
  }

  const allQuestions = survey.structure.pages.flatMap((p) =>
    p.questions.map((q) => ({ ...q, pageTitle: p.title }))
  );

  // 計算変数を条件のソースとして追加
  const cvOptions = (survey.computedVariables || []).flatMap((cv) =>
    cv.outputMapping.map((out) => ({
      id: `_cv.${out.variableId}`,
      label: `[変数] ${out.label || out.variableId}`,
    }))
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      {isLocked && (
        <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          <Lock className="h-4 w-4 shrink-0" />
          回答データが存在するため、クオータ条件の変更はロックされています。
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">クオータ設定</h2>
          <p className="text-sm text-muted-foreground">
            複数の設問条件を組み合わせて回答数の上限を管理します
          </p>
        </div>
        <div className="flex gap-2">
          {!isLocked && (
            <Button onClick={addQuota} variant="outline" size="sm">
              <Plus className="mr-1 h-4 w-4" />
              追加
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving} size="sm">
            <Save className="mr-2 h-4 w-4" />
            {saving ? "保存中..." : "保存"}
          </Button>
        </div>
      </div>

      {quotas.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            クオータが設定されていません
          </CardContent>
        </Card>
      )}

      {quotas.map((quota) => {
        const count = counters[quota.id] ?? 0;
        const isFull = count >= quota.limit;

        return (
          <Card key={quota.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Input
                    value={quota.name}
                    onChange={(e) =>
                      updateQuota(quota.id, { name: e.target.value })
                    }
                    className="h-8 w-48 border-none font-semibold shadow-none focus-visible:ring-0"
                  />
                  {isFull && (
                    <Badge variant="destructive" className="text-xs">
                      上限到達
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={quota.enabled}
                    onCheckedChange={(v) =>
                      updateQuota(quota.id, { enabled: v })
                    }
                  />
                  {!isLocked && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => removeQuota(quota.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Label className="text-xs font-medium">
                  条件（すべてANDで評価）
                </Label>
                {quota.conditions.map((cond, condIndex) => {
                  const selectedQ = allQuestions.find(
                    (q) => q.id === cond.questionId
                  );
                  const isNumeric = cond.conditionType === "numeric";

                  return (
                    <div key={condIndex}>
                      {condIndex > 0 && (
                        <div className="my-1 flex justify-center">
                          <Badge variant="outline" className="text-xs">
                            AND
                          </Badge>
                        </div>
                      )}
                      <div className="flex items-start gap-2 rounded-md border bg-muted/30 p-3">
                        <div className="flex-1 space-y-2">
                          {/* 設問選択 + 条件タイプ */}
                          <div className="flex gap-2">
                            <Select
                              value={cond.questionId}
                              onValueChange={(v) => {
                                const q = allQuestions.find((q) => q.id === v);
                                const ct = q
                                  ? inferConditionType(q.type)
                                  : "choice";
                                updateCondition(quota.id, condIndex, {
                                  questionId: v,
                                  conditionType: ct,
                                  selectedValues: [],
                                  operator: ct === "numeric" ? "greater_equal" : undefined,
                                  value: ct === "numeric" ? 0 : undefined,
                                });
                              }}
                              disabled={isLocked}
                            >
                              <SelectTrigger className="flex-1 text-xs">
                                <SelectValue placeholder="設問を選択" />
                              </SelectTrigger>
                              <SelectContent>
                                {allQuestions.map((q) => (
                                  <SelectItem key={q.id} value={q.id}>
                                    {q.pageTitle} - {q.text || "（無題）"}
                                  </SelectItem>
                                ))}
                                {cvOptions.length > 0 && (
                                  <>
                                    <SelectItem value="_cv_separator" disabled>
                                      ── 計算変数 ──
                                    </SelectItem>
                                    {cvOptions.map((cv) => (
                                      <SelectItem key={cv.id} value={cv.id}>
                                        {cv.label}
                                      </SelectItem>
                                    ))}
                                  </>
                                )}
                              </SelectContent>
                            </Select>

                            {cond.questionId && (
                              <Select
                                value={cond.conditionType}
                                onValueChange={(v) =>
                                  updateCondition(quota.id, condIndex, {
                                    conditionType: v as QuotaConditionType,
                                    selectedValues: v === "choice" ? [] : undefined,
                                    operator: v === "numeric" ? "greater_equal" : undefined,
                                    value: v === "numeric" ? 0 : undefined,
                                  })
                                }
                                disabled={isLocked}
                              >
                                <SelectTrigger className="w-28 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="choice">選択肢</SelectItem>
                                  <SelectItem value="numeric">数値</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          </div>

                          {/* choice型: 選択肢バッジ */}
                          {cond.questionId &&
                            !isNumeric &&
                            selectedQ?.choices && (
                              <div className="flex flex-wrap gap-1">
                                {selectedQ.choices.map((choice) => {
                                  const vals = cond.selectedValues || [];
                                  const isSelected = vals.includes(
                                    choice.value
                                  );
                                  return (
                                    <Badge
                                      key={choice.id}
                                      variant={
                                        isSelected ? "default" : "outline"
                                      }
                                      className={`text-xs ${isLocked ? "" : "cursor-pointer"}`}
                                      onClick={() => {
                                        if (isLocked) return;
                                        const newValues = isSelected
                                          ? vals.filter(
                                              (v) => v !== choice.value
                                            )
                                          : [...vals, choice.value];
                                        updateCondition(
                                          quota.id,
                                          condIndex,
                                          { selectedValues: newValues }
                                        );
                                      }}
                                    >
                                      {choice.text}
                                    </Badge>
                                  );
                                })}
                              </div>
                            )}

                          {/* numeric型: 演算子 + 値 */}
                          {cond.questionId && isNumeric && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                回答値が
                              </span>
                              <Select
                                value={cond.operator || "greater_equal"}
                                onValueChange={(v) =>
                                  updateCondition(quota.id, condIndex, {
                                    operator: v as NumericOperator,
                                  })
                                }
                                disabled={isLocked}
                              >
                                <SelectTrigger className="w-16 text-center text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.entries(NUMERIC_OPERATOR_LABELS).map(
                                    ([key, label]) => (
                                      <SelectItem key={key} value={key}>
                                        {label}
                                      </SelectItem>
                                    )
                                  )}
                                </SelectContent>
                              </Select>
                              <Input
                                type="number"
                                value={cond.value ?? ""}
                                onChange={(e) =>
                                  updateCondition(quota.id, condIndex, {
                                    value: e.target.value
                                      ? Number(e.target.value)
                                      : undefined,
                                  })
                                }
                                className="w-24 text-xs"
                                placeholder="値"
                                disabled={isLocked}
                              />
                            </div>
                          )}
                        </div>
                        {quota.conditions.length > 1 && !isLocked && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0"
                            onClick={() =>
                              removeCondition(quota.id, condIndex)
                            }
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {!isLocked && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => addCondition(quota.id)}
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    条件を追加
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">上限数</Label>
                  <Input
                    type="number"
                    value={quota.limit}
                    onChange={(e) =>
                      updateQuota(quota.id, { limit: Number(e.target.value) })
                    }
                    min={1}
                    disabled={isLocked}
                  />
                </div>
                <div>
                  <Label className="text-xs">上限到達時のアクション</Label>
                  <Select
                    value={quota.action}
                    onValueChange={(v) =>
                      updateQuota(quota.id, { action: v as QuotaAction })
                    }
                    disabled={isLocked}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="close">受付終了</SelectItem>
                      <SelectItem value="disqualify">対象外にする</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isFull ? "bg-destructive" : "bg-primary"
                    }`}
                    style={{
                      width: `${Math.min(100, (count / quota.limit) * 100)}%`,
                    }}
                  />
                </div>
                <span className="text-sm font-medium tabular-nums">
                  {count} / {quota.limit}
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

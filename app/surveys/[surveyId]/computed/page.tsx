"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { Survey, ComputedVariable, ComputedVariableInput, ComputedVariableOutput } from "@/lib/types/survey";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Save, ArrowRight, Zap, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { nanoid } from "nanoid";

function createEmptyVariable(pages: Survey["structure"]["pages"]): ComputedVariable {
  return {
    id: nanoid(8),
    name: "",
    endpoint: "",
    trigger: {
      type: "on_page_leave",
      pageId: pages[0]?.id || "",
    },
    inputMapping: [],
    outputMapping: [],
    fallbackValues: {},
    timeout: 5000,
    enabled: true,
  };
}

export default function ComputedVariablesPage() {
  const params = useParams();
  const surveyId = params.surveyId as string;
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [variables, setVariables] = useState<ComputedVariable[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/surveys/${surveyId}`)
      .then((r) => r.json())
      .then((data: Survey) => {
        setSurvey(data);
        setVariables(data.computedVariables || []);
      });
  }, [surveyId]);

  const allQuestions = survey
    ? survey.structure.pages.flatMap((p) =>
        p.questions.map((q) => ({ ...q, pageTitle: p.title }))
      )
    : [];

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/surveys/${surveyId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ computedVariables: variables }),
      });
      if (!res.ok) throw new Error();
      toast.success("保存しました");
    } catch {
      toast.error("保存に失敗しました");
    }
    setSaving(false);
  };

  const addVariable = () => {
    if (!survey) return;
    setVariables([...variables, createEmptyVariable(survey.structure.pages)]);
  };

  const removeVariable = (id: string) => {
    setVariables(variables.filter((v) => v.id !== id));
  };

  const updateVariable = (id: string, updates: Partial<ComputedVariable>) => {
    setVariables(
      variables.map((v) => (v.id === id ? { ...v, ...updates } : v))
    );
  };

  const addInput = (varId: string) => {
    setVariables(
      variables.map((v) =>
        v.id === varId
          ? {
              ...v,
              inputMapping: [
                ...v.inputMapping,
                { questionId: "", paramName: "" },
              ],
            }
          : v
      )
    );
  };

  const removeInput = (varId: string, index: number) => {
    setVariables(
      variables.map((v) =>
        v.id === varId
          ? {
              ...v,
              inputMapping: v.inputMapping.filter((_, i) => i !== index),
            }
          : v
      )
    );
  };

  const updateInput = (
    varId: string,
    index: number,
    updates: Partial<ComputedVariableInput>
  ) => {
    setVariables(
      variables.map((v) =>
        v.id === varId
          ? {
              ...v,
              inputMapping: v.inputMapping.map((inp, i) =>
                i === index ? { ...inp, ...updates } : inp
              ),
            }
          : v
      )
    );
  };

  const addOutput = (varId: string) => {
    setVariables(
      variables.map((v) =>
        v.id === varId
          ? {
              ...v,
              outputMapping: [
                ...v.outputMapping,
                { responseKey: "", variableId: "", label: "" },
              ],
            }
          : v
      )
    );
  };

  const removeOutput = (varId: string, index: number) => {
    setVariables(
      variables.map((v) =>
        v.id === varId
          ? {
              ...v,
              outputMapping: v.outputMapping.filter((_, i) => i !== index),
            }
          : v
      )
    );
  };

  const updateOutput = (
    varId: string,
    index: number,
    updates: Partial<ComputedVariableOutput>
  ) => {
    setVariables(
      variables.map((v) =>
        v.id === varId
          ? {
              ...v,
              outputMapping: v.outputMapping.map((out, i) =>
                i === index ? { ...out, ...updates } : out
              ),
            }
          : v
      )
    );
  };

  const updateFallback = (varId: string, variableId: string, value: string) => {
    setVariables(
      variables.map((v) =>
        v.id === varId
          ? {
              ...v,
              fallbackValues: { ...(v.fallbackValues || {}), [variableId]: value },
            }
          : v
      )
    );
  };

  if (!survey) {
    return (
      <div className="flex h-96 items-center justify-center text-muted-foreground">
        読み込み中...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">外部ロジック（計算変数）</h2>
          <p className="text-sm text-muted-foreground">
            ページ遷移時に外部APIを呼び出し、結果を分岐やクオータの条件として使用できます
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={addVariable}>
            <Plus className="mr-1 h-4 w-4" />
            追加
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="mr-1 h-4 w-4" />
            保存
          </Button>
        </div>
      </div>

      {variables.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <Zap className="mx-auto mb-3 h-8 w-8" />
            <p className="mb-1 font-medium">外部ロジックが未設定です</p>
            <p className="text-sm">
              外部APIを使って回答データを分類し、分岐やクオータの条件に使えます
            </p>
          </CardContent>
        </Card>
      )}

      {variables.map((cv) => (
        <Card key={cv.id}>
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-3">
                <Switch
                  checked={cv.enabled}
                  onCheckedChange={(checked) =>
                    updateVariable(cv.id, { enabled: checked })
                  }
                />
                <Input
                  value={cv.name}
                  onChange={(e) =>
                    updateVariable(cv.id, { name: e.target.value })
                  }
                  placeholder="名前（例: 地域分類）"
                  className="max-w-xs text-base font-medium"
                />
                {!cv.enabled && (
                  <Badge variant="secondary" className="text-xs">
                    無効
                  </Badge>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => removeVariable(cv.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* エンドポイント */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">エンドポイントURL</Label>
              <Input
                value={cv.endpoint}
                onChange={(e) =>
                  updateVariable(cv.id, { endpoint: e.target.value })
                }
                placeholder="https://example.com/api/classify"
              />
            </div>

            {/* トリガー */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">トリガー（ページ離脱時）</Label>
              <Select
                value={cv.trigger.pageId}
                onValueChange={(v) =>
                  updateVariable(cv.id, {
                    trigger: { type: "on_page_leave", pageId: v },
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="ページを選択" />
                </SelectTrigger>
                <SelectContent>
                  {survey.structure.pages.map((p, i) => (
                    <SelectItem key={p.id} value={p.id}>
                      ページ {i + 1}: {p.title || "(無題)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 入力マッピング */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">入力（APIに送る回答）</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addInput(cv.id)}
                >
                  <Plus className="mr-1 h-3 w-3" />
                  追加
                </Button>
              </div>
              {cv.inputMapping.map((inp, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Select
                    value={inp.questionId || "_none"}
                    onValueChange={(v) =>
                      updateInput(cv.id, i, {
                        questionId: v === "_none" ? "" : v,
                      })
                    }
                  >
                    <SelectTrigger className="flex-1 text-xs">
                      <SelectValue placeholder="設問を選択" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">未選択</SelectItem>
                      {allQuestions.map((q) => (
                        <SelectItem key={q.id} value={q.id}>
                          {q.pageTitle} - {q.text || "(無題)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <Input
                    value={inp.paramName}
                    onChange={(e) =>
                      updateInput(cv.id, i, { paramName: e.target.value })
                    }
                    placeholder="パラメータ名"
                    className="w-36 text-xs"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => removeInput(cv.id, i)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              {cv.inputMapping.length === 0 && (
                <p className="text-xs text-muted-foreground">入力が未設定です</p>
              )}
            </div>

            {/* 出力マッピング */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">出力（APIから受け取る変数）</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addOutput(cv.id)}
                >
                  <Plus className="mr-1 h-3 w-3" />
                  追加
                </Button>
              </div>
              {cv.outputMapping.map((out, i) => (
                <div key={i} className="space-y-2 rounded-md border bg-muted/20 p-3">
                  <div className="flex items-center gap-2">
                    <Input
                      value={out.responseKey}
                      onChange={(e) =>
                        updateOutput(cv.id, i, { responseKey: e.target.value })
                      }
                      placeholder="レスポンスのキー"
                      className="flex-1 text-xs"
                    />
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <Input
                      value={out.variableId}
                      onChange={(e) =>
                        updateOutput(cv.id, i, { variableId: e.target.value })
                      }
                      placeholder="変数ID（例: region）"
                      className="w-36 text-xs"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => removeOutput(cv.id, i)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      value={out.label}
                      onChange={(e) =>
                        updateOutput(cv.id, i, { label: e.target.value })
                      }
                      placeholder="表示名（例: 地域区分）"
                      className="flex-1 text-xs"
                    />
                    <Input
                      value={cv.fallbackValues?.[out.variableId] || ""}
                      onChange={(e) =>
                        updateFallback(cv.id, out.variableId, e.target.value)
                      }
                      placeholder="フォールバック値"
                      className="w-36 text-xs"
                    />
                  </div>
                </div>
              ))}
              {cv.outputMapping.length === 0 && (
                <p className="text-xs text-muted-foreground">出力が未設定です</p>
              )}
            </div>

            {/* タイムアウト */}
            <div className="flex items-center gap-3">
              <Label className="text-xs font-medium">タイムアウト(ms)</Label>
              <Input
                type="number"
                value={cv.timeout || 5000}
                onChange={(e) =>
                  updateVariable(cv.id, {
                    timeout: Number(e.target.value) || 5000,
                  })
                }
                className="w-24 text-xs"
              />
            </div>

            {/* 使い方ヒント */}
            <div className="flex items-start gap-2 rounded-md border bg-muted/30 p-3">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <div className="text-xs text-muted-foreground">
                <p>出力変数は分岐条件やクオータ条件で <code className="rounded bg-muted px-1">_cv.変数ID</code> として参照できます。</p>
                <p className="mt-1">
                  APIは POST で呼ばれ、入力マッピングで指定した回答がJSONで送信されます。
                  レスポンスはJSONで返してください。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

"use client";

import { useSurveyBuilderStore } from "@/lib/store/survey-builder-store";
import { useAutoSave } from "@/lib/hooks/use-auto-save";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, ArrowRight, Save, Lock } from "lucide-react";
import { ConditionBuilder } from "./ConditionBuilder";
import { ActionSelector } from "./ActionSelector";
import type { BranchingRule, ConditionGroup, BranchingAction } from "@/lib/types/survey";
import { nanoid } from "nanoid";

function createEmptyConditionGroup(): ConditionGroup {
  return {
    id: nanoid(8),
    connector: "and",
    conditions: [
      {
        id: nanoid(8),
        questionId: "",
        operator: "equals",
        value: "",
      },
    ],
  };
}

export function BranchingEditor() {
  const { survey, isDirty, isSaving, isStructureLocked, addBranchingRule, removeBranchingRule, updateBranchingRule } =
    useSurveyBuilderStore();
  const { handleSave } = useAutoSave();

  if (!survey) return null;

  const { pages } = survey.structure;

  const allQuestions = pages.flatMap((p) =>
    p.questions.map((q) => ({ ...q, pageId: p.id, pageTitle: p.title }))
  );

  const handleAddRule = (pageId: string) => {
    const rule: BranchingRule = {
      id: nanoid(8),
      conditionGroup: createEmptyConditionGroup(),
      action: { type: "skip_to_end" },
      priority: (pages.find((p) => p.id === pageId)?.branchingRules?.length ?? 0) + 1,
    };
    addBranchingRule(pageId, rule);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      {isStructureLocked && (
        <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          <Lock className="h-4 w-4 shrink-0" />
          回答データが存在するため、条件分岐ルールの変更はロックされています。
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">条件分岐ロジック</h2>
          <p className="text-sm text-muted-foreground">
            各ページに分岐ルールを設定し、回答に応じて遷移先を制御します
          </p>
        </div>
        <Button onClick={handleSave} disabled={!isDirty || isSaving} size="sm">
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? "保存中..." : isDirty ? "保存" : "保存済み"}
        </Button>
      </div>

      {pages.map((page, pageIndex) => (
        <Card key={page.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline">P{pageIndex + 1}</Badge>
                <CardTitle className="text-base">{page.title}</CardTitle>
                <span className="text-xs text-muted-foreground">
                  ({page.questions.length}問)
                </span>
              </div>
              {!isStructureLocked && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddRule(page.id)}
                >
                  <Plus className="mr-1 h-3 w-3" />
                  ルール追加
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {(!page.branchingRules || page.branchingRules.length === 0) && (
              <p className="text-sm text-muted-foreground">
                分岐ルールなし（デフォルト: 次のページへ進む）
              </p>
            )}
            {page.branchingRules?.map((rule, ruleIndex) => (
              <div
                key={rule.id}
                className="space-y-3 rounded-lg border bg-muted/30 p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    ルール {ruleIndex + 1}
                  </span>
                  {!isStructureLocked && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => removeBranchingRule(page.id, rule.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>

                <ConditionBuilder
                  conditionGroup={rule.conditionGroup}
                  questions={allQuestions}
                  onChange={(conditionGroup: ConditionGroup) =>
                    updateBranchingRule(page.id, rule.id, { conditionGroup })
                  }
                  disabled={isStructureLocked}
                />

                <div className="flex items-center gap-2 pt-2">
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <ActionSelector
                    action={rule.action}
                    pages={pages}
                    currentPageId={page.id}
                    onChange={(action: BranchingAction) =>
                      updateBranchingRule(page.id, rule.id, { action })
                    }
                    disabled={isStructureLocked}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

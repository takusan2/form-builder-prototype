"use client";

import { useSurveyBuilderStore } from "@/lib/store/survey-builder-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save, Undo2, Redo2 } from "lucide-react";
import { toast } from "sonner";

export function BuilderToolbar() {
  const { survey, isDirty, isSaving, saveSurvey, undo, redo, canUndo, canRedo } =
    useSurveyBuilderStore();

  if (!survey) return null;

  const handleSave = async () => {
    try {
      await saveSurvey();
      toast.success("保存しました");
    } catch {
      toast.error("保存に失敗しました");
    }
  };

  return (
    <div className="flex items-center gap-2 border-b bg-background px-4 py-2">
      <Input
        value={survey.title}
        onChange={(e) =>
          useSurveyBuilderStore.setState((state) => ({
            ...state,
            survey: state.survey ? { ...state.survey, title: e.target.value } : null,
            isDirty: true,
          }))
        }
        className="max-w-xs border-none text-lg font-semibold shadow-none focus-visible:ring-0"
        placeholder="アンケートタイトル"
      />
      <div className="flex-1" />
      <Button variant="ghost" size="icon" onClick={undo} disabled={!canUndo()}>
        <Undo2 className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={redo} disabled={!canRedo()}>
        <Redo2 className="h-4 w-4" />
      </Button>
      <Button onClick={handleSave} disabled={!isDirty || isSaving} size="sm">
        <Save className="mr-2 h-4 w-4" />
        {isSaving ? "保存中..." : isDirty ? "保存" : "保存済み"}
      </Button>
    </div>
  );
}

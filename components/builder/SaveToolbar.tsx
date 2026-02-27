"use client";

import { useSurveyBuilderStore } from "@/lib/store/survey-builder-store";
import { useAutoSave } from "@/lib/hooks/use-auto-save";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";

export function SaveToolbar() {
  const { isDirty, isSaving } = useSurveyBuilderStore();
  const { handleSave } = useAutoSave();

  return (
    <div className="flex items-center justify-end border-b bg-background px-4 py-2">
      <Button onClick={handleSave} disabled={!isDirty || isSaving} size="sm">
        <Save className="mr-2 h-4 w-4" />
        {isSaving ? "保存中..." : isDirty ? "保存" : "保存済み"}
      </Button>
    </div>
  );
}

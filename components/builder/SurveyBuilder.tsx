"use client";

import { useSurveyBuilderStore } from "@/lib/store/survey-builder-store";
import { useAutoSave } from "@/lib/hooks/use-auto-save";
import { PageList } from "./PageList";
import { PageEditor } from "./PageEditor";
import { BuilderToolbar } from "./BuilderToolbar";
import { Lock } from "lucide-react";

export function SurveyBuilder() {
  const { survey, isStructureLocked } = useSurveyBuilderStore();
  useAutoSave();

  if (!survey) return null;

  return (
    <div className="flex h-[calc(100vh-57px)] flex-col">
      <BuilderToolbar />
      {isStructureLocked && (
        <div className="flex items-center gap-2 border-b bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          <Lock className="h-4 w-4 shrink-0" />
          回答データが存在するため、設問構造の変更（追加・削除・選択肢の変更等）はロックされています。
          変更するには「回答」タブから回答データをリセットしてください。
        </div>
      )}
      <div className="flex flex-1 overflow-hidden">
        <PageList />
        <PageEditor />
      </div>
    </div>
  );
}

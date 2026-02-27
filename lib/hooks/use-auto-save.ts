"use client";

import { useCallback, useEffect } from "react";
import { useSurveyBuilderStore } from "@/lib/store/survey-builder-store";
import { toast } from "sonner";

export function useAutoSave() {
  const { isDirty, saveSurvey } = useSurveyBuilderStore();

  const handleSave = useCallback(async () => {
    try {
      await saveSurvey();
      toast.success("保存しました");
    } catch {
      toast.error("保存に失敗しました");
    }
  }, [saveSurvey]);

  // Ctrl+S / Cmd+S
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (isDirty) handleSave();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isDirty, handleSave]);

  // Auto-save every 30s
  useEffect(() => {
    if (!isDirty) return;
    const timer = setTimeout(() => {
      saveSurvey().catch(() => {});
    }, 30000);
    return () => clearTimeout(timer);
  }, [isDirty, saveSurvey]);

  return { handleSave };
}

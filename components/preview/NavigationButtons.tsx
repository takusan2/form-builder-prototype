"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Send, Loader2 } from "lucide-react";

interface NavigationButtonsProps {
  onBack: () => void;
  onNext: () => void;
  showBack: boolean;
  isLastPage: boolean;
  isPreview?: boolean;
  submitting?: boolean;
}

export function NavigationButtons({
  onBack,
  onNext,
  showBack,
  isLastPage,
  isPreview,
  submitting,
}: NavigationButtonsProps) {
  return (
    <div className="flex justify-between pt-4">
      {showBack ? (
        <Button variant="outline" onClick={onBack} disabled={submitting}>
          <ChevronLeft className="mr-1 h-4 w-4" />
          戻る
        </Button>
      ) : (
        <div />
      )}
      <Button onClick={onNext} disabled={submitting}>
        {submitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            送信中...
          </>
        ) : isLastPage ? (
          <>
            {isPreview ? "完了（プレビュー）" : "送信"}
            <Send className="ml-1 h-4 w-4" />
          </>
        ) : (
          <>
            次へ
            <ChevronRight className="ml-1 h-4 w-4" />
          </>
        )}
      </Button>
    </div>
  );
}

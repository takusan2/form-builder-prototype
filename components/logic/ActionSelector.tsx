"use client";

import type { BranchingAction, SurveyPage } from "@/lib/types/survey";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ActionSelectorProps {
  action: BranchingAction;
  pages: SurveyPage[];
  currentPageId: string;
  onChange: (action: BranchingAction) => void;
  disabled?: boolean;
}

export function ActionSelector({ action, pages, currentPageId, onChange, disabled }: ActionSelectorProps) {
  const actionType = action.type;
  const targetPageId = action.type === "go_to_page" ? action.pageId : "";

  const handleTypeChange = (type: string) => {
    switch (type) {
      case "go_to_page":
        onChange({ type: "go_to_page", pageId: pages[0]?.id || "" });
        break;
      case "skip_to_end":
        onChange({ type: "skip_to_end" });
        break;
      case "disqualify":
        onChange({ type: "disqualify" });
        break;
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={actionType} onValueChange={handleTypeChange} disabled={disabled}>
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="go_to_page">ページへ移動</SelectItem>
          <SelectItem value="skip_to_end">終了へスキップ</SelectItem>
          <SelectItem value="disqualify">対象外にする</SelectItem>
        </SelectContent>
      </Select>

      {actionType === "go_to_page" && (
        <Select
          value={targetPageId}
          onValueChange={(pageId) => onChange({ type: "go_to_page", pageId })}
          disabled={disabled}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="ページを選択" />
          </SelectTrigger>
          <SelectContent>
            {pages
              .filter((p) => p.id !== currentPageId)
              .map((p, i) => (
                <SelectItem key={p.id} value={p.id}>
                  {pages.indexOf(p) + 1}. {p.title}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

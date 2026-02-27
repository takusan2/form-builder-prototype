"use client";

import { useSurveyBuilderStore } from "@/lib/store/survey-builder-store";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Plus, Trash2, GripVertical } from "lucide-react";

export function PageList() {
  const { survey, activePageId, setActivePageId, addPage, removePage, isStructureLocked } =
    useSurveyBuilderStore();

  if (!survey) return null;

  const { pages } = survey.structure;

  return (
    <div className="flex min-h-0 w-60 flex-col border-r bg-muted/30">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="text-sm font-medium">ページ</span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={addPage} disabled={isStructureLocked}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="p-2">
          {pages.map((page, index) => (
            <div
              key={page.id}
              className={cn(
                "group mb-1 flex cursor-pointer items-center gap-1 rounded-md px-2 py-2 text-sm transition-colors",
                activePageId === page.id
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              )}
              onClick={() => setActivePageId(page.id)}
            >
              <GripVertical className="h-3 w-3 shrink-0 opacity-50" />
              <span className="flex-1 truncate">
                {index + 1}. {page.title}
              </span>
              <span
                className={cn(
                  "text-xs",
                  activePageId === page.id ? "text-primary-foreground/70" : "text-muted-foreground"
                )}
              >
                {page.questions.length}問
              </span>
              {pages.length > 1 && !isStructureLocked && (
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-6 w-6 opacity-0 group-hover:opacity-100",
                    activePageId === page.id && "text-primary-foreground hover:text-primary-foreground"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    removePage(page.id);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

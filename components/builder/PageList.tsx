"use client";

import { useSurveyBuilderStore } from "@/lib/store/survey-builder-store";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Plus, Trash2, GripVertical } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import type { SurveyPage } from "@/lib/types/survey";

function SortablePageItem({
  page,
  index,
  isActive,
  canDelete,
  locked,
  onSelect,
  onDelete,
}: {
  page: SurveyPage;
  index: number;
  isActive: boolean;
  canDelete: boolean;
  locked: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: page.id, disabled: locked });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group mb-1 flex cursor-pointer items-center gap-1 rounded-md px-2 py-2 text-sm transition-colors",
        isActive
          ? "bg-primary text-primary-foreground"
          : "hover:bg-muted"
      )}
      onClick={onSelect}
    >
      <GripVertical
        className={cn(
          "h-3 w-3 shrink-0",
          locked ? "opacity-30" : "cursor-grab opacity-50"
        )}
        {...attributes}
        {...listeners}
      />
      <span className="flex-1 truncate">
        {index + 1}. {page.title}
      </span>
      <span
        className={cn(
          "text-xs",
          isActive ? "text-primary-foreground/70" : "text-muted-foreground"
        )}
      >
        {page.questions.length}問
      </span>
      {canDelete && !locked && (
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-6 w-6 opacity-0 group-hover:opacity-100",
            isActive && "text-primary-foreground hover:text-primary-foreground"
          )}
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

export function PageList() {
  const { survey, activePageId, setActivePageId, addPage, removePage, movePage, isStructureLocked } =
    useSurveyBuilderStore();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  if (!survey) return null;

  const { pages } = survey.structure;

  const handleDragEnd = (event: DragEndEvent) => {
    if (isStructureLocked) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = pages.findIndex((p) => p.id === active.id);
    const to = pages.findIndex((p) => p.id === over.id);
    if (from === -1 || to === -1) return;
    movePage(from, to);
  };

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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={pages.map((p) => p.id)}
              strategy={verticalListSortingStrategy}
            >
              {pages.map((page, index) => (
                <SortablePageItem
                  key={page.id}
                  page={page}
                  index={index}
                  isActive={activePageId === page.id}
                  canDelete={pages.length > 1}
                  locked={isStructureLocked}
                  onSelect={() => setActivePageId(page.id)}
                  onDelete={() => removePage(page.id)}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      </ScrollArea>
    </div>
  );
}

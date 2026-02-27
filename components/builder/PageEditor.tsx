"use client";

import { useSurveyBuilderStore } from "@/lib/store/survey-builder-store";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { QuestionCard } from "./QuestionCard";
import { QuestionTypeSelector } from "./QuestionTypeSelector";
import type { QuestionType } from "@/lib/types/survey";
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
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";

export function PageEditor() {
  const { survey, activePageId, updatePage, addQuestion, moveQuestion, isStructureLocked } =
    useSurveyBuilderStore();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  if (!survey || !activePageId) return null;

  const page = survey.structure.pages.find((p) => p.id === activePageId);
  if (!page) return null;

  const handleAddQuestion = (type: QuestionType) => {
    addQuestion(activePageId, type);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    if (isStructureLocked) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const fromIndex = page.questions.findIndex((q) => q.id === active.id);
    const toIndex = page.questions.findIndex((q) => q.id === over.id);
    if (fromIndex !== -1 && toIndex !== -1) {
      moveQuestion(activePageId, activePageId, fromIndex, toIndex);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b px-6 py-4">
        <Input
          value={page.title}
          onChange={(e) => updatePage(activePageId, { title: e.target.value })}
          className="border-none text-lg font-semibold shadow-none focus-visible:ring-0"
          placeholder="ページタイトル"
        />
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="mx-auto max-w-3xl space-y-4 px-6 py-6">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={page.questions.map((q) => q.id)}
              strategy={verticalListSortingStrategy}
            >
              {page.questions.map((question, index) => (
                <QuestionCard
                  key={question.id}
                  question={question}
                  pageId={activePageId}
                  index={index}
                />
              ))}
            </SortableContext>
          </DndContext>
          {!isStructureLocked && (
            <QuestionTypeSelector onSelect={handleAddQuestion} />
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

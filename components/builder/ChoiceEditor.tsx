"use client";

import { useSurveyBuilderStore } from "@/lib/store/survey-builder-store";
import type { Question, Choice } from "@/lib/types/survey";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { Plus, Trash2, GripVertical, Ban } from "lucide-react";
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

interface ChoiceEditorProps {
  question: Question;
  pageId: string;
  locked?: boolean;
}

function SortableChoiceItem({
  choice,
  index,
  pageId,
  questionId,
  showExclusive,
  canDelete,
  locked,
}: {
  choice: Choice;
  index: number;
  pageId: string;
  questionId: string;
  showExclusive: boolean;
  canDelete: boolean;
  locked?: boolean;
}) {
  const { updateChoice, removeChoice } = useSurveyBuilderStore();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: choice.id, disabled: locked });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2">
      <GripVertical
        className="h-4 w-4 shrink-0 cursor-grab text-muted-foreground"
        {...attributes}
        {...listeners}
      />
      <span className="w-6 text-center text-xs text-muted-foreground">
        {index + 1}
      </span>
      <Input
        value={choice.text}
        onChange={(e) =>
          updateChoice(pageId, questionId, choice.id, { text: e.target.value })
        }
        placeholder={`選択肢 ${index + 1}`}
        className="flex-1"
      />
      <Input
        value={choice.value}
        disabled={locked}
        onChange={(e) =>
          updateChoice(pageId, questionId, choice.id, { value: e.target.value })
        }
        placeholder="値"
        className="w-20"
      />
      {showExclusive && (
        <Toggle
          size="sm"
          variant="outline"
          disabled={locked}
          pressed={choice.isExclusive ?? false}
          onPressedChange={(pressed) =>
            updateChoice(pageId, questionId, choice.id, { isExclusive: pressed })
          }
          className="h-8 w-8 shrink-0"
          title="排他選択肢（選ぶと他が解除される）"
        >
          <Ban className="h-3 w-3" />
        </Toggle>
      )}
      {canDelete && !locked && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => removeChoice(pageId, questionId, choice.id)}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

export function ChoiceEditor({ question, pageId, locked }: ChoiceEditorProps) {
  const { addChoice, moveChoice } = useSurveyBuilderStore();
  const showExclusive = question.type === "multiple_choice";

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  if (!question.choices) return null;

  const handleDragEnd = (event: DragEndEvent) => {
    if (locked) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const fromIndex = question.choices!.findIndex((c) => c.id === active.id);
    const toIndex = question.choices!.findIndex((c) => c.id === over.id);
    if (fromIndex !== -1 && toIndex !== -1) {
      moveChoice(pageId, question.id, fromIndex, toIndex);
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">選択肢</label>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={question.choices.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {question.choices.map((choice, index) => (
            <SortableChoiceItem
              key={choice.id}
              choice={choice}
              index={index}
              pageId={pageId}
              questionId={question.id}
              showExclusive={showExclusive}
              canDelete={question.choices!.length > 1}
              locked={locked}
            />
          ))}
        </SortableContext>
      </DndContext>
      {!locked && (
        <Button
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={() => addChoice(pageId, question.id)}
        >
          <Plus className="mr-1 h-3 w-3" />
          選択肢を追加
        </Button>
      )}
      {showExclusive && (
        <p className="text-xs text-muted-foreground">
          <Ban className="mr-1 inline h-3 w-3" />
          排他: ONにすると、この選択肢を選んだ時に他の選択肢が解除されます
        </p>
      )}
    </div>
  );
}

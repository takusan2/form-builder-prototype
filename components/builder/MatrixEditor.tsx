"use client";

import { useSurveyBuilderStore } from "@/lib/store/survey-builder-store";
import type { Question, MatrixRow, MatrixColumn } from "@/lib/types/survey";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Toggle } from "@/components/ui/toggle";
import { Plus, Trash2, GripVertical, Ban } from "lucide-react";
import { nanoid } from "nanoid";
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

interface MatrixEditorProps {
  question: Question;
  pageId: string;
  locked?: boolean;
  /** trueの場合、列セクションのみ表示（行はキャリーフォワードで管理） */
  columnsOnly?: boolean;
}

function SortableRowItem({
  row,
  index,
  canDelete,
  locked,
  onUpdate,
  onDelete,
}: {
  row: MatrixRow;
  index: number;
  canDelete: boolean;
  locked?: boolean;
  onUpdate: (text: string) => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: row.id, disabled: locked });

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
        value={row.text}
        onChange={(e) => onUpdate(e.target.value)}
        placeholder={`行 ${index + 1}`}
        className="flex-1"
      />
      {canDelete && !locked && (
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDelete}>
          <Trash2 className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

function SortableColumnItem({
  col,
  index,
  canDelete,
  showExclusive,
  locked,
  onUpdateText,
  onUpdateValue,
  onUpdateExclusive,
  onDelete,
}: {
  col: MatrixColumn;
  index: number;
  canDelete: boolean;
  showExclusive: boolean;
  locked?: boolean;
  onUpdateText: (text: string) => void;
  onUpdateValue: (value: string) => void;
  onUpdateExclusive: (pressed: boolean) => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: col.id, disabled: locked });

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
        value={col.text}
        onChange={(e) => onUpdateText(e.target.value)}
        placeholder={`列 ${index + 1}`}
        className="flex-1"
      />
      <Input
        value={col.value}
        disabled={locked}
        onChange={(e) => onUpdateValue(e.target.value)}
        placeholder="値"
        className="w-20"
      />
      {showExclusive && (
        <Toggle
          size="sm"
          variant="outline"
          disabled={locked}
          pressed={col.isExclusive ?? false}
          onPressedChange={onUpdateExclusive}
          className="h-8 w-8 shrink-0"
          title="排他列（選ぶと他の列が解除される）"
        >
          <Ban className="h-3 w-3" />
        </Toggle>
      )}
      {canDelete && !locked && (
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDelete}>
          <Trash2 className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

export function MatrixEditor({ question, pageId, locked, columnsOnly }: MatrixEditorProps) {
  const { updateQuestion } = useSurveyBuilderStore();
  const showExclusive = question.type === "matrix_multiple";

  const rows = question.matrixRows || [];
  const columns = question.matrixColumns || [];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const updateRows = (newRows: MatrixRow[]) => {
    updateQuestion(pageId, question.id, { matrixRows: newRows });
  };

  const updateColumns = (newColumns: MatrixColumn[]) => {
    updateQuestion(pageId, question.id, { matrixColumns: newColumns });
  };

  const handleRowDragEnd = (event: DragEndEvent) => {
    if (locked) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = rows.findIndex((r) => r.id === active.id);
    const to = rows.findIndex((r) => r.id === over.id);
    if (from === -1 || to === -1) return;
    const newRows = [...rows];
    const [moved] = newRows.splice(from, 1);
    newRows.splice(to, 0, moved);
    updateRows(newRows);
  };

  const handleColDragEnd = (event: DragEndEvent) => {
    if (locked) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = columns.findIndex((c) => c.id === active.id);
    const to = columns.findIndex((c) => c.id === over.id);
    if (from === -1 || to === -1) return;
    const newCols = [...columns];
    const [moved] = newCols.splice(from, 1);
    newCols.splice(to, 0, moved);
    updateColumns(newCols);
  };

  return (
    <div className="space-y-4">
      {/* Rows */}
      {!columnsOnly && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">行（項目）</Label>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={handleRowDragEnd}
          >
            <SortableContext
              items={rows.map((r) => r.id)}
              strategy={verticalListSortingStrategy}
            >
              {rows.map((row, index) => (
                <SortableRowItem
                  key={row.id}
                  row={row}
                  index={index}
                  canDelete={rows.length > 1}
                  locked={locked}
                  onUpdate={(text) => {
                    const newRows = [...rows];
                    newRows[index] = { ...row, text };
                    updateRows(newRows);
                  }}
                  onDelete={() => updateRows(rows.filter((r) => r.id !== row.id))}
                />
              ))}
            </SortableContext>
          </DndContext>
          {!locked && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                updateRows([...rows, { id: nanoid(8), text: `行 ${rows.length + 1}` }])
              }
            >
              <Plus className="mr-1 h-3 w-3" />
              行を追加
            </Button>
          )}
        </div>
      )}

      {/* Columns */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">列（選択肢）</Label>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={handleColDragEnd}
        >
          <SortableContext
            items={columns.map((c) => c.id)}
            strategy={verticalListSortingStrategy}
          >
            {columns.map((col, index) => (
              <SortableColumnItem
                key={col.id}
                col={col}
                index={index}
                canDelete={columns.length > 1}
                showExclusive={showExclusive}
                locked={locked}
                onUpdateText={(text) => {
                  const newCols = [...columns];
                  newCols[index] = { ...col, text };
                  updateColumns(newCols);
                }}
                onUpdateValue={(value) => {
                  const newCols = [...columns];
                  newCols[index] = { ...col, value };
                  updateColumns(newCols);
                }}
                onUpdateExclusive={(pressed) => {
                  const newCols = [...columns];
                  newCols[index] = { ...col, isExclusive: pressed };
                  updateColumns(newCols);
                }}
                onDelete={() =>
                  updateColumns(columns.filter((c) => c.id !== col.id))
                }
              />
            ))}
          </SortableContext>
        </DndContext>
        {!locked && (
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              updateColumns([
                ...columns,
                {
                  id: nanoid(8),
                  text: `列 ${columns.length + 1}`,
                  value: String(columns.length + 1),
                },
              ])
            }
          >
            <Plus className="mr-1 h-3 w-3" />
            列を追加
          </Button>
        )}
        {showExclusive && (
          <p className="text-xs text-muted-foreground">
            <Ban className="mr-1 inline h-3 w-3" />
            排他: ONにすると、この列を選んだ時に他の列が解除されます
          </p>
        )}
      </div>
    </div>
  );
}

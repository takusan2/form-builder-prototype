"use client";

import type { QuestionType } from "@/lib/types/survey";
import { QUESTION_TYPE_LABELS } from "@/lib/types/survey";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus } from "lucide-react";

const QUESTION_TYPES: QuestionType[] = [
  "single_choice",
  "multiple_choice",
  "open_text",
  "number_input",
  "rating_scale",
  "matrix_single",
  "matrix_multiple",
  "ranking",
];

interface QuestionTypeSelectorProps {
  onSelect: (type: QuestionType) => void;
}

export function QuestionTypeSelector({ onSelect }: QuestionTypeSelectorProps) {
  return (
    <div className="flex justify-center py-4">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="border-dashed">
            <Plus className="mr-2 h-4 w-4" />
            設問を追加
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="w-48">
          {QUESTION_TYPES.map((type) => (
            <DropdownMenuItem key={type} onClick={() => onSelect(type)}>
              {QUESTION_TYPE_LABELS[type]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

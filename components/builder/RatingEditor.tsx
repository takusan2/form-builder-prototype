"use client";

import { useSurveyBuilderStore } from "@/lib/store/survey-builder-store";
import type { Question } from "@/lib/types/survey";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface RatingEditorProps {
  question: Question;
  pageId: string;
  locked?: boolean;
}

export function RatingEditor({ question, pageId, locked }: RatingEditorProps) {
  const { updateQuestion } = useSurveyBuilderStore();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-xs">最小値</Label>
          <Input
            type="number"
            disabled={locked}
            value={question.ratingMin ?? 1}
            onChange={(e) =>
              updateQuestion(pageId, question.id, {
                ratingMin: Number(e.target.value),
              })
            }
          />
        </div>
        <div>
          <Label className="text-xs">最大値</Label>
          <Input
            type="number"
            disabled={locked}
            value={question.ratingMax ?? 5}
            onChange={(e) =>
              updateQuestion(pageId, question.id, {
                ratingMax: Number(e.target.value),
              })
            }
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-xs">最小ラベル</Label>
          <Input
            value={question.ratingMinLabel ?? ""}
            onChange={(e) =>
              updateQuestion(pageId, question.id, {
                ratingMinLabel: e.target.value,
              })
            }
            placeholder="例：全くそう思わない"
          />
        </div>
        <div>
          <Label className="text-xs">最大ラベル</Label>
          <Input
            value={question.ratingMaxLabel ?? ""}
            onChange={(e) =>
              updateQuestion(pageId, question.id, {
                ratingMaxLabel: e.target.value,
              })
            }
            placeholder="例：非常にそう思う"
          />
        </div>
      </div>
      {/* Preview */}
      <div className="flex items-center justify-center gap-2 rounded-md border p-4">
        <span className="text-xs text-muted-foreground">{question.ratingMinLabel}</span>
        {Array.from(
          { length: (question.ratingMax ?? 5) - (question.ratingMin ?? 1) + 1 },
          (_, i) => (question.ratingMin ?? 1) + i
        ).map((val) => (
          <div
            key={val}
            className="flex h-8 w-8 items-center justify-center rounded-full border text-sm"
          >
            {val}
          </div>
        ))}
        <span className="text-xs text-muted-foreground">{question.ratingMaxLabel}</span>
      </div>
    </div>
  );
}

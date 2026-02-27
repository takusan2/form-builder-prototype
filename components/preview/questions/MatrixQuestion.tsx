"use client";

import type { Question } from "@/lib/types/survey";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface Props {
  question: Question;
  value: Record<string, string>;
  onChange: (value: Record<string, string>) => void;
}

export function MatrixQuestion({ question, value, onChange }: Props) {
  const rows = question.matrixRows || [];
  const columns = question.matrixColumns || [];

  const handleSingleChange = (rowId: string, colValue: string) => {
    onChange({ ...value, [rowId]: colValue });
  };

  const handleMultipleChange = (rowId: string, colValue: string, checked: boolean) => {
    const current = (value[rowId] || "").split(",").filter(Boolean);
    const col = columns.find((c) => c.value === colValue);

    if (col?.isExclusive && checked) {
      // 排他列を選んだ → その列だけにする
      onChange({ ...value, [rowId]: colValue });
      return;
    }

    if (checked) {
      // 非排他列を選んだ → 排他列を外す
      const exclusiveValues = columns
        .filter((c) => c.isExclusive)
        .map((c) => c.value);
      const filtered = current.filter((v) => !exclusiveValues.includes(v));
      onChange({ ...value, [rowId]: [...filtered, colValue].join(",") });
    } else {
      onChange({ ...value, [rowId]: current.filter((v) => v !== colValue).join(",") });
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="pb-2 text-left font-medium" />
            {columns.map((col) => (
              <th key={col.id} className="pb-2 text-center font-medium">
                {col.text}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t">
              <td className="py-3 pr-4 font-medium">{row.text}</td>
              {question.type === "matrix_single" ? (
                <td colSpan={columns.length} className="py-3">
                  <RadioGroup
                    value={value[row.id] || ""}
                    onValueChange={(v) => handleSingleChange(row.id, v)}
                    className="flex justify-around"
                  >
                    {columns.map((col) => (
                      <div key={col.id} className="flex justify-center">
                        <RadioGroupItem value={col.value} id={`${row.id}-${col.id}`} />
                      </div>
                    ))}
                  </RadioGroup>
                </td>
              ) : (
                columns.map((col) => {
                  const currentValues = (value[row.id] || "").split(",").filter(Boolean);
                  return (
                    <td key={col.id} className="py-3 text-center">
                      <Checkbox
                        id={`${row.id}-${col.id}`}
                        checked={currentValues.includes(col.value)}
                        onCheckedChange={(checked) =>
                          handleMultipleChange(row.id, col.value, checked === true)
                        }
                      />
                    </td>
                  );
                })
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

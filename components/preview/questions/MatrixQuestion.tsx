"use client";

import type { Question } from "@/lib/types/survey";
import { Checkbox } from "@/components/ui/checkbox";

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
      onChange({ ...value, [rowId]: colValue });
      return;
    }

    if (checked) {
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
    <div className="scrollbar-always-visible">
      <table className="table-fixed border-collapse text-sm" style={{ width: `${120 + columns.length * 80}px` }}>
        <colgroup>
          <col style={{ width: 120 }} />
          {columns.map((col) => (
            <col key={col.id} style={{ width: 80 }} />
          ))}
        </colgroup>
        <thead>
          <tr>
            <th className="pb-2 pr-4 text-left font-medium" />
            {columns.map((col) => (
              <th key={col.id} className="pb-2 text-center font-medium break-words">
                {col.text}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t">
              <td className="py-3 pr-4 font-medium">{row.text}</td>
              {question.type === "matrix_single"
                ? columns.map((col) => {
                    const selected = value[row.id] === col.value;
                    return (
                      <td key={col.id} className="py-3 text-center">
                        <div className="flex justify-center">
                          <button
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            className={`h-4 w-4 rounded-full border ${
                              selected
                                ? "border-primary bg-primary shadow-[inset_0_0_0_2px_white]"
                                : "border-input bg-background"
                            }`}
                            onClick={() => handleSingleChange(row.id, col.value)}
                          />
                        </div>
                      </td>
                    );
                  })
                : columns.map((col) => {
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
                  })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

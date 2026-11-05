"use client";

import { useState } from "react";
import { cn } from "cn";

export function UnitToggle({ initial = "lb" }: { initial?: "lb" | "kg" }) {
  const [unit, setUnit] = useState(initial);

  return (
    <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Units">
      {(
        [
          ["lb", "Pounds"],
          ["kg", "Kilograms"],
        ] as const
      ).map(([value, label]) => {
        const selected = unit === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => setUnit(value)}
            className={cn(
              "h-11 border text-sm",
              selected
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-card text-foreground hover:bg-secondary",
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

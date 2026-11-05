"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/field";
import { weighIns as sampleWeighIns } from "@/lib/content";

type Entry = (typeof sampleWeighIns)[number];

export function WeightLog({
  entries,
  unit,
}: {
  entries: Entry[];
  unit: "lb" | "kg";
}) {
  const [rows, setRows] = useState(entries);
  const [weight, setWeight] = useState("");
  const [date, setDate] = useState("Nov 5, 2026");
  const latest = rows[0];

  return (
    <div className="grid gap-8">
      <div>
        <p className="text-xs uppercase tracking-[0.16em] text-primary">
          Body weight
        </p>
        <h1 className="mt-2 font-display text-4xl tracking-tight">Weigh-ins</h1>
      </div>

      <section className="grid gap-6 border border-border bg-card p-5 sm:grid-cols-[auto_1fr] sm:items-end">
        <div>
          <p className="text-sm text-muted-foreground">Latest</p>
          <p className="font-display text-6xl tabular-nums tracking-tight">
            {latest ? latest.weight : "—"}
            <span className="ml-2 font-sans text-lg text-muted-foreground">
              {unit}
            </span>
          </p>
          {latest ? (
            <p className="text-sm text-muted-foreground">{latest.date}</p>
          ) : null}
        </div>
        <form
          className="grid gap-3 sm:justify-self-end"
          onSubmit={(event) => {
            event.preventDefault();
            const value = Number(weight);
            if (!weight || Number.isNaN(value)) return;
            setRows((current) => [
              { id: `local-${current.length + 1}`, date, weight: value },
              ...current,
            ]);
            setWeight("");
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Date" htmlFor="weigh-date">
              <Input
                id="weigh-date"
                className="h-11"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </Field>
            <Field label={`Weight (${unit})`} htmlFor="weigh-weight">
              <Input
                id="weigh-weight"
                className="h-11"
                inputMode="decimal"
                value={weight}
                onChange={(event) => setWeight(event.target.value)}
              />
            </Field>
          </div>
          <Button type="submit" className="h-11">
            Save weigh-in
          </Button>
        </form>
      </section>

      <ul className="divide-y divide-border border border-border bg-card">
        {rows.map((entry) => (
          <li
            key={entry.id}
            className="flex items-center justify-between gap-4 px-4 py-3"
          >
            <div>
              <p className="font-medium tabular-nums">
                {entry.weight} {unit}
              </p>
              <p className="text-sm text-muted-foreground">{entry.date}</p>
            </div>
            <button
              type="button"
              className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              onClick={() =>
                setRows((current) =>
                  current.filter((item) => item.id !== entry.id),
                )
              }
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

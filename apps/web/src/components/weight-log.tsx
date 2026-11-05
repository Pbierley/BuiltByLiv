"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/field";
import { deleteWeighIn, saveWeighIn } from "@/lib/actions";

export function WeightLog({
  entries,
  unit,
}: {
  entries: { id: string; date: string; weight: number }[];
  unit: "lb" | "kg";
}) {
  const router = useRouter();
  const [weight, setWeight] = useState("");
  const [error, setError] = useState("");
  const latest = entries[0];

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
          onSubmit={async (event) => {
            event.preventDefault();
            const result = await saveWeighIn(new FormData(event.currentTarget));
            if (result.error) {
              setError(result.error);
              return;
            }
            setError("");
            setWeight("");
            router.refresh();
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Date" htmlFor="weigh-date">
              <Input id="weigh-date" name="date" type="date" className="h-11" required />
            </Field>
            <Field label={`Weight (${unit})`} htmlFor="weigh-weight">
              <Input
                id="weigh-weight"
                name="weight"
                className="h-11"
                inputMode="decimal"
                value={weight}
                onChange={(event) => setWeight(event.target.value)}
                required
              />
            </Field>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="h-11">
            Save weigh-in
          </Button>
        </form>
      </section>

      <ul className="divide-y divide-border border border-border bg-card">
        {entries.map((entry) => (
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
              onClick={async () => {
                const result = await deleteWeighIn(entry.id);
                if (result.error) setError(result.error);
                else router.refresh();
              }}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

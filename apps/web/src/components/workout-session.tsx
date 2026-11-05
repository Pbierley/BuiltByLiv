"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Pause, Play, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  formatDuration,
  getProgram,
  prescriptionLabel,
  restLabel,
  trackingLabel,
  type Exercise,
  type LoggedSet,
  type Workout,
} from "@/lib/content";
import { cn } from "cn";
import { saveSession } from "@/lib/actions";

export function WorkoutSession({
  workout,
  unit,
}: {
  workout: Workout;
  unit: "lb" | "kg";
}) {
  const program = getProgram(workout.programId);
  const [exerciseId, setExerciseId] = useState(workout.exercises[0]?.id ?? "");
  const [setsByExercise, setSetsByExercise] = useState(() =>
    Object.fromEntries(
      workout.exercises.map((exercise) => [
        exercise.id,
        padSets(exercise),
      ]),
    ),
  );
  const [runningKey, setRunningKey] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const exercise =
    workout.exercises.find((item) => item.id === exerciseId) ??
    workout.exercises[0];

  useEffect(() => {
    if (!runningKey) return;
    const timer = window.setInterval(() => {
      const [id, indexText] = runningKey.split(":");
      const index = Number(indexText);
      setSetsByExercise((current) => ({
        ...current,
        [id]: current[id].map((set, setIndex) =>
          setIndex === index
            ? { ...set, durationSeconds: (set.durationSeconds ?? 0) + 1 }
            : set,
        ),
      }));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [runningKey]);

  if (!exercise) return null;

  const rows = setsByExercise[exercise.id] ?? [];

  function loggedPayload() {
    return Object.entries(setsByExercise).flatMap(([exerciseId, rows]) =>
      rows.map((set, index) => ({
        exerciseId,
        index,
        reps: set.reps,
        weight: set.weight,
        durationSeconds: set.durationSeconds,
        skipped: set.skipped,
      })),
    );
  }

  async function persist(complete: boolean) {
    const result = await saveSession({
      workoutId: workout.id,
      complete,
      sets: loggedPayload(),
    });
    if (result.error) setError(result.error);
    return !result.error;
  }

  function updateSet(index: number, patch: Partial<LoggedSet>) {
    setSetsByExercise((current) => ({
      ...current,
      [exercise.id]: current[exercise.id].map((set, setIndex) =>
        setIndex === index ? { ...set, ...patch } : set,
      ),
    }));
  }

  return (
    <div className="grid min-w-0 gap-6">
      <div>
        <Link
          href={program ? `/app/programs/${program.id}` : "/app/programs"}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" aria-hidden />
          {program?.title ?? "Programs"}
        </Link>
        <h1 className="mt-2 font-display text-4xl tracking-tight">
          {workout.title}
        </h1>
        <p className="mt-2 max-w-xl text-muted-foreground">{workout.summary}</p>
      </div>

      <div className="flex min-w-0 gap-2 overflow-x-auto pb-1">
        {workout.exercises.map((item, index) => {
          const selected = item.id === exercise.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={selected}
              onClick={() => {
                void persist(false);
                setRunningKey(null);
                setPlaying(false);
                setExerciseId(item.id);
              }}
              className={cn(
                "shrink-0 border px-3 py-2 text-left text-sm",
                selected
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-card hover:bg-secondary",
              )}
            >
              <span className="block text-[11px] uppercase tracking-[0.14em] opacity-70">
                {index + 1}
              </span>
              {item.name}
            </button>
          );
        })}
      </div>

      <div className="grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <section className="grid min-w-0 gap-4">
          {exercise.hasVideo ? (
            <video
              key={exercise.id}
              className="aspect-video w-full bg-ink"
              controls
              playsInline
              src={`/api/videos/${exercise.id}`}
            />
          ) : null}
          <div className="overflow-hidden border border-ink bg-ink text-background">
            <div className="flex aspect-video flex-col justify-between p-5">
              <p className="text-xs uppercase tracking-[0.16em] text-background/70">
                Demo
              </p>
              <div className="grid justify-items-center gap-3">
                <button
                  type="button"
                  onClick={() => setPlaying((value) => !value)}
                  className="grid size-16 place-items-center bg-primary text-primary-foreground"
                  aria-label={playing ? "Pause demo" : "Play demo"}
                >
                  {playing ? (
                    <Pause className="size-6" aria-hidden />
                  ) : (
                    <Play className="size-6 translate-x-0.5" aria-hidden />
                  )}
                </button>
                <p className="font-display text-2xl">{exercise.name}</p>
              </div>
              <label className="grid gap-2 text-xs text-background/70">
                Playback
                <input
                  type="range"
                  defaultValue={playing ? 35 : 0}
                  aria-label="Playback position"
                  className="accent-primary"
                />
              </label>
            </div>
          </div>
          <div className="grid gap-2 border border-border bg-card p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-primary">
              How to perform it
            </p>
            <p className="leading-7">{exercise.coaching}</p>
            {exercise.cue ? (
              <p className="text-sm text-muted-foreground">
                Note from Liv: {exercise.cue}
              </p>
            ) : null}
          </div>
        </section>

        <section className="grid min-w-0 gap-4 border border-border bg-card p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-3xl tracking-tight">
                {exercise.name}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {trackingLabel(exercise.trackingType)} ·{" "}
                {prescriptionLabel(exercise)} · {restLabel(exercise.restSeconds)}
              </p>
            </div>
          </div>

          <ol className="grid gap-3">
            {rows.map((set, index) => {
              const timerKey = `${exercise.id}:${index}`;
              const running = runningKey === timerKey;
              return (
                <li
                  key={timerKey}
                  className={cn(
                    "grid gap-3 border border-border p-3",
                    set.skipped && "opacity-50",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Set {index + 1}</p>
                    <button
                      type="button"
                      className="text-sm text-muted-foreground underline-offset-4 hover:underline"
                      onClick={() => {
                        if (running) setRunningKey(null);
                        updateSet(index, { skipped: !set.skipped });
                      }}
                    >
                      {set.skipped ? "Undo skip" : "Skip"}
                    </button>
                  </div>
                  {exercise.trackingType === "duration" ? (
                    <div className="flex flex-wrap items-end gap-3">
                      <p className="font-display text-4xl leading-none tabular-nums">
                        {formatDuration(set.durationSeconds ?? 0)}
                      </p>
                      <Button
                        type="button"
                        variant={running ? "secondary" : "default"}
                        onClick={() =>
                          setRunningKey(running ? null : timerKey)
                        }
                      >
                        {running ? "Stop" : "Start"}
                      </Button>
                      <label className="grid gap-1 text-xs text-muted-foreground">
                        Seconds
                        <Input
                          inputMode="numeric"
                          className="h-11 w-24"
                          value={set.durationSeconds ?? ""}
                          onChange={(event) =>
                            updateSet(index, {
                              durationSeconds:
                                event.target.value === ""
                                  ? undefined
                                  : Number(event.target.value),
                            })
                          }
                        />
                      </label>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {exercise.trackingType === "weight_reps" ? (
                        <SetField
                          label={unit}
                          value={set.weight}
                          onChange={(weight) => updateSet(index, { weight })}
                        />
                      ) : null}
                      <SetField
                        label="Reps"
                        value={set.reps}
                        onChange={(reps) => updateSet(index, { reps })}
                        className={
                          exercise.trackingType === "reps" ? "col-span-2" : undefined
                        }
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ol>

          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setSetsByExercise((current) => ({
                ...current,
                [exercise.id]: [...current[exercise.id], {}],
              }))
            }
          >
            <Plus className="size-4" aria-hidden />
            Add a set
          </Button>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button
            className="h-11"
            type="button"
            onClick={async () => {
              const saved = await persist(true);
              if (saved) router.push("/app/history");
            }}
          >
            Mark workout complete
          </Button>
        </section>
      </div>
    </div>
  );
}

function SetField({
  label,
  value,
  onChange,
  className,
}: {
  label: string;
  value?: number;
  onChange: (value: number | undefined) => void;
  className?: string;
}) {
  return (
    <label className={cn("grid gap-1 text-xs text-muted-foreground", className)}>
      {label}
      <Input
        inputMode="decimal"
        className="h-11 text-base"
        value={value ?? ""}
        onChange={(event) =>
          onChange(
            event.target.value === "" ? undefined : Number(event.target.value),
          )
        }
      />
    </label>
  );
}

function padSets(exercise: Exercise): LoggedSet[] {
  const rows = exercise.logged.map((set) => ({ ...set }));
  while (rows.length < exercise.sets) rows.push({});
  return rows;
}

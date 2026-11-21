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
      workout.exercises.map((exercise) => [exercise.id, partsFor(exercise)]),
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
      const [id, partText, indexText] = runningKey.split(":");
      const part = Number(partText);
      const index = Number(indexText);
      setSetsByExercise((current) => ({
        ...current,
        [id]: current[id].map((rows, partIndex) =>
          partIndex === part
            ? rows.map((set, setIndex) =>
                setIndex === index
                  ? { ...set, durationSeconds: (set.durationSeconds ?? 0) + 1 }
                  : set,
              )
            : rows,
        ),
      }));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [runningKey]);

  if (!exercise) return null;

  const parts = setsByExercise[exercise.id] ?? [];
  const circuit = (exercise.movements?.length ?? 0) >= 2;

  function loggedPayload() {
    return Object.entries(setsByExercise).flatMap(([id, exerciseParts]) =>
      exerciseParts.flatMap((rows, part) =>
        rows.map((set, index) => ({
          exerciseId: id,
          index,
          movement: exerciseParts.length > 1 ? part + 1 : undefined,
          reps: set.reps,
          weight: set.weight,
          durationSeconds: set.durationSeconds,
          skipped: set.skipped,
        })),
      ),
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

  function updateSet(part: number, index: number, patch: Partial<LoggedSet>) {
    setSetsByExercise((current) => ({
      ...current,
      [exercise.id]: current[exercise.id].map((rows, partIndex) =>
        partIndex === part
          ? rows.map((set, setIndex) =>
              setIndex === index ? { ...set, ...patch } : set,
            )
          : rows,
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
        {workout.phaseTitle ? (
          <p className="mt-2 text-sm text-primary">
            {workout.phaseTitle}
            {workout.phaseStartsWeek
              ? ` · Weeks ${workout.phaseStartsWeek}–${workout.phaseStartsWeek + 2}`
              : ""}
          </p>
        ) : null}
      </div>

      {workout.warmup ? (
        <section className="grid max-w-xl gap-2 border border-border bg-card p-4 sm:p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-primary">Warmup</p>
          <p className="whitespace-pre-wrap leading-7">{workout.warmup}</p>
        </section>
      ) : null}

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
          <div className="overflow-hidden border border-border bg-card text-foreground">
            <div className="flex aspect-video flex-col justify-between p-5">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
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
              <label className="grid gap-2 text-xs text-muted-foreground">
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
                {circuit ? "Circuit" : trackingLabel(exercise.trackingType)} ·{" "}
                {prescriptionLabel(exercise)} · {restLabel(exercise.restSeconds)}
              </p>
            </div>
          </div>

          <ol className="grid gap-3">
            {(parts[0] ?? []).map((set, index) => {
              const skipped = circuit
                ? parts.every((rows) => rows[index]?.skipped)
                : set.skipped;
              return (
                <li
                  key={`${exercise.id}:${index}`}
                  className={cn(
                    "grid gap-3 border border-border p-3",
                    skipped && "opacity-50",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">
                      {circuit ? `Round ${index + 1}` : `Set ${index + 1}`}
                    </p>
                    <button
                      type="button"
                      className="text-sm text-muted-foreground underline-offset-4 hover:underline"
                      onClick={() => {
                        setRunningKey(null);
                        if (circuit) {
                          parts.forEach((_, part) =>
                            updateSet(part, index, { skipped: !skipped }),
                          );
                          return;
                        }
                        updateSet(0, index, { skipped: !set.skipped });
                      }}
                    >
                      {skipped ? "Undo skip" : "Skip"}
                    </button>
                  </div>
                  {circuit
                    ? exercise.movements?.map((movement, part) => {
                        const logged = parts[part]?.[index] ?? {};
                        const timerKey = `${exercise.id}:${part}:${index}`;
                        const running = runningKey === timerKey;
                        return (
                          <div key={movement.position} className="grid gap-2">
                            <p className="text-sm">
                              {movement.name}
                              <span className="text-muted-foreground">
                                {" "}
                                · {trackingLabel(movement.trackingType)} ·{" "}
                                {movement.trackingType === "duration"
                                  ? formatDuration(movement.targetDurationSeconds ?? 0)
                                  : movement.targetRepsLabel || movement.targetReps}
                              </span>
                            </p>
                            <MovementLog
                              trackingType={movement.trackingType}
                              unit={unit}
                              set={logged}
                              running={running}
                              onStart={() => setRunningKey(running ? null : timerKey)}
                              onChange={(patch) => updateSet(part, index, patch)}
                            />
                          </div>
                        );
                      })
                    : (
                      <MovementLog
                        trackingType={exercise.trackingType}
                        unit={unit}
                        set={set}
                        running={runningKey === `${exercise.id}:0:${index}`}
                        onStart={() => {
                          const timerKey = `${exercise.id}:0:${index}`;
                          setRunningKey(runningKey === timerKey ? null : timerKey);
                        }}
                        onChange={(patch) => updateSet(0, index, patch)}
                      />
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
                [exercise.id]: current[exercise.id].map((rows) => [...rows, {}]),
              }))
            }
          >
            <Plus className="size-4" aria-hidden />
            {circuit ? "Add a round" : "Add a set"}
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

function MovementLog({
  trackingType,
  unit,
  set,
  running,
  onStart,
  onChange,
}: {
  trackingType: Exercise["trackingType"];
  unit: "lb" | "kg";
  set: LoggedSet;
  running: boolean;
  onStart: () => void;
  onChange: (patch: Partial<LoggedSet>) => void;
}) {
  if (trackingType === "duration") {
    return (
      <div className="flex flex-wrap items-end gap-3">
        <p className="font-display text-4xl leading-none tabular-nums">
          {formatDuration(set.durationSeconds ?? 0)}
        </p>
        <Button
          type="button"
          variant={running ? "secondary" : "default"}
          onClick={onStart}
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
              onChange({
                durationSeconds:
                  event.target.value === "" ? undefined : Number(event.target.value),
              })
            }
          />
        </label>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-3">
      {trackingType === "weight_reps" ? (
        <SetField
          label={unit}
          value={set.weight}
          onChange={(weight) => onChange({ weight })}
        />
      ) : null}
      <SetField
        label="Reps"
        value={set.reps}
        onChange={(reps) => onChange({ reps })}
        className={trackingType === "reps" ? "col-span-2" : undefined}
      />
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

function partsFor(exercise: Exercise): LoggedSet[][] {
  const movements = exercise.movements ?? [];
  if (movements.length < 2) return [padSets(exercise)];
  return movements.map((movement) => {
    const rows: LoggedSet[] = [];
    for (const set of exercise.allLogs ?? []) {
      if ((set.movement ?? 1) !== movement.position) continue;
      rows[set.setIndex ?? rows.length] = set;
    }
    const count = Math.max(exercise.sets, rows.length);
    return Array.from({ length: count }, (_, index) => rows[index] ?? {});
  });
}

function padSets(exercise: Exercise): LoggedSet[] {
  const rows = exercise.logged.map((set) => ({ ...set }));
  while (rows.length < exercise.sets) rows.push({});
  return rows;
}

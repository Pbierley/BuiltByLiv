"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/field";
import { VideoUpload } from "@/components/video-upload";
import {
  programs,
  trackingLabel,
  type Exercise,
  type TrackingType,
  type Workout,
} from "@/lib/content";
import { cn } from "cn";

export type VideoClip = { name: string; url: string };

type DraftExercise = {
  key: string;
  name: string;
  coaching: string;
  cue: string;
  trackingType: TrackingType;
  sets: string;
  targetReps: string;
  targetDuration: string;
  restSeconds: string;
  videoName: string;
  videoUrl: string;
};

const trackingTypes: TrackingType[] = ["weight_reps", "reps", "duration"];

export function WorkoutComposer({
  onCancel,
  onCreate,
}: {
  onCancel: () => void;
  onCreate: (workout: Workout, videos: Record<string, VideoClip>) => void;
}) {
  const nextKey = useRef(1);
  const serial = useRef(0);
  const [programId, setProgramId] = useState(programs[0].id);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [exercises, setExercises] = useState<DraftExercise[]>([
    blankExercise("ex-1"),
  ]);
  const [error, setError] = useState("");

  function updateExercise(key: string, patch: Partial<DraftExercise>) {
    setExercises((current) =>
      current.map((exercise) =>
        exercise.key === key ? { ...exercise, ...patch } : exercise,
      ),
    );
    setError("");
  }

  function attachVideo(key: string, file: File | null) {
    setExercises((current) =>
      current.map((exercise) => {
        if (exercise.key !== key) return exercise;
        if (exercise.videoUrl) URL.revokeObjectURL(exercise.videoUrl);
        if (!file) return { ...exercise, videoName: "", videoUrl: "" };
        return {
          ...exercise,
          videoName: file.name,
          videoUrl: URL.createObjectURL(file),
        };
      }),
    );
  }

  return (
    <form
      className="grid min-w-0 gap-5 border border-border bg-card p-4 sm:p-5"
      onSubmit={(event) => {
        event.preventDefault();
        const workoutTitle = title.trim();
        if (!workoutTitle) {
          setError("Name the workout.");
          return;
        }
        if (exercises.some((exercise) => !exercise.name.trim())) {
          setError("Every exercise needs a name.");
          return;
        }

        serial.current += 1;
        const videos: Record<string, VideoClip> = {};
        const built: Exercise[] = exercises.map((exercise, index) => {
          const id = `custom-${serial.current}-ex-${index + 1}`;
          if (exercise.videoUrl) {
            videos[id] = { name: exercise.videoName, url: exercise.videoUrl };
          }
          const sets = numberOr(exercise.sets, 3);
          return {
            id,
            name: exercise.name.trim(),
            coaching: exercise.coaching.trim(),
            cue: exercise.cue.trim() || undefined,
            trackingType: exercise.trackingType,
            sets,
            targetReps:
              exercise.trackingType === "duration"
                ? undefined
                : numberOr(exercise.targetReps, 8),
            targetDurationSeconds:
              exercise.trackingType === "duration"
                ? numberOr(exercise.targetDuration, 45)
                : undefined,
            restSeconds: numberOr(exercise.restSeconds, 60),
            logged: [],
          };
        });

        onCreate(
          {
            id: `custom-${serial.current}`,
            programId,
            title: workoutTitle,
            summary: summary.trim() || "Added by Liv.",
            exercises: built,
          },
          videos,
        );
      }}
    >
      <div>
        <p className="text-xs uppercase tracking-[0.16em] text-primary">
          New workout
        </p>
        <h2 className="mt-1 font-display text-3xl tracking-tight">
          Add it to a program
        </h2>
      </div>

      <fieldset className="grid gap-2">
        <legend className="text-sm font-medium">Program</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {programs.map((program) => (
            <button
              key={program.id}
              type="button"
              aria-pressed={programId === program.id}
              onClick={() => setProgramId(program.id)}
              className={cn(
                "h-11 border px-3 text-sm",
                programId === program.id
                  ? "border-foreground bg-foreground text-background"
                  : "border-border",
              )}
            >
              {program.title}
            </button>
          ))}
        </div>
      </fieldset>

      <Field label="Workout name" htmlFor="workout-title">
        <Input
          id="workout-title"
          className="h-11"
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            setError("");
          }}
          placeholder="Lower C"
        />
      </Field>
      <Field label="Summary" htmlFor="workout-summary">
        <Input
          id="workout-summary"
          className="h-11"
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
          placeholder="What this day is for"
        />
      </Field>

      <div className="grid gap-4">
        {exercises.map((exercise, index) => (
          <div
            key={exercise.key}
            className="grid gap-4 border border-border p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium">Exercise {index + 1}</p>
              {exercises.length > 1 ? (
                <button
                  type="button"
                  className="text-sm text-muted-foreground underline-offset-4 hover:underline"
                  onClick={() => {
                    if (exercise.videoUrl) URL.revokeObjectURL(exercise.videoUrl);
                    setExercises((current) =>
                      current.filter((item) => item.key !== exercise.key),
                    );
                  }}
                >
                  Remove
                </button>
              ) : null}
            </div>
            <Field label="Name" htmlFor={`${exercise.key}-name`}>
              <Input
                id={`${exercise.key}-name`}
                className="h-11"
                value={exercise.name}
                onChange={(event) =>
                  updateExercise(exercise.key, { name: event.target.value })
                }
              />
            </Field>
            <Field label="Coaching notes" htmlFor={`${exercise.key}-notes`}>
              <Textarea
                id={`${exercise.key}-notes`}
                rows={3}
                value={exercise.coaching}
                onChange={(event) =>
                  updateExercise(exercise.key, { coaching: event.target.value })
                }
              />
            </Field>
            <Field label="Note for this workout" htmlFor={`${exercise.key}-cue`}>
              <Input
                id={`${exercise.key}-cue`}
                className="h-11"
                value={exercise.cue}
                placeholder="Optional"
                onChange={(event) =>
                  updateExercise(exercise.key, { cue: event.target.value })
                }
              />
            </Field>
            <div className="grid gap-2 sm:grid-cols-3">
              {trackingTypes.map((type) => (
                <button
                  key={type}
                  type="button"
                  aria-pressed={exercise.trackingType === type}
                  onClick={() =>
                    updateExercise(exercise.key, { trackingType: type })
                  }
                  className={cn(
                    "h-11 border text-sm",
                    exercise.trackingType === type
                      ? "border-foreground bg-foreground text-background"
                      : "border-border",
                  )}
                >
                  {trackingLabel(type)}
                </button>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Sets" htmlFor={`${exercise.key}-sets`}>
                <Input
                  id={`${exercise.key}-sets`}
                  className="h-11"
                  inputMode="numeric"
                  value={exercise.sets}
                  onChange={(event) =>
                    updateExercise(exercise.key, { sets: event.target.value })
                  }
                />
              </Field>
              {exercise.trackingType === "duration" ? (
                <Field label="Target seconds" htmlFor={`${exercise.key}-duration`}>
                  <Input
                    id={`${exercise.key}-duration`}
                    className="h-11"
                    inputMode="numeric"
                    value={exercise.targetDuration}
                    onChange={(event) =>
                      updateExercise(exercise.key, {
                        targetDuration: event.target.value,
                      })
                    }
                  />
                </Field>
              ) : (
                <Field label="Target reps" htmlFor={`${exercise.key}-reps`}>
                  <Input
                    id={`${exercise.key}-reps`}
                    className="h-11"
                    inputMode="numeric"
                    value={exercise.targetReps}
                    onChange={(event) =>
                      updateExercise(exercise.key, {
                        targetReps: event.target.value,
                      })
                    }
                  />
                </Field>
              )}
              <Field label="Rest (seconds)" htmlFor={`${exercise.key}-rest`}>
                <Input
                  id={`${exercise.key}-rest`}
                  className="h-11"
                  inputMode="numeric"
                  value={exercise.restSeconds}
                  onChange={(event) =>
                    updateExercise(exercise.key, {
                      restSeconds: event.target.value,
                    })
                  }
                />
              </Field>
            </div>
            <VideoUpload
              fileName={exercise.videoName}
              previewUrl={exercise.videoUrl}
              onFile={(file) => attachVideo(exercise.key, file)}
            />
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={() => {
          nextKey.current += 1;
          setExercises((current) => [
            ...current,
            blankExercise(`ex-${nextKey.current}`),
          ]);
        }}
      >
        Add exercise
      </Button>

      {error ? <p className="text-sm text-primary">{error}</p> : null}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" className="h-11">
          Create workout
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function blankExercise(key: string): DraftExercise {
  return {
    key,
    name: "",
    coaching: "",
    cue: "",
    trackingType: "weight_reps",
    sets: "3",
    targetReps: "8",
    targetDuration: "45",
    restSeconds: "90",
    videoName: "",
    videoUrl: "",
  };
}

function numberOr(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

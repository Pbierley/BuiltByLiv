"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Field } from "@/components/field";
import { VideoUpload } from "@/components/video-upload";
import {
  WorkoutComposer,
  type VideoClip,
} from "@/components/workout-composer";
import { trackingLabel, type TrackingType, type Workout } from "@/lib/content";
import { createWorkout, updateExercise, uploadExerciseVideo } from "@/lib/actions";
import { cn } from "cn";

const trackingTypes: TrackingType[] = ["weight_reps", "reps", "duration"];

export function AdminEditor({
  programs,
  workouts,
}: {
  programs: { id: string; title: string }[];
  workouts: Workout[];
}) {
  const router = useRouter();
  const library = workouts;
  const [programId, setProgramId] = useState(programs[0]?.id ?? "");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [videos, setVideos] = useState<Record<string, VideoClip>>({});
  const programWorkouts = library.filter(
    (workout) => workout.programId === programId,
  );
  const [workoutId, setWorkoutId] = useState(programWorkouts[0]?.id ?? "");
  const workout =
    programWorkouts.find((item) => item.id === workoutId) ?? programWorkouts[0];
  const [exerciseId, setExerciseId] = useState(workout?.exercises[0]?.id ?? "");
  const exercise =
    workout?.exercises.find((item) => item.id === exerciseId) ??
    workout?.exercises[0];
  const [trackingType, setTrackingType] = useState<TrackingType>(
    exercise?.trackingType ?? "weight_reps",
  );
  const [published, setPublished] = useState(true);
  const [saved, setSaved] = useState(false);
  const clip = exercise ? videos[exercise.id] : undefined;

  function chooseProgram(nextProgramId: string) {
    const nextWorkouts = library.filter(
      (item) => item.programId === nextProgramId,
    );
    setProgramId(nextProgramId);
    setCreating(false);
    const nextExercise = nextWorkouts[0]?.exercises[0];
    if (!nextWorkouts[0] || !nextExercise) return;
    setWorkoutId(nextWorkouts[0].id);
    setExerciseId(nextExercise.id);
    setTrackingType(nextExercise.trackingType);
    setSaved(false);
  }

  function chooseWorkout(nextWorkoutId: string) {
    const next = library.find((item) => item.id === nextWorkoutId);
    if (!next) return;
    setCreating(false);
    setWorkoutId(next.id);
    const nextExercise = next.exercises[0];
    if (!nextExercise) return;
    setExerciseId(nextExercise.id);
    setTrackingType(nextExercise.trackingType);
    setSaved(false);
  }

  function chooseExercise(nextExerciseId: string) {
    const next = workout?.exercises.find((item) => item.id === nextExerciseId);
    if (!next) return;
    setExerciseId(next.id);
    setTrackingType(next.trackingType);
    setSaved(false);
  }

  function attachVideo(file: File | null) {
    if (!exercise) return;
    const exerciseId = exercise.id;
    setVideos((current) => {
      const previous = current[exerciseId];
      if (previous?.url) URL.revokeObjectURL(previous.url);
      if (!file) {
        const next = { ...current };
        delete next[exerciseId];
        return next;
      }
      return {
        ...current,
        [exerciseId]: { name: file.name, url: URL.createObjectURL(file), file },
      };
    });
    setSaved(false);
    if (!file) return;
    const body = new FormData();
    body.set("file", file);
    void uploadExerciseVideo(exerciseId, body).then((result) => {
      setError(result.error ?? "");
      if (!result.error) router.refresh();
    });
  }

  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
      <aside className="grid content-start gap-6">
        <div className="grid gap-2">
          <p className="text-xs uppercase tracking-[0.16em] text-primary">
            Programs
          </p>
          {programs.map((program) => {
            const count = library.filter(
              (item) => item.programId === program.id,
            ).length;
            return (
              <button
                key={program.id}
                type="button"
                onClick={() => chooseProgram(program.id)}
                className={cn(
                  "border px-3 py-3 text-left",
                  program.id === programId
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-card",
                )}
              >
                <span className="block font-medium">{program.title}</span>
                <span className="text-sm opacity-70">
                  {count} {count === 1 ? "workout" : "workouts"}
                </span>
              </button>
            );
          })}
        </div>
        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs uppercase tracking-[0.16em] text-primary">
              Workouts
            </p>
            <button
              type="button"
              className="text-sm text-primary"
              onClick={() => setCreating(true)}
            >
              New
            </button>
          </div>
          {programWorkouts.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => chooseWorkout(item.id)}
              className={cn(
                "border px-3 py-2 text-left text-sm",
                item.id === workout?.id
                  ? "border-foreground bg-secondary"
                  : "border-border bg-card",
              )}
            >
              <span>{item.title}</span>
            </button>
          ))}
        </div>
      </aside>

      {creating ? (
        <WorkoutComposer
          programs={programs}
          onCancel={() => setCreating(false)}
          onCreate={async (created, clips) => {
            const result = await createWorkout({
              programId: created.programId,
              title: created.title,
              summary: created.summary,
              exercises: created.exercises.map((item) => ({
                name: item.name,
                coaching: item.coaching,
                cue: item.cue,
                trackingType: item.trackingType,
                sets: item.sets,
                targetReps: item.targetReps,
                targetDurationSeconds: item.targetDurationSeconds,
                restSeconds: item.restSeconds,
              })),
            });
            if (result.error || !result.exerciseIds) {
              setError(result.error ?? "The workout could not be created.");
              return;
            }
            for (const [index, exerciseId] of result.exerciseIds.entries()) {
              const file = clips[created.exercises[index]?.id ?? ""]?.file;
              if (!file) continue;
              const body = new FormData();
              body.set("file", file);
              const uploaded = await uploadExerciseVideo(exerciseId, body);
              if (uploaded.error) setError(uploaded.error);
            }
            setCreating(false);
            setSaved(true);
            router.refresh();
          }}
        />
      ) : workout && exercise ? (
      <form
        className="grid min-w-0 gap-5 border border-border bg-card p-4 sm:p-5"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!exercise) return;
          const form = new FormData(event.currentTarget);
          const result = await updateExercise({
            exerciseId: exercise.id,
            name: form.get("name"),
            coaching: form.get("coaching"),
            cue: String(form.get("cue") ?? ""),
            trackingType,
            sets: Number(form.get("sets")),
            targetReps: Number(form.get("reps") || exercise.targetReps || 8),
            targetDurationSeconds: Number(
              form.get("duration") || exercise.targetDurationSeconds || 45,
            ),
            restSeconds: Number(form.get("rest")),
            published,
          });
          setError(result.error ?? "");
          setSaved(!result.error);
          if (!result.error) router.refresh();
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-3xl tracking-tight">
              {exercise.name}
            </h2>
            <p className="text-sm text-muted-foreground">{workout.title}</p>
          </div>
          <Badge variant={published ? "default" : "outline"}>
            {published ? "Published" : "Hidden"}
          </Badge>
        </div>

        <div className="flex flex-wrap gap-2">
          {workout.exercises.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => chooseExercise(item.id)}
              className={cn(
                "border px-3 py-1.5 text-sm",
                item.id === exercise.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border",
              )}
            >
              {item.name}
            </button>
          ))}
        </div>

        <Field label="Exercise name" htmlFor="exercise-name">
          <Input
            id="exercise-name"
            className="h-11"
            name="name"
            defaultValue={exercise.name}
            key={`name-${exercise.id}`}
          />
        </Field>
        <Field label="Coaching notes" htmlFor="exercise-notes">
          <Textarea
            id="exercise-notes"
            rows={4}
            name="coaching"
            defaultValue={exercise.coaching}
            key={`notes-${exercise.id}`}
          />
        </Field>
        <Field label="Note for this workout" htmlFor="exercise-cue">
          <Input
            id="exercise-cue"
            className="h-11"
            placeholder="Optional, such as slow eccentric"
            name="cue"
            defaultValue={exercise.cue ?? ""}
            key={`cue-${exercise.id}`}
          />
        </Field>

        <fieldset className="grid gap-2">
          <legend className="text-sm font-medium">Tracking</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {trackingTypes.map((type) => (
              <button
                key={type}
                type="button"
                aria-pressed={trackingType === type}
                onClick={() => {
                  setTrackingType(type);
                  setSaved(false);
                }}
                className={cn(
                  "h-11 border text-sm",
                  trackingType === type
                    ? "border-foreground bg-foreground text-background"
                    : "border-border",
                )}
              >
                {trackingLabel(type)}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Sets" htmlFor="sets">
            <Input
              id="sets"
              className="h-11"
              inputMode="numeric"
              name="sets"
              defaultValue={exercise.sets}
              key={`sets-${exercise.id}`}
            />
          </Field>
          {trackingType === "duration" ? (
            <Field label="Target seconds" htmlFor="target-duration">
              <Input
                id="target-duration"
                className="h-11"
                inputMode="numeric"
                name="duration"
                defaultValue={exercise.targetDurationSeconds ?? 45}
                key={`duration-${exercise.id}`}
              />
            </Field>
          ) : (
            <Field label="Target reps" htmlFor="target-reps">
              <Input
                id="target-reps"
                className="h-11"
                inputMode="numeric"
                name="reps"
                defaultValue={exercise.targetReps ?? 8}
                key={`reps-${exercise.id}`}
              />
            </Field>
          )}
          <Field label="Rest (seconds)" htmlFor="rest">
            <Input
              id="rest"
              className="h-11"
              inputMode="numeric"
              name="rest"
              defaultValue={exercise.restSeconds}
              key={`rest-${exercise.id}`}
            />
          </Field>
        </div>

        <div className="grid gap-2">
          <p className="text-sm font-medium">Demo video</p>
          <VideoUpload
            fileName={clip?.name ?? `${exercise.id}-demo.mp4`}
            previewUrl={clip?.url ?? ""}
            onFile={attachVideo}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setPublished((value) => !value);
              setSaved(false);
            }}
          >
            {published ? "Unpublish" : "Publish"}
          </Button>
          <Button type="submit" className="h-11">
            Save exercise
          </Button>
          <Button variant="ghost" asChild>
            <Link href={`/app/workouts/${workout.id}`}>Preview member view</Link>
          </Button>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {saved ? (
            <p className="text-sm text-muted-foreground">Saved.</p>
          ) : null}
        </div>
      </form>
      ) : (
        <p className="text-sm text-muted-foreground">No workouts in this program yet.</p>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
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
import {
  programs,
  trackingLabel,
  workouts,
  type TrackingType,
  type Workout,
} from "@/lib/content";
import { cn } from "cn";

const trackingTypes: TrackingType[] = ["weight_reps", "reps", "duration"];

const seedIds = new Set(workouts.map((workout) => workout.id));

export function AdminEditor() {
  const [library, setLibrary] = useState<Workout[]>(workouts);
  const [programId, setProgramId] = useState(programs[0].id);
  const [creating, setCreating] = useState(false);
  const [videos, setVideos] = useState<Record<string, VideoClip>>({});
  const programWorkouts = library.filter(
    (workout) => workout.programId === programId,
  );
  const [workoutId, setWorkoutId] = useState(programWorkouts[0].id);
  const workout =
    programWorkouts.find((item) => item.id === workoutId) ?? programWorkouts[0];
  const [exerciseId, setExerciseId] = useState(workout.exercises[0].id);
  const exercise =
    workout.exercises.find((item) => item.id === exerciseId) ??
    workout.exercises[0];
  const [trackingType, setTrackingType] = useState<TrackingType>(
    exercise.trackingType,
  );
  const [published, setPublished] = useState(true);
  const [saved, setSaved] = useState(false);
  const clip = videos[exercise.id];

  function chooseProgram(nextProgramId: string) {
    const nextWorkouts = library.filter(
      (item) => item.programId === nextProgramId,
    );
    setProgramId(nextProgramId);
    setCreating(false);
    if (!nextWorkouts[0]) return;
    setWorkoutId(nextWorkouts[0].id);
    setExerciseId(nextWorkouts[0].exercises[0].id);
    setTrackingType(nextWorkouts[0].exercises[0].trackingType);
    setSaved(false);
  }

  function chooseWorkout(nextWorkoutId: string) {
    const next = library.find((item) => item.id === nextWorkoutId);
    if (!next) return;
    setCreating(false);
    setWorkoutId(next.id);
    setExerciseId(next.exercises[0].id);
    setTrackingType(next.exercises[0].trackingType);
    setSaved(false);
  }

  function chooseExercise(nextExerciseId: string) {
    const next = workout.exercises.find((item) => item.id === nextExerciseId);
    if (!next) return;
    setExerciseId(next.id);
    setTrackingType(next.trackingType);
    setSaved(false);
  }

  function attachVideo(file: File | null) {
    setVideos((current) => {
      const previous = current[exercise.id];
      if (previous?.url) URL.revokeObjectURL(previous.url);
      if (!file) {
        const next = { ...current };
        delete next[exercise.id];
        return next;
      }
      return {
        ...current,
        [exercise.id]: { name: file.name, url: URL.createObjectURL(file) },
      };
    });
    setSaved(false);
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
                item.id === workout.id
                  ? "border-foreground bg-secondary"
                  : "border-border bg-card",
              )}
            >
              <span className="flex items-center justify-between gap-2">
                <span>{item.title}</span>
                {seedIds.has(item.id) ? null : (
                  <span className="text-xs uppercase tracking-[0.12em]">
                    New
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      </aside>

      {creating ? (
        <WorkoutComposer
          onCancel={() => setCreating(false)}
          onCreate={(created, clips) => {
            setLibrary((current) => [created, ...current]);
            setProgramId(created.programId);
            setWorkoutId(created.id);
            setExerciseId(created.exercises[0].id);
            setTrackingType(created.exercises[0].trackingType);
            setVideos((current) => ({ ...current, ...clips }));
            setCreating(false);
            setSaved(true);
          }}
        />
      ) : (
      <form
        className="grid min-w-0 gap-5 border border-border bg-card p-4 sm:p-5"
        onSubmit={(event) => {
          event.preventDefault();
          setSaved(true);
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
            defaultValue={exercise.name}
            key={`name-${exercise.id}`}
          />
        </Field>
        <Field label="Coaching notes" htmlFor="exercise-notes">
          <Textarea
            id="exercise-notes"
            rows={4}
            defaultValue={exercise.coaching}
            key={`notes-${exercise.id}`}
          />
        </Field>
        <Field label="Note for this workout" htmlFor="exercise-cue">
          <Input
            id="exercise-cue"
            className="h-11"
            placeholder="Optional, such as slow eccentric"
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
          {seedIds.has(workout.id) ? (
            <Button variant="ghost" asChild>
              <Link href={`/app/workouts/${workout.id}`}>Preview member view</Link>
            </Button>
          ) : null}
          {saved ? (
            <p className="text-sm text-muted-foreground">Saved on this screen.</p>
          ) : null}
        </div>
      </form>
      )}
    </div>
  );
}

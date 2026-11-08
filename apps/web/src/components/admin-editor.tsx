"use client";

import { useEffect, useState } from "react";
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
import {
  addExercise,
  createWorkout,
  updateExercise,
  uploadExerciseVideo,
} from "@/lib/actions";
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
  const [addingExercise, setAddingExercise] = useState(false);
  const [pendingExerciseId, setPendingExerciseId] = useState<string | null>(null);
  const [draftVideo, setDraftVideo] = useState<VideoClip | null>(null);
  const exercise =
    workout?.exercises.find((item) => item.id === exerciseId) ??
    workout?.exercises[0];
  const editing = addingExercise ? undefined : exercise;
  const [trackingType, setTrackingType] = useState<TrackingType>(
    exercise?.trackingType ?? "weight_reps",
  );
  const [published, setPublished] = useState(exercise?.published ?? true);
  const [saved, setSaved] = useState(false);
  const clip = editing ? videos[editing.id] : draftVideo;

  function clearDraftVideo() {
    setDraftVideo((current) => {
      if (current?.url) URL.revokeObjectURL(current.url);
      return null;
    });
  }

  function startNewExercise() {
    clearDraftVideo();
    setPendingExerciseId(null);
    setAddingExercise(true);
    setTrackingType("weight_reps");
    setPublished(true);
    setSaved(false);
    setError("");
  }

  useEffect(() => {
    if (!pendingExerciseId) return;
    const found = workouts.some((item) =>
      item.exercises.some((entry) => entry.id === pendingExerciseId),
    );
    if (!found) return;
    setExerciseId(pendingExerciseId);
    setAddingExercise(false);
    setPendingExerciseId(null);
  }, [pendingExerciseId, workouts]);

  function chooseProgram(nextProgramId: string) {
    const nextWorkouts = library.filter(
      (item) => item.programId === nextProgramId,
    );
    setProgramId(nextProgramId);
    setCreating(false);
    setAddingExercise(false);
    setPendingExerciseId(null);
    clearDraftVideo();
    const nextWorkout = nextWorkouts[0];
    const nextExercise = nextWorkout?.exercises[0];
    if (!nextWorkout) return;
    setWorkoutId(nextWorkout.id);
    if (!nextExercise) {
      startNewExercise();
      return;
    }
    setExerciseId(nextExercise.id);
    setTrackingType(nextExercise.trackingType);
    setPublished(nextExercise.published ?? true);
    setSaved(false);
  }

  function chooseWorkout(nextWorkoutId: string) {
    const next = library.find((item) => item.id === nextWorkoutId);
    if (!next) return;
    setCreating(false);
    setAddingExercise(false);
    setPendingExerciseId(null);
    clearDraftVideo();
    setWorkoutId(next.id);
    const nextExercise = next.exercises[0];
    if (!nextExercise) {
      startNewExercise();
      return;
    }
    setExerciseId(nextExercise.id);
    setTrackingType(nextExercise.trackingType);
    setPublished(nextExercise.published ?? true);
    setSaved(false);
  }

  function chooseExercise(nextExerciseId: string) {
    const next = workout?.exercises.find((item) => item.id === nextExerciseId);
    if (!next) return;
    setAddingExercise(false);
    setPendingExerciseId(null);
    clearDraftVideo();
    setExerciseId(next.id);
    setTrackingType(next.trackingType);
    setPublished(next.published ?? true);
    setSaved(false);
  }

  function attachVideo(file: File | null) {
    if (!editing) {
      setDraftVideo((current) => {
        if (current?.url) URL.revokeObjectURL(current.url);
        if (!file) return null;
        return { name: file.name, url: URL.createObjectURL(file), file };
      });
      setSaved(false);
      return;
    }
    const exerciseId = editing.id;
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
      ) : workout ? (
      <form
        className="grid min-w-0 gap-5 border border-border bg-card p-4 sm:p-5"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const details = {
            name: form.get("name"),
            coaching: form.get("coaching"),
            cue: String(form.get("cue") ?? ""),
            trackingType,
            sets: Number(form.get("sets")),
            targetReps: Number(form.get("reps") || editing?.targetReps || 8),
            targetDurationSeconds: Number(
              form.get("duration") || editing?.targetDurationSeconds || 45,
            ),
            restSeconds: Number(form.get("rest")),
            published,
          };
          if (editing) {
            const result = await updateExercise({
              exerciseId: editing.id,
              ...details,
            });
            setError(result.error ?? "");
            setSaved(!result.error);
            if (!result.error) router.refresh();
            return;
          }
          const result = await addExercise({
            workoutId: workout.id,
            ...details,
          });
          if (result.error || !result.exerciseId) {
            setError(result.error ?? "The exercise could not be created.");
            setSaved(false);
            return;
          }
          if (draftVideo?.file) {
            const body = new FormData();
            body.set("file", draftVideo.file);
            const uploaded = await uploadExerciseVideo(result.exerciseId, body);
            setError(uploaded.error ?? "");
          } else {
            setError("");
          }
          clearDraftVideo();
          setPendingExerciseId(result.exerciseId);
          setSaved(true);
          router.refresh();
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-3xl tracking-tight">
              {editing ? editing.name : "New exercise"}
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
                editing?.id === item.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border",
              )}
            >
              {item.name}
            </button>
          ))}
          <button
            type="button"
            onClick={startNewExercise}
            className={cn(
              "border px-3 py-1.5 text-sm",
              editing
                ? "border-border"
                : "border-primary bg-primary text-primary-foreground",
            )}
          >
            New exercise
          </button>
        </div>

        <Field label="Exercise name" htmlFor="exercise-name">
          <Input
            id="exercise-name"
            className="h-11"
            name="name"
            defaultValue={editing?.name ?? ""}
            key={`name-${editing?.id ?? "new"}`}
            required
          />
        </Field>
        <Field label="Coaching notes" htmlFor="exercise-notes">
          <Textarea
            id="exercise-notes"
            rows={4}
            name="coaching"
            defaultValue={editing?.coaching ?? ""}
            key={`notes-${editing?.id ?? "new"}`}
          />
        </Field>
        <Field label="Note for this workout" htmlFor="exercise-cue">
          <Input
            id="exercise-cue"
            className="h-11"
            placeholder="Optional, such as slow eccentric"
            name="cue"
            defaultValue={editing?.cue ?? ""}
            key={`cue-${editing?.id ?? "new"}`}
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
              defaultValue={editing?.sets ?? 3}
              key={`sets-${editing?.id ?? "new"}`}
            />
          </Field>
          {trackingType === "duration" ? (
            <Field label="Target seconds" htmlFor="target-duration">
              <Input
                id="target-duration"
                className="h-11"
                inputMode="numeric"
                name="duration"
                defaultValue={editing?.targetDurationSeconds ?? 45}
                key={`duration-${editing?.id ?? "new"}`}
              />
            </Field>
          ) : (
            <Field label="Target reps" htmlFor="target-reps">
              <Input
                id="target-reps"
                className="h-11"
                inputMode="numeric"
                name="reps"
                defaultValue={editing?.targetReps ?? 8}
                key={`reps-${editing?.id ?? "new"}`}
              />
            </Field>
          )}
          <Field label="Rest (seconds)" htmlFor="rest">
            <Input
              id="rest"
              className="h-11"
              inputMode="numeric"
              name="rest"
              defaultValue={editing?.restSeconds ?? 90}
              key={`rest-${editing?.id ?? "new"}`}
            />
          </Field>
        </div>

        <div className="grid gap-2">
          <p className="text-sm font-medium">Demo video</p>
          <VideoUpload
            fileName={clip?.name ?? (editing?.hasVideo ? "Current demo" : "")}
            previewUrl={
              clip?.url ?? (editing?.hasVideo ? `/api/videos/${editing.id}` : "")
            }
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
            {editing ? "Save exercise" : "Create exercise"}
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

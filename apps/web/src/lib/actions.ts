"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { toKilograms } from "@/lib/units";
import {
  exerciseCreateSchema,
  exerciseUpdateSchema,
  phaseAssignSchema,
  messageSchema,
  passwordError,
  profileSchema,
  sessionSaveSchema,
  signInSchema,
  signUpSchema,
  VIDEO_TYPES,
  videoIdSchema,
  MAX_VIDEO_BYTES,
  MAX_QR_BYTES,
  inviteEmailSchema,
  parseVenmoUsername,
  weighInSchema,
  workoutDraftSchema,
  workoutRenameSchema,
  workoutWarmupSchema,
} from "@/lib/validation";
import {
  createServiceClient,
  createSupabase,
  siteOrigin,
  ConfigError,
} from "@/lib/supabase/server";
import { normalizeRepTarget } from "@/lib/content";
import { getViewer } from "@/lib/queries";
import { memberLocked } from "@/lib/phases";

export type ActionResult = { error?: string; ok?: boolean; message?: string };

function safeNext(value: FormDataEntryValue | null, fallback: string) {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return fallback;
  }
  return value;
}

export async function signUp(formData: FormData): Promise<ActionResult> {
  const parsed = signUpSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    unit: formData.get("unit"),
    coachingAck: formData.get("coaching") === "on" ? "yes" : "",
  });
  if (!parsed.success) return { error: "Check your name, email, units, and the coaching note." };

  const passwordProblem = passwordError(parsed.data.password, parsed.data.email);
  if (passwordProblem) return { error: passwordProblem };

  try {
    const supabase = await createSupabase();
    const origin = siteOrigin((await headers()).get("origin"));
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${origin}/auth/callback?next=/app`,
        data: {
          display_name: parsed.data.name,
          unit: parsed.data.unit,
          coaching_ack: "yes",
        },
      },
    });
    if (error) {
      if (/already registered/i.test(error.message)) {
        return { error: "That email already has an account. Log in instead." };
      }
      return { error: "The account could not be created. Try again in a minute." };
    }
    if (data.session) redirect("/app");
    redirect("/verify");
  } catch (error) {
    if (error instanceof ConfigError) return { error: "Accounts are not configured yet." };
    throw error;
  }
}

export async function signIn(formData: FormData): Promise<ActionResult> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "Enter the email and password for your account." };

  try {
    const supabase = await createSupabase();
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error) {
      if (/confirm/i.test(error.message)) {
        return { error: "Confirm your email, then log in." };
      }
      return { error: "Email or password is incorrect." };
    }
  } catch (error) {
    if (error instanceof ConfigError) return { error: "Accounts are not configured yet." };
    throw error;
  }

  redirect(safeNext(formData.get("next"), "/app"));
}

export async function requestPasswordReset(formData: FormData): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email.includes("@") || email.length > 320) return { error: "Enter a valid email." };

  try {
    const supabase = await createSupabase();
    const origin = siteOrigin((await headers()).get("origin"));
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/callback?next=/reset`,
    });
  } catch (error) {
    if (error instanceof ConfigError) return { error: "Accounts are not configured yet." };
    throw error;
  }

  redirect("/forgot/sent");
}

export async function updatePassword(formData: FormData): Promise<ActionResult> {
  const password = String(formData.get("password") ?? "");
  const problem = passwordError(password, "");
  if (problem) return { error: problem };

  try {
    const supabase = await createSupabase();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return { error: "The password could not be changed. Open the reset link again." };
  } catch (error) {
    if (error instanceof ConfigError) return { error: "Accounts are not configured yet." };
    throw error;
  }

  redirect("/app");
}

export async function signOut() {
  const supabase = await createSupabase();
  await supabase.auth.signOut();
  redirect("/");
}

export async function signInWithApple() {
  await beginProviderSignIn("apple");
}

export async function signInWithGoogle() {
  await beginProviderSignIn("google");
}

async function beginProviderSignIn(provider: "apple" | "google") {
  const supabase = await createSupabase();
  const origin = siteOrigin((await headers()).get("origin"));
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${origin}/auth/callback?next=/app` },
  });
  if (error || !data.url) redirect("/login?error=provider");
  redirect(data.url);
}

export async function acknowledgeCoaching() {
  const supabase = await createSupabase();
  const { error } = await supabase.rpc("acknowledge_coaching");
  if (error) redirect("/acknowledge?error=1");
  redirect("/app");
}

export async function saveProfile(formData: FormData): Promise<ActionResult> {
  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    unit: formData.get("unit"),
  });
  if (!parsed.success) return { error: "Check the name and units." };
  const viewer = await getViewer();
  if (!viewer) return { error: "Log in again." };

  const supabase = await createSupabase();
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: parsed.data.name, unit: parsed.data.unit })
    .eq("id", viewer.id);
  if (error) return { error: "The profile could not be saved." };
  revalidatePath("/app", "layout");
  return { ok: true };
}

export async function saveWeighIn(formData: FormData): Promise<ActionResult> {
  const parsed = weighInSchema.safeParse({
    weighedOn: formData.get("date"),
    weight: Number(formData.get("weight")),
  });
  if (!parsed.success) return { error: "Enter a date and a weight." };
  const viewer = await getViewer();
  if (!viewer) return { error: "Log in again." };
  if (viewer.status === "expired") {
    return { error: "Renew the membership to add a weigh-in. Past entries stay visible." };
  }

  const supabase = await createSupabase();
  const { error } = await supabase.from("body_weight_entries").insert({
    user_id: viewer.id,
    weighed_on: parsed.data.weighedOn,
    weight_kg: toKilograms(parsed.data.weight, viewer.unit),
  });
  if (error) return { error: "The weigh-in could not be saved." };
  revalidatePath("/app/weight");
  revalidatePath("/app");
  return { ok: true };
}

export async function deleteWeighIn(id: string): Promise<ActionResult> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { error: "That entry was not found." };
  const supabase = await createSupabase();
  const { error } = await supabase.from("body_weight_entries").delete().eq("id", id);
  if (error) return { error: "The weigh-in could not be removed." };
  revalidatePath("/app/weight");
  revalidatePath("/app");
  return { ok: true };
}

export async function saveSession(input: unknown): Promise<ActionResult> {
  const parsed = sessionSaveSchema.safeParse(input);
  if (!parsed.success) return { error: "The set log could not be saved." };
  const viewer = await getViewer();
  if (!viewer) return { error: "Log in again." };
  if (viewer.status === "expired") {
    return { error: "Renew the membership to log a workout. History stays visible." };
  }

  const supabase = await createSupabase();
  const { data: workout } = await supabase
    .from("workouts")
    .select("id, title, phases(position)")
    .eq("id", parsed.data.workoutId)
    .maybeSingle();
  if (!workout) return { error: "That workout is not available." };
  const phase = Array.isArray(workout.phases) ? workout.phases[0] : workout.phases;
  if (memberLocked(phase?.position, viewer)) {
    return { error: "This workout is locked until you reach that phase." };
  }

  const { data: existing } = await supabase
    .from("workout_sessions")
    .select("id")
    .eq("user_id", viewer.id)
    .eq("workout_id", workout.id)
    .is("completed_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let sessionId = existing?.id as string | undefined;
  if (!sessionId) {
    const { data: created, error } = await supabase
      .from("workout_sessions")
      .insert({
        user_id: viewer.id,
        workout_id: workout.id,
        title_snapshot: workout.title,
      })
      .select("id")
      .single();
    if (error || !created) return { error: "The workout could not be saved." };
    sessionId = created.id;
  }

  const rows = parsed.data.sets
    .filter(
      (set) =>
        set.skipped ||
        set.reps != null ||
        set.weight != null ||
        set.durationSeconds != null,
    )
    .map((set) => ({
      session_id: sessionId,
      workout_exercise_id: set.exerciseId,
      set_index: set.index,
      tracking_type:
        set.durationSeconds != null
          ? "duration"
          : set.weight != null
            ? "weight_reps"
            : "reps",
      movement_position: set.movement ?? 1,
      reps: set.reps ?? null,
      weight_kg: set.weight == null ? null : toKilograms(set.weight, viewer.unit),
      duration_seconds: set.durationSeconds ?? null,
      skipped: Boolean(set.skipped),
    }));

  const { error: deleteError } = await supabase
    .from("session_sets")
    .delete()
    .eq("session_id", sessionId);
  if (deleteError) return { error: "The set log could not be saved." };
  if (rows.length) {
    const { error } = await supabase.from("session_sets").insert(rows);
    if (error && columnMissing(error, "movement_position")) {
      if (rows.some((row) => row.movement_position > 1)) {
        return { error: circuitMigrationMessage };
      }
      const plain = rows.map(({ movement_position: _movement, ...row }) => row);
      const retry = await supabase.from("session_sets").insert(plain);
      if (retry.error) return { error: "The set log could not be saved." };
    } else if (error?.code === "23505") {
      return { error: circuitMigrationMessage };
    } else if (error) {
      return { error: "The set log could not be saved." };
    }
  }

  if (parsed.data.complete) {
    const { error } = await supabase
      .from("workout_sessions")
      .update({ completed_at: new Date().toISOString() })
      .eq("id", sessionId);
    if (error) return { error: "The workout could not be completed." };
  }

  revalidatePath("/app/history");
  revalidatePath(`/app/workouts/${workout.id}`);
  revalidatePath("/app");
  return { ok: true };
}

export async function sendMessage(memberId: string, body: string): Promise<ActionResult> {
  const parsed = messageSchema.safeParse({ memberId, body });
  if (!parsed.success) return { error: "Write a shorter message." };
  const viewer = await getViewer();
  if (!viewer) return { error: "Log in again." };
  if (viewer.blocked) {
    return { error: "Pay on Venmo to continue. Liv turns access back on after the payment." };
  }
  if (viewer.role !== "admin" && parsed.data.memberId !== viewer.id) {
    return { error: "That conversation is not available." };
  }

  const supabase = await createSupabase();
  const { error } = await supabase.from("messages").insert({
    member_id: parsed.data.memberId,
    sender_id: viewer.id,
    body: parsed.data.body,
  });
  if (error) return { error: "The message could not be sent. Wait a moment and try again." };
  revalidatePath("/admin");
  revalidatePath("/app/account");
  return { ok: true };
}

const circuitMigrationMessage =
  "Run supabase/migrations/20261121153000_circuits.sql in the Supabase SQL editor, then save again.";

type MovementInput = {
  name: string;
  trackingType: "weight_reps" | "reps" | "duration";
  targetReps?: number;
  targetRepsLabel?: string;
  targetDurationSeconds?: number;
};

function prepareExercise<T extends { movements?: MovementInput[] }>(exercise: T) {
  const movements = (exercise.movements ?? [])
    .map((movement) => ({
      ...movement,
      name: movement.name.trim(),
      targetRepsLabel: movement.targetRepsLabel?.trim() || undefined,
    }))
    .filter((movement) => movement.name);
  if (movements.length === 1) return { error: "A circuit needs 2 or 3 movements." };
  if (movements.length > 3) return { error: "A circuit can include up to 3 movements." };
  if (!movements.length) return { exercise, movements: [] as MovementInput[] };
  for (const movement of movements) {
    if (movement.trackingType === "duration") {
      if (!movement.targetDurationSeconds) return { error: `Add a time for ${movement.name}.` };
    } else if (!movement.targetReps && !movement.targetRepsLabel) {
      return { error: `Add a rep target for ${movement.name}.` };
    }
  }
  const first = movements[0];
  return {
    exercise: {
      ...exercise,
      trackingType: first.trackingType,
      targetReps: first.targetReps,
      targetRepsLabel: first.targetRepsLabel,
      targetDurationSeconds: first.targetDurationSeconds,
    },
    movements,
  };
}

function columnMissing(error: { code?: string; message?: string }, column: string) {
  return (
    error.code === "42703" ||
    error.code === "PGRST204" ||
    (error.message ?? "").includes(column)
  );
}

async function saveCircuitMovements(
  supabase: Awaited<ReturnType<typeof createSupabase>>,
  exerciseId: string,
  movements: MovementInput[],
) {
  const { error: deleteError } = await supabase
    .from("circuit_movements")
    .delete()
    .eq("workout_exercise_id", exerciseId);
  if (deleteError) {
    const missing =
      deleteError.code === "42P01" ||
      deleteError.code === "PGRST205" ||
      (deleteError.message ?? "").includes("circuit_movements");
    if (missing) return movements.length ? circuitMigrationMessage : null;
    return "The circuit could not be saved.";
  }
  if (!movements.length) return null;
  const { error } = await supabase.from("circuit_movements").insert(
    movements.map((movement, index) => ({
      id: newId(movement.name, "move"),
      workout_exercise_id: exerciseId,
      position: index + 1,
      name: movement.name,
      tracking_type: movement.trackingType,
      target_reps: movement.trackingType === "duration" ? null : (movement.targetReps ?? null),
      target_reps_label:
        movement.trackingType === "duration" ? null : (movement.targetRepsLabel ?? null),
      target_duration_seconds:
        movement.trackingType === "duration" ? (movement.targetDurationSeconds ?? 45) : null,
    })),
  );
  if (error) return "The circuit could not be saved.";
  return null;
}

function storedReps(exercise: {
  trackingType: "weight_reps" | "reps" | "duration";
  targetReps?: number;
  targetRepsLabel?: string;
}):
  | { error: string }
  | { target_reps: number | null; target_reps_label: string | null } {
  if (exercise.trackingType === "duration") {
    return { target_reps: null, target_reps_label: null };
  }
  const normalized = normalizeRepTarget(
    exercise.targetRepsLabel ?? "",
    exercise.targetReps,
  );
  if ("error" in normalized) return normalized;
  return {
    target_reps: normalized.targetReps ?? exercise.targetReps ?? 8,
    target_reps_label: normalized.targetRepsLabel ?? null,
  };
}

export async function createWorkout(input: unknown): Promise<ActionResult & { workoutId?: string; exerciseIds?: string[] }> {
  const parsed = workoutDraftSchema.safeParse(input);
  if (!parsed.success) return { error: "Check the workout name and each exercise." };
  const viewer = await getViewer();
  if (!viewer || viewer.role !== "admin") return { error: "Only Liv can add workouts." };

  const supabase = await createSupabase();
  const workoutId = newId(parsed.data.title, "workout");
  if (parsed.data.phaseId) {
    const { data: phase } = await supabase
      .from("phases")
      .select("id, program_id")
      .eq("id", parsed.data.phaseId)
      .maybeSingle();
    if (!phase || phase.program_id !== parsed.data.programId) {
      return { error: "Choose a phase from this program." };
    }
  }

  const exerciseReps: { target_reps: number | null; target_reps_label: string | null }[] = [];
  const preparedExercises = [];
  for (const exercise of parsed.data.exercises) {
    const prepared = prepareExercise(exercise);
    if ("error" in prepared) return prepared;
    const reps = storedReps(prepared.exercise);
    if ("error" in reps) return { error: reps.error };
    preparedExercises.push(prepared);
    exerciseReps.push(reps);
  }

  const { error: workoutError } = await supabase.from("workouts").insert({
    id: workoutId,
    program_id: parsed.data.programId,
    title: parsed.data.title,
    summary: parsed.data.summary || "Added by Liv.",
    warmup: parsed.data.warmup?.trim() || null,
    published: true,
    position: 100,
    phase_id: parsed.data.phaseId ?? null,
  });
  if (workoutError && columnMissing(workoutError, "warmup") && parsed.data.warmup?.trim()) {
    return { error: warmupMigrationMessage };
  }
  if (workoutError && columnMissing(workoutError, "warmup")) {
    const retry = await supabase.from("workouts").insert({
      id: workoutId,
      program_id: parsed.data.programId,
      title: parsed.data.title,
      summary: parsed.data.summary || "Added by Liv.",
      published: true,
      position: 100,
      phase_id: parsed.data.phaseId ?? null,
    });
    if (retry.error) return { error: "The workout could not be created." };
  } else if (workoutError) {
    return { error: "The workout could not be created." };
  }

  const exerciseIds: string[] = [];
  for (const [index, prepared] of preparedExercises.entries()) {
    const exercise = prepared.exercise;
    const exerciseId = newId(exercise.name, "exercise");
    exerciseIds.push(exerciseId);
    const { error: exerciseError } = await supabase.from("exercises").insert({
      id: exerciseId,
      name: exercise.name,
      coaching: exercise.coaching,
      published: true,
    });
    if (exerciseError) return { error: "An exercise could not be created." };
    const reps = exerciseReps[index];
    if (!reps) return { error: "Check the rep target." };
    const { error: linkError } = await supabase.from("workout_exercises").insert({
      id: exerciseId,
      workout_id: workoutId,
      exercise_id: exerciseId,
      position: index,
      cue: exercise.cue || null,
      tracking_type: exercise.trackingType,
      sets: exercise.sets,
      target_reps: reps.target_reps,
      target_reps_label: reps.target_reps_label,
      target_duration_seconds:
        exercise.trackingType === "duration" ? exercise.targetDurationSeconds ?? 45 : null,
      rest_seconds: exercise.restSeconds,
    });
    if (linkError) return { error: "An exercise could not be added to the workout." };
    const circuitError = await saveCircuitMovements(supabase, exerciseId, prepared.movements);
    if (circuitError) {
      await supabase.from("workout_exercises").delete().in("id", exerciseIds);
      await supabase.from("exercises").delete().in("id", exerciseIds);
      await supabase.from("workouts").delete().eq("id", workoutId);
      return { error: circuitError };
    }
  }

  revalidatePath("/admin");
  revalidatePath("/app/programs");
  revalidatePath("/app");
  return { ok: true, workoutId, exerciseIds };
}

const warmupMigrationMessage =
  "Run supabase/migrations/20261121170000_workout_warmup.sql in the Supabase SQL editor, then save again.";

export async function saveWorkoutWarmup(
  workoutId: string,
  warmup: string,
): Promise<ActionResult> {
  const parsed = workoutWarmupSchema.safeParse({ workoutId, warmup });
  if (!parsed.success) return { error: "The warmup needs to be 2,000 characters or fewer." };
  const viewer = await getViewer();
  if (!viewer || viewer.role !== "admin") return { error: "Only Liv can edit the warmup." };

  const supabase = await createSupabase();
  const { data, error } = await supabase
    .from("workouts")
    .update({ warmup: parsed.data.warmup || null })
    .eq("id", parsed.data.workoutId)
    .select("id")
    .maybeSingle();
  if (error && columnMissing(error, "warmup")) return { error: warmupMigrationMessage };
  if (error || !data) return { error: "The warmup could not be saved." };

  revalidatePath("/admin");
  revalidatePath("/app");
  revalidatePath("/app/programs");
  revalidatePath(`/app/workouts/${parsed.data.workoutId}`);
  return { ok: true };
}

export async function renameWorkout(workoutId: string, title: string): Promise<ActionResult> {
  const parsed = workoutRenameSchema.safeParse({ workoutId, title });
  if (!parsed.success) return { error: "Check the workout name." };
  const viewer = await getViewer();
  if (!viewer || viewer.role !== "admin") return { error: "Only Liv can rename workouts." };

  const supabase = await createSupabase();
  const { data, error } = await supabase
    .from("workouts")
    .update({ title: parsed.data.title })
    .eq("id", parsed.data.workoutId)
    .select("id")
    .maybeSingle();
  if (error || !data) return { error: "The workout name could not be saved." };

  revalidatePath("/admin");
  revalidatePath("/app");
  revalidatePath("/app/programs");
  revalidatePath(`/app/workouts/${parsed.data.workoutId}`);
  return { ok: true };
}

export async function assignWorkoutPhase(
  workoutId: string,
  phaseId: string | null,
): Promise<ActionResult> {
  const parsed = phaseAssignSchema.safeParse({ workoutId, phaseId });
  if (!parsed.success) return { error: "That phase could not be saved." };
  const viewer = await getViewer();
  if (!viewer || viewer.role !== "admin") return { error: "Only Liv can assign phases." };

  const supabase = await createSupabase();
  const { data: workout } = await supabase
    .from("workouts")
    .select("id, program_id")
    .eq("id", parsed.data.workoutId)
    .maybeSingle();
  if (!workout) return { error: "That workout was not found." };

  if (parsed.data.phaseId) {
    const { data: phase } = await supabase
      .from("phases")
      .select("id, program_id")
      .eq("id", parsed.data.phaseId)
      .maybeSingle();
    if (!phase || phase.program_id !== workout.program_id) {
      return { error: "Choose a phase from this program." };
    }
  }

  const { error } = await supabase
    .from("workouts")
    .update({ phase_id: parsed.data.phaseId })
    .eq("id", workout.id);
  if (error) return { error: "The phase could not be saved." };
  revalidatePath("/admin");
  revalidatePath("/app");
  revalidatePath("/app/programs");
  revalidatePath(`/app/workouts/${workout.id}`);
  return { ok: true };
}

export async function addExercise(
  input: unknown,
): Promise<ActionResult & { exerciseId?: string }> {
  const parsed = exerciseCreateSchema.safeParse(input);
  if (!parsed.success) return { error: "Check the exercise details." };
  const viewer = await getViewer();
  if (!viewer || viewer.role !== "admin") return { error: "Only Liv can add exercises." };
  const prepared = prepareExercise(parsed.data);
  if ("error" in prepared) return prepared;
  const reps = storedReps(prepared.exercise);
  if ("error" in reps) return { error: reps.error };

  const supabase = await createSupabase();
  const { data: workout } = await supabase
    .from("workouts")
    .select("id")
    .eq("id", prepared.exercise.workoutId)
    .maybeSingle();
  if (!workout) return { error: "That workout was not found." };

  const { data: last } = await supabase
    .from("workout_exercises")
    .select("position")
    .eq("workout_id", workout.id)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const exerciseId = newId(prepared.exercise.name, "exercise");
  const { error: exerciseError } = await supabase.from("exercises").insert({
    id: exerciseId,
    name: prepared.exercise.name,
    coaching: prepared.exercise.coaching,
    published: prepared.exercise.published,
  });
  if (exerciseError) return { error: "The exercise could not be created." };

  const { error: linkError } = await supabase.from("workout_exercises").insert({
    id: exerciseId,
    workout_id: workout.id,
    exercise_id: exerciseId,
    position: (last?.position ?? -1) + 1,
    cue: prepared.exercise.cue || null,
    tracking_type: prepared.exercise.trackingType,
    sets: prepared.exercise.sets,
    target_reps: reps.target_reps,
    target_reps_label: reps.target_reps_label,
    target_duration_seconds:
      prepared.exercise.trackingType === "duration"
        ? prepared.exercise.targetDurationSeconds ?? 45
        : null,
    rest_seconds: prepared.exercise.restSeconds,
  });
  if (linkError) {
    await supabase.from("exercises").delete().eq("id", exerciseId);
    return { error: "The exercise could not be added to the workout." };
  }
  const circuitError = await saveCircuitMovements(supabase, exerciseId, prepared.movements);
  if (circuitError) {
    await supabase.from("workout_exercises").delete().eq("id", exerciseId);
    await supabase.from("exercises").delete().eq("id", exerciseId);
    return { error: circuitError };
  }

  revalidatePath("/admin");
  revalidatePath("/app/programs");
  revalidatePath(`/app/workouts/${workout.id}`);
  return { ok: true, exerciseId };
}

export async function updateExercise(input: unknown): Promise<ActionResult> {
  const parsed = exerciseUpdateSchema.safeParse(input);
  if (!parsed.success) return { error: "Check the exercise details." };
  const viewer = await getViewer();
  if (!viewer || viewer.role !== "admin") return { error: "Only Liv can edit workouts." };

  const prepared = prepareExercise(parsed.data);
  if ("error" in prepared) return prepared;
  const reps = storedReps(prepared.exercise);
  if ("error" in reps) return { error: reps.error };

  const supabase = await createSupabase();
  const { error: exerciseError } = await supabase
    .from("exercises")
    .update({
      name: prepared.exercise.name,
      coaching: prepared.exercise.coaching,
      published: prepared.exercise.published,
    })
    .eq("id", prepared.exercise.exerciseId);
  if (exerciseError) return { error: "The exercise could not be saved." };

  const { data: link } = await supabase
    .from("workout_exercises")
    .select("workout_id")
    .eq("id", prepared.exercise.exerciseId)
    .maybeSingle();
  const { error: linkError } = await supabase
    .from("workout_exercises")
    .update({
      cue: prepared.exercise.cue || null,
      tracking_type: prepared.exercise.trackingType,
      sets: prepared.exercise.sets,
      target_reps: reps.target_reps,
      target_reps_label: reps.target_reps_label,
      target_duration_seconds:
        prepared.exercise.trackingType === "duration"
          ? prepared.exercise.targetDurationSeconds ?? 45
          : null,
      rest_seconds: prepared.exercise.restSeconds,
    })
    .eq("id", prepared.exercise.exerciseId);
  if (linkError) return { error: "The prescription could not be saved." };
  const circuitError = await saveCircuitMovements(
    supabase,
    prepared.exercise.exerciseId,
    prepared.movements,
  );
  if (circuitError) return { error: circuitError };
  revalidatePath("/admin");
  revalidatePath("/app/programs");
  if (link?.workout_id) revalidatePath(`/app/workouts/${link.workout_id}`);
  return { ok: true };
}

export async function uploadExerciseVideo(exerciseId: string, formData: FormData): Promise<ActionResult> {
  const id = videoIdSchema.safeParse(exerciseId);
  if (!id.success) return { error: "That exercise was not found." };
  const viewer = await getViewer();
  if (!viewer || viewer.role !== "admin") return { error: "Only Liv can upload videos." };
  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "Choose a video file." };
  if (file.size <= 0 || file.size > MAX_VIDEO_BYTES) {
    return { error: "Videos need to be 50 MB or smaller." };
  }
  if (!VIDEO_TYPES.includes(file.type as (typeof VIDEO_TYPES)[number])) {
    return { error: "Upload an MP4, WebM, or QuickTime video." };
  }

  const supabase = await createSupabase();
  const { data: existing } = await supabase
    .from("exercises")
    .select("video_path")
    .eq("id", id.data)
    .maybeSingle();
  if (!existing) return { error: "That exercise was not found." };

  const path = `${id.data}/${crypto.randomUUID()}`;
  const { error: uploadError } = await supabase.storage
    .from("exercise-videos")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) return { error: "The video could not be uploaded." };

  const { error: updateError } = await supabase
    .from("exercises")
    .update({ video_path: path })
    .eq("id", id.data);
  if (updateError) return { error: "The video could not be attached." };

  if (existing.video_path) {
    await supabase.storage.from("exercise-videos").remove([existing.video_path]);
  }
  revalidatePath("/admin");
  return { ok: true };
}

export async function deleteWorkout(workoutId: string): Promise<ActionResult> {
  if (!/^[a-z0-9-]{1,64}$/.test(workoutId)) return { error: "That workout was not found." };
  const viewer = await getViewer();
  if (!viewer || viewer.role !== "admin") return { error: "Only Liv can delete workouts." };

  let admin;
  try {
    admin = createServiceClient();
  } catch (error) {
    if (error instanceof ConfigError) return { error: "Deleting workouts is not configured yet." };
    throw error;
  }

  const { data: workout } = await admin
    .from("workouts")
    .select("id")
    .eq("id", workoutId)
    .maybeSingle();
  if (!workout) return { error: "That workout was not found." };

  const { data: links, error: linkReadError } = await admin
    .from("workout_exercises")
    .select("id, exercise_id")
    .eq("workout_id", workout.id);
  if (linkReadError) return { error: "The workout could not be deleted." };
  const linkIds = (links ?? []).map((link) => link.id);
  const exerciseIds = [...new Set((links ?? []).map((link) => link.exercise_id))];

  if (linkIds.length) {
    const { error: setError } = await admin
      .from("session_sets")
      .delete()
      .in("workout_exercise_id", linkIds);
    if (setError) return { error: "The workout could not be deleted." };
  }

  const { error: sessionError } = await admin
    .from("workout_sessions")
    .delete()
    .eq("workout_id", workout.id);
  if (sessionError) return { error: "The workout could not be deleted." };

  if (linkIds.length) {
    const { error } = await admin.from("workout_exercises").delete().in("id", linkIds);
    if (error) return { error: "The workout could not be deleted." };
  }

  if (exerciseIds.length) {
    const { data: stillUsed } = await admin
      .from("workout_exercises")
      .select("exercise_id")
      .in("exercise_id", exerciseIds);
    const used = new Set((stillUsed ?? []).map((row) => row.exercise_id));
    const removable = exerciseIds.filter((exerciseId) => !used.has(exerciseId));
    if (removable.length) {
      const { data: clips } = await admin
        .from("exercises")
        .select("video_path")
        .in("id", removable);
      const paths = (clips ?? [])
        .map((clip) => clip.video_path)
        .filter((path): path is string => Boolean(path));
      const { error } = await admin.from("exercises").delete().in("id", removable);
      if (error) return { error: "The workout could not be deleted." };
      if (paths.length) await admin.storage.from("exercise-videos").remove(paths);
    }
  }

  const { error: workoutError } = await admin.from("workouts").delete().eq("id", workout.id);
  if (workoutError) return { error: "The workout could not be deleted." };

  revalidatePath("/admin");
  revalidatePath("/app");
  revalidatePath("/app/programs");
  revalidatePath(`/app/workouts/${workout.id}`);
  return { ok: true };
}

export async function deleteAccount(formData: FormData): Promise<ActionResult> {
  if (formData.get("confirm") !== "DELETE") {
    return { error: "Type DELETE to confirm." };
  }
  const viewer = await getViewer();
  if (!viewer) return { error: "Log in again." };

  try {
    const admin = createServiceClient();
    const { error } = await admin.auth.admin.deleteUser(viewer.id);
    if (error) return { error: "The account could not be deleted." };
  } catch (error) {
    if (error instanceof ConfigError) {
      return { error: "Account deletion is not configured yet." };
    }
    throw error;
  }

  const supabase = await createSupabase();
  await supabase.auth.signOut();
  redirect("/");
}

const qrContentType = {
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
} as const;

type ServiceClient = ReturnType<typeof createServiceClient>;

function authToken(value: string) {
  return value.length >= 20 && value.length <= 8192 && !/[\s"'<>]/.test(value);
}

async function qrKind(file: File) {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return "png" as const;
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg" as const;
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "webp" as const;
  }
  return null;
}

export async function saveVenmoSettings(formData: FormData): Promise<ActionResult> {
  const parsed = parseVenmoUsername(String(formData.get("username") ?? ""));
  if ("error" in parsed) return parsed;
  const viewer = await getViewer();
  if (!viewer || viewer.role !== "admin") return { error: "Only Liv can save Venmo details." };

  const file = formData.get("qr");
  const remove = formData.get("removeQr") === "yes";
  let upload: { path: string; body: File; contentType: string } | null = null;
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_QR_BYTES) {
      return { error: "Use a PNG, JPEG, or WebP image under 2 MB." };
    }
    const kind = await qrKind(file);
    if (!kind) return { error: "Use a PNG, JPEG, or WebP image under 2 MB." };
    upload = {
      path: `${crypto.randomUUID()}.${kind}`,
      body: file,
      contentType: qrContentType[kind],
    };
  }

  const supabase = await createSupabase();
  const { data: current, error: readError } = await supabase
    .from("payment_settings")
    .select("qr_path")
    .eq("id", 1)
    .maybeSingle();
  if (readError || !current) return { error: "Venmo details could not be saved." };

  if (upload) {
    const { error: uploadError } = await supabase.storage
      .from("payment-qr")
      .upload(upload.path, upload.body, { contentType: upload.contentType, upsert: false });
    if (uploadError) return { error: "The QR image could not be uploaded." };
  }

  const nextPath = upload ? upload.path : remove ? null : current.qr_path;
  const { error: updateError } = await supabase
    .from("payment_settings")
    .update({
      venmo_username: parsed.username,
      qr_path: nextPath,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);
  if (updateError) {
    if (upload) await supabase.storage.from("payment-qr").remove([upload.path]);
    return { error: "Venmo details could not be saved." };
  }

  if (current.qr_path && current.qr_path !== nextPath) {
    await supabase.storage.from("payment-qr").remove([current.qr_path]);
  }

  revalidatePath("/admin");
  revalidatePath("/pay");
  revalidatePath("/app/account");
  return { ok: true };
}

export async function inviteMember(formData: FormData): Promise<ActionResult> {
  const parsed = inviteEmailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return { error: "Enter a valid email." };
  if (formData.get("paid") !== "yes") {
    return { error: "Confirm the Venmo payment before sending an invite." };
  }
  const viewer = await getViewer();
  if (!viewer || viewer.role !== "admin") return { error: "Only Liv can send invites." };

  let admin: ServiceClient;
  try {
    admin = createServiceClient();
  } catch (error) {
    if (error instanceof ConfigError) return { error: "Invites are not configured yet." };
    throw error;
  }

  const email = parsed.data;
  const existingId = await memberIdForEmail(admin, email);
  if (existingId) return grantExistingMember(admin, email, existingId, viewer.id);

  const origin = siteOrigin((await headers()).get("origin"));
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${origin}/reset`,
  });
  if (error || !data.user) {
    if (error && alreadyRegistered(error.message)) {
      const id = await memberIdForEmail(admin, email);
      if (id) return grantExistingMember(admin, email, id, viewer.id);
    }
    return { error: "The invite could not be sent." };
  }

  if (!(await activateMembership(admin, data.user.id))) {
    return { error: "The membership could not be updated." };
  }
  if (!(await recordInvite(email, viewer.id, "invited"))) {
    return { error: "The invite could not be saved." };
  }
  revalidatePath("/admin");
  return {
    ok: true,
    message: "Invite sent. They get an email to set a password. Membership is active.",
  };
}

export async function acceptInviteSession(
  accessToken: string,
  refreshToken: string,
): Promise<ActionResult> {
  if (!authToken(accessToken) || !authToken(refreshToken)) {
    return { error: "This link could not be opened. Ask Liv to send it again." };
  }
  try {
    const supabase = await createSupabase();
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) return { error: "This link could not be opened. Ask Liv to send it again." };
  } catch (error) {
    if (error instanceof ConfigError) return { error: "Accounts are not configured yet." };
    throw error;
  }
  return { ok: true };
}

async function grantExistingMember(
  admin: ServiceClient,
  email: string,
  userId: string,
  invitedBy: string,
): Promise<ActionResult> {
  if (!(await activateMembership(admin, userId))) {
    return { error: "The membership could not be updated." };
  }
  if (!(await recordInvite(email, invitedBy, "already_had_account"))) {
    return { error: "The invite could not be saved." };
  }
  revalidatePath("/admin");
  return { ok: true, message: "They already have an account. Membership is active." };
}

async function memberIdForEmail(admin: ServiceClient, email: string) {
  const { data: profiles, error } = await admin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .limit(1);
  const profileId = profiles?.[0]?.id;
  if (!error && typeof profileId === "string") return profileId;

  const { data: authId, error: lookupError } = await admin.rpc("user_id_by_email", {
    target: email,
  });
  if (lookupError || typeof authId !== "string" || !authId) return null;
  return authId;
}

async function activateMembership(admin: ServiceClient, userId: string) {
  const membership = {
    status: "active" as const,
    provider: null,
    trial_end: null,
    current_period_end: null,
    updated_at: new Date().toISOString(),
  };
  const { data: existing, error: readError } = await admin
    .from("entitlements")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (readError) return false;
  if (existing) {
    const { error } = await admin.from("entitlements").update(membership).eq("user_id", userId);
    return !error;
  }
  const { error } = await admin.from("entitlements").insert({ user_id: userId, ...membership });
  return !error;
}

async function recordInvite(
  email: string,
  invitedBy: string,
  status: "invited" | "already_had_account",
) {
  const supabase = await createSupabase();
  const { error } = await supabase.from("invites").upsert(
    {
      email,
      invited_at: new Date().toISOString(),
      invited_by: invitedBy,
      status,
    },
    { onConflict: "email" },
  );
  return !error;
}

function alreadyRegistered(message: string) {
  return /already (been )?registered|already exists|user already/i.test(message);
}

function newId(label: string, kind: string) {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  const id = `${slug || kind}-${suffix}`;
  return id.slice(0, 64);
}

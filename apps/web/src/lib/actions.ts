"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { toKilograms } from "@/lib/units";
import {
  exerciseUpdateSchema,
  messageSchema,
  passwordError,
  profileSchema,
  sessionSaveSchema,
  signInSchema,
  signUpSchema,
  VIDEO_TYPES,
  videoIdSchema,
  MAX_VIDEO_BYTES,
  weighInSchema,
  workoutDraftSchema,
} from "@/lib/validation";
import {
  createServiceClient,
  createSupabase,
  siteOrigin,
  ConfigError,
} from "@/lib/supabase/server";
import { getViewer } from "@/lib/queries";

export type ActionResult = { error?: string; ok?: boolean };

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
    .select("id, title")
    .eq("id", parsed.data.workoutId)
    .maybeSingle();
  if (!workout) return { error: "That workout is not available." };

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
    if (error) return { error: "The set log could not be saved." };
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

export async function createWorkout(input: unknown): Promise<ActionResult & { workoutId?: string; exerciseIds?: string[] }> {
  const parsed = workoutDraftSchema.safeParse(input);
  if (!parsed.success) return { error: "Check the workout name and each exercise." };
  const viewer = await getViewer();
  if (!viewer || viewer.role !== "admin") return { error: "Only Liv can add workouts." };

  const supabase = await createSupabase();
  const workoutId = newId(parsed.data.title, "workout");
  const { error: workoutError } = await supabase.from("workouts").insert({
    id: workoutId,
    program_id: parsed.data.programId,
    title: parsed.data.title,
    summary: parsed.data.summary || "Added by Liv.",
    published: true,
    position: 100,
  });
  if (workoutError) return { error: "The workout could not be created." };

  const exerciseIds: string[] = [];
  for (const [index, exercise] of parsed.data.exercises.entries()) {
    const exerciseId = newId(exercise.name, "exercise");
    exerciseIds.push(exerciseId);
    const { error: exerciseError } = await supabase.from("exercises").insert({
      id: exerciseId,
      name: exercise.name,
      coaching: exercise.coaching,
      published: true,
    });
    if (exerciseError) return { error: "An exercise could not be created." };
    const { error: linkError } = await supabase.from("workout_exercises").insert({
      id: exerciseId,
      workout_id: workoutId,
      exercise_id: exerciseId,
      position: index,
      cue: exercise.cue || null,
      tracking_type: exercise.trackingType,
      sets: exercise.sets,
      target_reps: exercise.trackingType === "duration" ? null : exercise.targetReps ?? 8,
      target_duration_seconds:
        exercise.trackingType === "duration" ? exercise.targetDurationSeconds ?? 45 : null,
      rest_seconds: exercise.restSeconds,
    });
    if (linkError) return { error: "An exercise could not be added to the workout." };
  }

  revalidatePath("/admin");
  revalidatePath("/app/programs");
  return { ok: true, workoutId, exerciseIds };
}

export async function updateExercise(input: unknown): Promise<ActionResult> {
  const parsed = exerciseUpdateSchema.safeParse(input);
  if (!parsed.success) return { error: "Check the exercise details." };
  const viewer = await getViewer();
  if (!viewer || viewer.role !== "admin") return { error: "Only Liv can edit workouts." };

  const supabase = await createSupabase();
  const { error: exerciseError } = await supabase
    .from("exercises")
    .update({
      name: parsed.data.name,
      coaching: parsed.data.coaching,
      published: parsed.data.published,
    })
    .eq("id", parsed.data.exerciseId);
  if (exerciseError) return { error: "The exercise could not be saved." };

  const { error: linkError } = await supabase
    .from("workout_exercises")
    .update({
      cue: parsed.data.cue || null,
      tracking_type: parsed.data.trackingType,
      sets: parsed.data.sets,
      target_reps: parsed.data.trackingType === "duration" ? null : parsed.data.targetReps ?? 8,
      target_duration_seconds:
        parsed.data.trackingType === "duration" ? parsed.data.targetDurationSeconds ?? 45 : null,
      rest_seconds: parsed.data.restSeconds,
    })
    .eq("id", parsed.data.exerciseId);
  if (linkError) return { error: "The prescription could not be saved." };
  revalidatePath("/admin");
  revalidatePath("/app/programs");
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

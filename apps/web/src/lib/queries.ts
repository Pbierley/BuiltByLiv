import "server-only";

import { formatCalendarDate } from "@/lib/dates";
import { fromKilograms } from "@/lib/units";
import { ConfigError, createSupabase } from "@/lib/supabase/server";
import type { Exercise, LoggedSet, Program, TrackingType, Workout } from "@/lib/content";

export type Viewer = {
  id: string;
  email: string;
  name: string;
  unit: "lb" | "kg";
  role: "member" | "admin";
  acknowledged: boolean;
  status: "trialing" | "active" | "grace" | "expired";
  trialDaysLeft: number;
  statusLabel: string;
};

type ExerciseRow = {
  id: string;
  name: string;
  coaching: string;
  video_path: string | null;
  published: boolean;
};

type LinkRow = {
  id: string;
  position: number;
  cue: string | null;
  tracking_type: TrackingType;
  sets: number;
  target_reps: number | null;
  target_duration_seconds: number | null;
  rest_seconds: number;
  exercises: ExerciseRow | ExerciseRow[];
};

type WorkoutRow = {
  id: string;
  program_id: string;
  title: string;
  summary: string;
  published: boolean;
  position: number;
  workout_exercises: LinkRow[];
};

export async function getViewer(): Promise<Viewer | null> {
  const supabase = await createSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, display_name, unit, role, coaching_acknowledged_at")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) return null;

  const { data: entitlement } = await supabase
    .from("entitlements")
    .select("status, trial_end")
    .eq("user_id", user.id)
    .maybeSingle();

  const status = entitlement?.status ?? "expired";
  const trialDaysLeft = daysUntil(entitlement?.trial_end ?? null);
  const statusLabel =
    status === "trialing"
      ? `Trial · ${trialDaysLeft} days left`
      : status === "active"
        ? "Member"
        : status === "grace"
          ? "Payment due"
          : "Membership ended";

  return {
    id: profile.id,
    email: profile.email,
    name: profile.display_name,
    unit: profile.unit,
    role: profile.role,
    acknowledged: Boolean(profile.coaching_acknowledged_at),
    status,
    trialDaysLeft,
    statusLabel,
  };
}

export async function listPrograms(): Promise<Program[]> {
  const supabase = await createSupabase();
  const { data, error } = await supabase
    .from("programs")
    .select("id, title, description, workouts(id)")
    .order("position");
  if (error) throw error;
  return (data ?? []).map((program) => {
    const count = Array.isArray(program.workouts) ? program.workouts.length : 0;
    return {
      id: program.id,
      title: program.title,
      description: program.description,
      days: `${count} ${count === 1 ? "workout" : "workouts"}`,
    };
  });
}

export async function listWorkouts(programId?: string): Promise<Workout[]> {
  const supabase = await createSupabase();
  let query = supabase
    .from("workouts")
    .select(workoutSelect)
    .order("position");
  if (programId) query = query.eq("program_id", programId);
  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as WorkoutRow[]).map((row) => toWorkout(row, []));
}

export async function getWorkoutForViewer(workoutId: string, viewer: Viewer) {
  const supabase = await createSupabase();
  const { data, error } = await supabase
    .from("workouts")
    .select(workoutSelect)
    .eq("id", workoutId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const { data: session } = await supabase
    .from("workout_sessions")
    .select("id, session_sets(workout_exercise_id, set_index, reps, weight_kg, duration_seconds, skipped)")
    .eq("user_id", viewer.id)
    .eq("workout_id", workoutId)
    .is("completed_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const logged = new Map<string, LoggedSet[]>();
  for (const set of session?.session_sets ?? []) {
    const rows = logged.get(set.workout_exercise_id) ?? [];
    rows[set.set_index] = {
      reps: set.reps ?? undefined,
      weight:
        set.weight_kg == null ? undefined : fromKilograms(Number(set.weight_kg), viewer.unit),
      durationSeconds: set.duration_seconds ?? undefined,
      skipped: set.skipped || undefined,
    };
    logged.set(set.workout_exercise_id, rows);
  }

  return toWorkout(data as WorkoutRow, [...logged.entries()]);
}

export async function listWeighIns(viewer: Viewer) {
  const supabase = await createSupabase();
  const { data, error } = await supabase
    .from("body_weight_entries")
    .select("id, weighed_on, weight_kg")
    .eq("user_id", viewer.id)
    .order("weighed_on", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    date: formatCalendarDate(row.weighed_on),
    isoDate: row.weighed_on as string,
    weight: fromKilograms(Number(row.weight_kg), viewer.unit),
  }));
}

export async function listHistory(viewer: Viewer) {
  const supabase = await createSupabase();
  const { data, error } = await supabase
    .from("workout_sessions")
    .select(
      "id, workout_id, title_snapshot, completed_at, session_sets(set_index, reps, weight_kg, duration_seconds, skipped, workout_exercises(exercises(name)))",
    )
    .eq("user_id", viewer.id)
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false });
  if (error) throw error;

  return (data ?? []).map((session) => ({
    id: session.id,
    workoutId: session.workout_id,
    title: session.title_snapshot,
    date: formatCalendarDate(session.completed_at ?? ""),
    detail: describeSets(session.session_sets ?? [], viewer.unit),
  }));
}

export type Thread = {
  id: string;
  name: string;
  email: string;
  status: "Trial" | "Member";
  messages: { id: string; from: "liv" | "client"; at: string; body: string }[];
};

export async function listThreads(adminId: string): Promise<Thread[]> {
  const supabase = await createSupabase();
  const { data: members, error } = await supabase
    .from("profiles")
    .select("id, email, display_name, entitlements(status)")
    .eq("role", "member")
    .order("display_name");
  if (error) throw error;

  const { data: notes, error: notesError } = await supabase
    .from("messages")
    .select("id, member_id, sender_id, body, created_at")
    .order("created_at");
  if (notesError) throw notesError;

  return (members ?? []).map((member) => {
    const entitlement = first(member.entitlements);
    return {
      id: member.id,
      name: member.display_name,
      email: member.email,
      status: entitlement?.status === "trialing" ? "Trial" : "Member",
      messages: (notes ?? [])
        .filter((note) => note.member_id === member.id)
        .map((note) => ({
          id: note.id,
          from: note.sender_id === adminId ? "liv" : "client",
          at: formatCalendarDate(note.created_at),
          body: note.body,
        })),
    };
  });
}

export async function listOwnMessages(viewer: Viewer) {
  const supabase = await createSupabase();
  const { data, error } = await supabase
    .from("messages")
    .select("id, sender_id, body, created_at")
    .eq("member_id", viewer.id)
    .order("created_at");
  if (error) throw error;
  return (data ?? []).map((note) => ({
    id: note.id,
    from: note.sender_id === viewer.id ? ("client" as const) : ("liv" as const),
    at: formatCalendarDate(note.created_at),
    body: note.body,
  }));
}

export async function openWorkoutId(viewer: Viewer) {
  const supabase = await createSupabase();
  const { data } = await supabase
    .from("workout_sessions")
    .select("workout_id")
    .eq("user_id", viewer.id)
    .is("completed_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.workout_id ?? null;
}

export { ConfigError };

const workoutSelect =
  "id, program_id, title, summary, published, position, workout_exercises(id, position, cue, tracking_type, sets, target_reps, target_duration_seconds, rest_seconds, exercises(id, name, coaching, video_path, published))";

function toWorkout(row: WorkoutRow, logged: [string, LoggedSet[]][]): Workout {
  const byExercise = new Map(logged);
  const links = [...(row.workout_exercises ?? [])].sort((a, b) => a.position - b.position);
  return {
    id: row.id,
    programId: row.program_id,
    title: row.title,
    summary: row.summary,
    exercises: links.map((link) => {
      const exercise = first(link.exercises);
      const sets = (byExercise.get(link.id) ?? []).filter(Boolean);
      return {
        id: link.id,
        name: exercise?.name ?? "Exercise",
        coaching: exercise?.coaching ?? "",
        cue: link.cue ?? undefined,
        trackingType: link.tracking_type,
        sets: link.sets,
        targetReps: link.target_reps ?? undefined,
        targetDurationSeconds: link.target_duration_seconds ?? undefined,
        restSeconds: link.rest_seconds,
        logged: sets,
        hasVideo: Boolean(exercise?.video_path),
      } satisfies Exercise;
    }),
  };
}

function first<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function daysUntil(iso: string | null) {
  if (!iso) return 0;
  const end = Date.parse(iso);
  if (Number.isNaN(end)) return 0;
  return Math.max(0, Math.ceil((end - Date.now()) / 86_400_000));
}

function describeSets(
  sets: {
    set_index: number;
    reps: number | null;
    weight_kg: number | null;
    duration_seconds: number | null;
    skipped: boolean;
    workout_exercises: { exercises: { name: string } | { name: string }[] } | { exercises: { name: string } | { name: string }[] }[] | null;
  }[],
  unit: "lb" | "kg",
) {
  const groups = new Map<string, string[]>();
  for (const set of [...sets].sort((a, b) => a.set_index - b.set_index)) {
    const link = first(set.workout_exercises);
    const exercise = first(link?.exercises ?? null);
    const name = exercise?.name ?? "Exercise";
    const detail = set.skipped
      ? "skipped"
      : set.duration_seconds != null
        ? `${set.duration_seconds}s`
        : set.weight_kg != null
          ? `${fromKilograms(Number(set.weight_kg), unit)} ${unit} × ${set.reps ?? 0}`
          : `${set.reps ?? 0}`;
    groups.set(name, [...(groups.get(name) ?? []), detail]);
  }
  const text = [...groups.entries()].map(([name, values]) => `${name} ${values.join(", ")}`).join(" · ");
  return text || "Completed";
}

import "server-only";

import { formatCalendarDate } from "@/lib/dates";
import { fromKilograms } from "@/lib/units";
import { ConfigError, createSupabase } from "@/lib/supabase/server";
import type { Exercise, LoggedSet, Phase, Program, TrackingType, Workout } from "@/lib/content";
import { programProgress } from "@/lib/phases";

export type Viewer = {
  id: string;
  email: string;
  name: string;
  unit: "lb" | "kg";
  role: "member" | "admin";
  acknowledged: boolean;
  status: "trialing" | "active" | "grace" | "expired";
  blocked: boolean;
  trialDaysLeft: number;
  statusLabel: string;
  startedAt: string | null;
  programWeek: number;
  currentPhase: number;
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
  target_reps_label: string | null;
  target_duration_seconds: number | null;
  rest_seconds: number;
  exercises: ExerciseRow | ExerciseRow[];
};

type PhaseEmbed = {
  id: string;
  title: string;
  position: number;
  starts_week: number;
  ends_week: number;
};

type WorkoutRow = {
  id: string;
  program_id: string;
  title: string;
  summary: string;
  published: boolean;
  position: number;
  phase_id?: string | null;
  phases?: PhaseEmbed | PhaseEmbed[] | null;
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
    .select("id, email, display_name, unit, role, coaching_acknowledged_at, created_at")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) return null;

  const { data: entitlement } = await supabase
    .from("entitlements")
    .select("status, trial_end, current_period_end")
    .eq("user_id", user.id)
    .maybeSingle();

  const storedStatus = entitlement?.status ?? "expired";
  const endsAt =
    entitlement?.current_period_end ??
    (storedStatus === "trialing" ? entitlement?.trial_end ?? null : null);
  const blocked = !membershipOpen(profile.role, storedStatus, endsAt);
  const status = blocked ? "expired" : storedStatus;
  const trialDaysLeft = daysUntil(endsAt);
  const statusLabel = blocked
    ? "Membership ended"
    : status === "trialing"
      ? `Trial · ${trialDaysLeft} days left`
      : status === "active"
        ? "Member"
        : status === "grace"
          ? "Payment due"
          : "Membership ended";
  const progress = programProgress(profile.created_at);

  return {
    id: profile.id,
    email: profile.email,
    name: profile.display_name,
    unit: profile.unit,
    role: profile.role,
    acknowledged: Boolean(profile.coaching_acknowledged_at),
    status,
    blocked,
    trialDaysLeft,
    statusLabel,
    startedAt: profile.created_at ?? null,
    programWeek: progress.week,
    currentPhase: progress.phase,
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
  const load = (columns: string) => {
    let query = supabase.from("workouts").select(columns).order("position");
    if (programId) query = query.eq("program_id", programId);
    return query;
  };
  let { data, error } = await load(workoutSelect);
  if (error && phaseSchemaMissing(error)) {
    ({ data, error } = await load(workoutSelectWithoutPhases));
  }
  if (error) throw error;
  return ((data ?? []) as unknown as WorkoutRow[]).map((row) => toWorkout(row, []));
}

export async function getWorkoutForViewer(workoutId: string, viewer: Viewer) {
  const supabase = await createSupabase();
  let { data, error } = await supabase
    .from("workouts")
    .select(workoutSelect)
    .eq("id", workoutId)
    .maybeSingle();
  if (error && phaseSchemaMissing(error)) {
    ({ data, error } = await supabase
      .from("workouts")
      .select(workoutSelectWithoutPhases)
      .eq("id", workoutId)
      .maybeSingle());
  }
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

export type ProgressPoint = {
  at: string;
  label: string;
  value: number;
};

export type ExerciseProgress = {
  id: string;
  name: string;
  weight: ProgressPoint[];
  reps: ProgressPoint[];
  volume: ProgressPoint[];
  duration: ProgressPoint[];
};

export async function listExerciseProgress(viewer: Viewer): Promise<ExerciseProgress[]> {
  const supabase = await createSupabase();
  const { data, error } = await supabase
    .from("workout_sessions")
    .select(
      "id, started_at, completed_at, session_sets(set_index, reps, weight_kg, duration_seconds, skipped, workout_exercises(exercises(name)))",
    )
    .eq("user_id", viewer.id)
    .order("started_at", { ascending: true });
  if (error) throw error;

  const groups = new Map<string, ExerciseProgress & { latest: string }>();
  for (const session of data ?? []) {
    const at = session.completed_at ?? session.started_at;
    if (!at) continue;
    const logged = new Map<
      string,
      {
        name: string;
        weight: number | null;
        reps: number;
        volume: number;
        duration: number;
        sawReps: boolean;
        sawVolume: boolean;
        sawDuration: boolean;
      }
    >();
    for (const set of session.session_sets ?? []) {
      if (set.skipped) continue;
      const link = first(set.workout_exercises);
      const exercise = first(link?.exercises ?? null);
      const name = exercise?.name?.trim() || "Exercise";
      const id = name.toLowerCase();
      const bucket = logged.get(id) ?? {
        name,
        weight: null,
        reps: 0,
        volume: 0,
        duration: 0,
        sawReps: false,
        sawVolume: false,
        sawDuration: false,
      };
      if (set.weight_kg != null) {
        const weight = fromKilograms(Number(set.weight_kg), viewer.unit);
        bucket.weight = bucket.weight == null ? weight : Math.max(bucket.weight, weight);
      }
      if (set.reps != null) {
        bucket.reps += set.reps;
        bucket.sawReps = true;
      }
      if (set.weight_kg != null && set.reps != null) {
        const weight = fromKilograms(Number(set.weight_kg), viewer.unit);
        bucket.volume += weight * set.reps;
        bucket.sawVolume = true;
      }
      if (set.duration_seconds != null) {
        bucket.duration += set.duration_seconds;
        bucket.sawDuration = true;
      }
      logged.set(id, bucket);
    }

    for (const [id, bucket] of logged) {
      const series = groups.get(id) ?? {
        id,
        name: bucket.name,
        weight: [] as ProgressPoint[],
        reps: [] as ProgressPoint[],
        volume: [] as ProgressPoint[],
        duration: [] as ProgressPoint[],
        latest: at,
      };
      const point = { at, label: formatCalendarDate(at) };
      if (bucket.weight != null) series.weight.push({ ...point, value: bucket.weight });
      if (bucket.sawReps) series.reps.push({ ...point, value: bucket.reps });
      if (bucket.sawVolume) series.volume.push({ ...point, value: Math.round(bucket.volume) });
      if (bucket.sawDuration) series.duration.push({ ...point, value: bucket.duration });
      series.name = bucket.name;
      series.latest = at;
      groups.set(id, series);
    }
  }

  return [...groups.values()]
    .filter(
      (series) =>
        series.weight.length || series.reps.length || series.volume.length || series.duration.length,
    )
    .sort((a, b) => (a.latest < b.latest ? 1 : -1))
    .map(({ latest: _latest, ...series }) => series);
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

export type PaymentSettings = {
  username: string | null;
  qrUrl: string | null;
};

const qrPathPattern = /^[0-9a-f-]{36}\.(png|jpe?g|webp)$/;

export async function getPaymentSettings(): Promise<PaymentSettings> {
  const supabase = await createSupabase();
  const { data, error } = await supabase
    .from("payment_settings")
    .select("venmo_username, qr_path")
    .eq("id", 1)
    .maybeSingle();
  if (error) {
    if (relationMissing(error)) return { username: null, qrUrl: null };
    throw error;
  }
  const username = data?.venmo_username?.trim() || null;
  const qrPath = data?.qr_path && qrPathPattern.test(data.qr_path) ? data.qr_path : null;
  const qrUrl = qrPath
    ? supabase.storage.from("payment-qr").getPublicUrl(qrPath).data.publicUrl
    : null;
  return { username, qrUrl };
}

export type InviteRecord = {
  email: string;
  invitedAt: string;
  status: "invited" | "already_had_account";
};

export async function listInvites(): Promise<InviteRecord[]> {
  const supabase = await createSupabase();
  const { data, error } = await supabase
    .from("invites")
    .select("email, invited_at, status")
    .order("invited_at", { ascending: false })
    .limit(50);
  if (error) {
    if (relationMissing(error)) return [];
    throw error;
  }
  return (data ?? []).map((invite) => ({
    email: invite.email,
    invitedAt: formatCalendarDate(invite.invited_at),
    status: invite.status === "already_had_account" ? "already_had_account" : "invited",
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

const workoutExercisesSelect =
  "workout_exercises(id, position, cue, tracking_type, sets, target_reps, target_reps_label, target_duration_seconds, rest_seconds, exercises(id, name, coaching, video_path, published))";

const workoutSelect = `id, program_id, title, summary, published, position, phase_id, phases(id, title, position, starts_week, ends_week), ${workoutExercisesSelect}`;

const workoutSelectWithoutPhases = `id, program_id, title, summary, published, position, ${workoutExercisesSelect}`;

export async function listPhases(programId?: string): Promise<Phase[]> {
  const supabase = await createSupabase();
  let query = supabase
    .from("phases")
    .select("id, program_id, title, summary, position, starts_week, ends_week")
    .order("position");
  if (programId) query = query.eq("program_id", programId);
  const { data, error } = await query;
  if (error) {
    if (relationMissing(error)) return [];
    throw error;
  }
  return (data ?? []).map((phase) => ({
    id: phase.id,
    programId: phase.program_id,
    title: phase.title,
    summary: phase.summary,
    position: phase.position,
    startsWeek: phase.starts_week,
    endsWeek: phase.ends_week,
  }));
}

function toWorkout(row: WorkoutRow, logged: [string, LoggedSet[]][]): Workout {
  const byExercise = new Map(logged);
  const links = [...(row.workout_exercises ?? [])].sort((a, b) => a.position - b.position);
  const phase = first(row.phases);
  return {
    id: row.id,
    programId: row.program_id,
    title: row.title,
    summary: row.summary,
    phaseId: row.phase_id,
    phaseTitle: phase?.title ?? null,
    phasePosition: phase?.position ?? null,
    phaseStartsWeek: phase?.starts_week ?? null,
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
        targetRepsLabel: link.target_reps_label?.trim() || undefined,
        targetDurationSeconds: link.target_duration_seconds ?? undefined,
        restSeconds: link.rest_seconds,
        logged: sets,
        hasVideo: Boolean(exercise?.video_path),
        published: exercise?.published ?? true,
      } satisfies Exercise;
    }),
  };
}

function relationMissing(error: { code?: string }) {
  return error.code === "42P01" || error.code === "PGRST205";
}

function phaseSchemaMissing(error: { code?: string }) {
  return relationMissing(error) || error.code === "42703" || error.code === "PGRST200";
}

function first<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function membershipOpen(
  role: "member" | "admin",
  status: string,
  endsAt: string | null,
) {
  if (role === "admin") return true;
  if (status !== "trialing" && status !== "active" && status !== "grace") return false;
  if (!endsAt) return status !== "trialing";
  const end = Date.parse(endsAt);
  return !Number.isNaN(end) && end > Date.now();
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

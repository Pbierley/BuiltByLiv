import { z } from "zod";
import { REP_LABEL_MAX } from "@/lib/content";

const id = z.string().regex(/^[a-z0-9-]{1,80}$/);
const trackingType = z.enum(["weight_reps", "reps", "duration"]);

export const passwordRules = {
  min: 12,
  max: 72,
};

export function passwordError(password: string, email: string) {
  if (password.length < passwordRules.min || password.length > passwordRules.max) {
    return `Use ${passwordRules.min} to ${passwordRules.max} characters.`;
  }
  if (!/[a-z]/i.test(password) || !/\d/.test(password)) {
    return "Use at least one letter and one number.";
  }
  if (password.toLowerCase() === email.trim().toLowerCase()) {
    return "Use a password that is different from your email.";
  }
  return null;
}

export const signUpSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(320),
  password: z.string().min(passwordRules.min).max(passwordRules.max),
  unit: z.enum(["lb", "kg"]),
  coachingAck: z.literal("yes"),
});

export const signInSchema = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(1).max(passwordRules.max),
});

export const profileSchema = z.object({
  name: z.string().trim().min(1).max(80),
  unit: z.enum(["lb", "kg"]),
});

export const weighInSchema = z.object({
  weighedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weight: z.number().positive().lt(500),
});

export const circuitMovementSchema = z.object({
  name: z.string().trim().min(1).max(80),
  trackingType,
  targetReps: z.number().int().min(1).max(500).optional(),
  targetRepsLabel: z.string().trim().max(REP_LABEL_MAX).optional(),
  targetDurationSeconds: z.number().int().min(1).max(7200).optional(),
});

export const exerciseDraftSchema = z.object({
  name: z.string().trim().min(1).max(80),
  coaching: z.string().trim().max(2000),
  cue: z.string().trim().max(200).optional(),
  trackingType,
  sets: z.number().int().min(1).max(20),
  targetReps: z.number().int().min(1).max(500).optional(),
  targetRepsLabel: z.string().trim().max(REP_LABEL_MAX).optional(),
  targetDurationSeconds: z.number().int().min(1).max(7200).optional(),
  restSeconds: z.number().int().min(0).max(600),
  movements: z.array(circuitMovementSchema).max(3).optional(),
});

const phaseId = z.string().regex(/^[a-z0-9-]{1,64}$/);

export const workoutDraftSchema = z.object({
  programId: id,
  title: z.string().trim().min(1).max(80),
  summary: z.string().trim().max(300),
  warmup: z.string().trim().max(2000).optional(),
  phaseId: phaseId.nullable().optional(),
  exercises: z.array(exerciseDraftSchema).min(1).max(20),
});

export const phaseAssignSchema = z.object({
  workoutId: z.string().regex(/^[a-z0-9-]{1,64}$/),
  phaseId: phaseId.nullable(),
});

export const workoutRenameSchema = z.object({
  workoutId: z.string().regex(/^[a-z0-9-]{1,64}$/),
  title: z.string().trim().min(1).max(80),
});

export const workoutWarmupSchema = z.object({
  workoutId: z.string().regex(/^[a-z0-9-]{1,64}$/),
  warmup: z.string().trim().max(2000),
});

export const exerciseUpdateSchema = exerciseDraftSchema.extend({
  exerciseId: id,
  published: z.boolean(),
});

export const exerciseCreateSchema = exerciseDraftSchema.extend({
  workoutId: z.string().regex(/^[a-z0-9-]{1,64}$/),
  published: z.boolean(),
});

export const sessionSetSchema = z.object({
  exerciseId: id,
  index: z.number().int().min(0).max(39),
  movement: z.number().int().min(1).max(3).optional(),
  reps: z.number().int().min(0).max(500).optional(),
  weight: z.number().min(0).lt(500).optional(),
  durationSeconds: z.number().int().min(0).max(7200).optional(),
  skipped: z.boolean().optional(),
});

export const sessionSaveSchema = z.object({
  workoutId: id,
  complete: z.boolean(),
  sets: z.array(sessionSetSchema).max(200),
});

export const messageSchema = z.object({
  memberId: z.string().uuid(),
  body: z.string().trim().min(1).max(2000),
});

export const videoIdSchema = id;

export const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"] as const;
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
export const MAX_QR_BYTES = 2 * 1024 * 1024;

const venmoUsernamePattern = /^[A-Za-z0-9][A-Za-z0-9._-]{0,29}$/;

export const inviteEmailSchema = z
  .string()
  .trim()
  .email()
  .max(320)
  .transform((value) => value.toLowerCase());

export function parseVenmoUsername(
  value: string,
): { username: string | null } | { error: string } {
  const username = value.trim().replace(/^@+/, "");
  if (!username) return { username: null };
  if (!venmoUsernamePattern.test(username)) {
    return { error: "Enter a Venmo username using letters, numbers, and . _ -." };
  }
  return { username };
}

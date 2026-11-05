import { z } from "zod";

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

export const exerciseDraftSchema = z.object({
  name: z.string().trim().min(1).max(80),
  coaching: z.string().trim().max(2000),
  cue: z.string().trim().max(200).optional(),
  trackingType,
  sets: z.number().int().min(1).max(20),
  targetReps: z.number().int().min(1).max(500).optional(),
  targetDurationSeconds: z.number().int().min(1).max(7200).optional(),
  restSeconds: z.number().int().min(0).max(600),
});

export const workoutDraftSchema = z.object({
  programId: id,
  title: z.string().trim().min(1).max(80),
  summary: z.string().trim().max(300),
  exercises: z.array(exerciseDraftSchema).min(1).max(20),
});

export const exerciseUpdateSchema = exerciseDraftSchema.extend({
  exerciseId: id,
  published: z.boolean(),
});

export const sessionSetSchema = z.object({
  exerciseId: id,
  index: z.number().int().min(0).max(39),
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

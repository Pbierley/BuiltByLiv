export const member = {
  name: "Jordan Hale",
  email: "jordan@example.com",
  units: "lb" as const,
  trialDaysLeft: 6,
  cardLast4: "4242",
};

export const membership = {
  name: "Built by Liv membership",
  price: 29,
  interval: "month" as const,
  trialDays: 7,
};

export type TrackingType = "weight_reps" | "reps" | "duration";

export type LoggedSet = {
  weight?: number;
  reps?: number;
  durationSeconds?: number;
  skipped?: boolean;
};

export type Exercise = {
  id: string;
  name: string;
  coaching: string;
  cue?: string;
  trackingType: TrackingType;
  sets: number;
  targetReps?: number;
  targetDurationSeconds?: number;
  restSeconds: number;
  logged: LoggedSet[];
};

export type Workout = {
  id: string;
  programId: string;
  title: string;
  summary: string;
  exercises: Exercise[];
};

export type Program = {
  id: string;
  title: string;
  description: string;
  days: string;
};

export const programs: Program[] = [
  {
    id: "strength-foundations",
    title: "Strength Foundations",
    description:
      "Four lifting days. Every exercise has a demo, a set and rep target, and a place to write down what you actually did.",
    days: "4 workouts",
  },
  {
    id: "engine",
    title: "Engine",
    description:
      "Shorter conditioning sessions for days you want to sweat without a long barbell workout.",
    days: "1 workout",
  },
];

export const workouts: Workout[] = [
  {
    id: "lower-a",
    programId: "strength-foundations",
    title: "Lower A",
    summary: "Squat, hinge, lunge, then a plank.",
    exercises: [
      {
        id: "back-squat",
        name: "Back squat",
        coaching:
          "Feet about shoulder width. Brace before you descend, sit between your hips, and stand tall. Knees track over the mid-foot.",
        cue: "Slow eccentric",
        trackingType: "weight_reps",
        sets: 3,
        targetReps: 8,
        restSeconds: 120,
        logged: [
          { weight: 135, reps: 8 },
          { weight: 145, reps: 8 },
        ],
      },
      {
        id: "rdl",
        name: "Romanian deadlift",
        coaching:
          "Soft knees, push the hips back until the hamstrings load, and keep the bar close to your legs.",
        trackingType: "weight_reps",
        sets: 3,
        targetReps: 10,
        restSeconds: 90,
        logged: [],
      },
      {
        id: "walking-lunge",
        name: "Walking lunge",
        coaching:
          "Take a long step, let the back knee kiss the floor, and drive through the front heel.",
        cue: "Use dumbbells if the bar is busy",
        trackingType: "reps",
        sets: 3,
        targetReps: 12,
        restSeconds: 60,
        logged: [],
      },
      {
        id: "plank",
        name: "Plank",
        coaching:
          "Ribs down, glutes squeezed, neck long. Breathe. Stop the set if your lower back sags.",
        trackingType: "duration",
        sets: 3,
        targetDurationSeconds: 45,
        restSeconds: 45,
        logged: [],
      },
    ],
  },
  {
    id: "upper-a",
    programId: "strength-foundations",
    title: "Upper A",
    summary: "Bench, row, push-ups, and a short plank.",
    exercises: [
      {
        id: "bench",
        name: "Bench press",
        coaching:
          "Shoulder blades set, feet planted, bar lowered to the lower chest, then pressed back over the shoulders.",
        trackingType: "weight_reps",
        sets: 4,
        targetReps: 6,
        restSeconds: 150,
        logged: [],
      },
      {
        id: "row",
        name: "One-arm row",
        coaching:
          "Hand and knee on the bench, pull the dumbbell toward the hip, and pause for a beat.",
        trackingType: "weight_reps",
        sets: 3,
        targetReps: 10,
        restSeconds: 75,
        logged: [],
      },
      {
        id: "push-up",
        name: "Push-up",
        coaching:
          "Body in one line from head to heel. Chest travels to the floor, elbows about 45 degrees from your sides.",
        trackingType: "reps",
        sets: 3,
        targetReps: 10,
        restSeconds: 60,
        logged: [],
      },
      {
        id: "plank-upper",
        name: "Plank",
        coaching: "Same brace as Lower A. Shorter holds, cleaner position.",
        trackingType: "duration",
        sets: 3,
        targetDurationSeconds: 40,
        restSeconds: 40,
        logged: [],
      },
    ],
  },
  {
    id: "lower-b",
    programId: "strength-foundations",
    title: "Lower B",
    summary: "Front squat, hip thrust, side plank.",
    exercises: [
      {
        id: "front-squat",
        name: "Front squat",
        coaching:
          "Elbows high, bar on the fingertips and front delts. Stay tall as you sit down.",
        trackingType: "weight_reps",
        sets: 3,
        targetReps: 6,
        restSeconds: 150,
        logged: [],
      },
      {
        id: "hip-thrust",
        name: "Hip thrust",
        coaching:
          "Upper back on the bench, drive through the heels, and lock the hips out without flaring the ribs.",
        trackingType: "weight_reps",
        sets: 3,
        targetReps: 10,
        restSeconds: 90,
        logged: [],
      },
      {
        id: "side-plank",
        name: "Side plank",
        coaching: "Hips forward, bottom shoulder stacked under the elbow.",
        cue: "Each side",
        trackingType: "duration",
        sets: 3,
        targetDurationSeconds: 30,
        restSeconds: 30,
        logged: [],
      },
    ],
  },
  {
    id: "upper-b",
    programId: "strength-foundations",
    title: "Upper B",
    summary: "Press, pull, and a carry.",
    exercises: [
      {
        id: "press",
        name: "Overhead press",
        coaching:
          "Squeeze the glutes, ribs down, bar travels close to the face and finishes over the mid-foot.",
        trackingType: "weight_reps",
        sets: 4,
        targetReps: 5,
        restSeconds: 120,
        logged: [],
      },
      {
        id: "pull-up",
        name: "Pull-up",
        coaching:
          "Dead hang to start, pull the chest toward the bar, lower under control.",
        cue: "A band or an assisted machine is fine",
        trackingType: "reps",
        sets: 4,
        targetReps: 5,
        restSeconds: 90,
        logged: [],
      },
      {
        id: "carry",
        name: "Farmer carry",
        coaching: "Heavy dumbbells, tall walk, quiet shoulders.",
        trackingType: "duration",
        sets: 3,
        targetDurationSeconds: 40,
        restSeconds: 60,
        logged: [],
      },
    ],
  },
  {
    id: "mixed-engine",
    programId: "engine",
    title: "Mixed engine",
    summary: "Row intervals and push-ups.",
    exercises: [
      {
        id: "row-erg",
        name: "Row",
        coaching:
          "Hard but repeatable. Sit tall on the recovery, then push the footplates before you pull.",
        trackingType: "duration",
        sets: 5,
        targetDurationSeconds: 120,
        restSeconds: 60,
        logged: [],
      },
      {
        id: "engine-push-up",
        name: "Push-up",
        coaching: "Same position as Strength Foundations. Move smoothly.",
        trackingType: "reps",
        sets: 5,
        targetReps: 8,
        restSeconds: 45,
        logged: [],
      },
    ],
  },
];

export const weighIns = [
  { id: "w1", date: "Nov 1, 2026", weight: 168.4 },
  { id: "w2", date: "Oct 25, 2026", weight: 169.1 },
  { id: "w3", date: "Oct 18, 2026", weight: 170 },
  { id: "w4", date: "Oct 11, 2026", weight: 170.6 },
];

export const sessionHistory = [
  {
    id: "h1",
    date: "Nov 4, 2026",
    workoutId: "upper-a",
    title: "Upper A",
    detail: "Bench 95 lb × 6, 6, 5, 5 · Push-ups 12, 10, 9 · Plank 0:45, 0:45, 0:40",
  },
  {
    id: "h2",
    date: "Nov 2, 2026",
    workoutId: "lower-a",
    title: "Lower A",
    detail: "Squat 135×8, 145×8, 145×7 · RDL 115×10 · Lunges 12s · Plank 0:45",
  },
  {
    id: "h3",
    date: "Oct 31, 2026",
    workoutId: "upper-b",
    title: "Upper B",
    detail: "Press 65 lb × 5 · Pull-ups 5, 4, 4, 3 · Carry 0:40",
  },
];

export function getProgram(id: string) {
  return programs.find((program) => program.id === id);
}

export function getWorkout(id: string) {
  return workouts.find((workout) => workout.id === id);
}

export function workoutsFor(programId: string) {
  return workouts.filter((workout) => workout.programId === programId);
}

export function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function restLabel(seconds: number) {
  if (seconds % 60 === 0) {
    const minutes = seconds / 60;
    return `${minutes} min rest`;
  }
  return `${formatDuration(seconds)} rest`;
}

export function trackingLabel(type: TrackingType) {
  if (type === "weight_reps") return "Weight and reps";
  if (type === "reps") return "Reps";
  return "Time";
}

export function prescriptionLabel(exercise: Exercise) {
  if (exercise.trackingType === "duration") {
    return `${exercise.sets} × ${formatDuration(exercise.targetDurationSeconds ?? 0)}`;
  }
  return `${exercise.sets} × ${exercise.targetReps}`;
}

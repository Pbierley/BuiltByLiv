import Link from "next/link";
import type { Phase, Workout } from "@/lib/content";
import { memberLocked } from "@/lib/phases";

export function PhaseWorkoutList({
  workouts,
  phases,
  currentPhase,
  role,
}: {
  workouts: Workout[];
  phases: Phase[];
  currentPhase: number;
  role: string;
}) {
  if (!phases.length) {
    return (
      <ol className="divide-y divide-border border border-border bg-card">
        {workouts.map((workout, index) => (
          <li key={workout.id}>
            <WorkoutRow
              workout={workout}
              index={index}
              currentPhase={currentPhase}
              role={role}
            />
          </li>
        ))}
      </ol>
    );
  }

  const unassigned = workouts.filter((workout) => !workout.phaseId);

  return (
    <div className="grid gap-8">
      {phases.map((phase) => {
        const days = workouts.filter((workout) => workout.phaseId === phase.id);
        const current = phase.position === currentPhase;
        return (
          <section key={phase.id} className="grid gap-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-display text-3xl tracking-tight">{phase.title}</h2>
              <p className="text-sm text-muted-foreground">
                Weeks {phase.startsWeek}–{phase.endsWeek}
                {current ? " · Your phase" : ""}
              </p>
            </div>
            {days.length ? (
              <ol className="divide-y divide-border border border-border bg-card">
                {days.map((workout, index) => (
                  <li key={workout.id}>
                    <WorkoutRow
                      workout={workout}
                      index={index}
                      currentPhase={currentPhase}
                      role={role}
                    />
                  </li>
                ))}
              </ol>
            ) : (
              <p className="border border-border bg-card px-4 py-4 text-sm text-muted-foreground">
                No workouts in this phase yet.
              </p>
            )}
          </section>
        );
      })}
      {unassigned.length ? (
        <section className="grid gap-3">
          <h2 className="font-display text-3xl tracking-tight">Open workouts</h2>
          <ol className="divide-y divide-border border border-border bg-card">
            {unassigned.map((workout, index) => (
              <li key={workout.id}>
                <WorkoutRow
                  workout={workout}
                  index={index}
                  currentPhase={currentPhase}
                  role={role}
                />
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
}

function WorkoutRow({
  workout,
  index,
  currentPhase,
  role,
}: {
  workout: Workout;
  index: number;
  currentPhase: number;
  role: string;
}) {
  const blocked = memberLocked(workout.phasePosition, { role, currentPhase });
  const previewLock =
    role === "admin" &&
    workout.phasePosition != null &&
    workout.phasePosition > currentPhase;
  const meta = blocked
    ? `Locked until week ${workout.phaseStartsWeek}`
    : previewLock
      ? "Locked for members"
      : `${workout.exercises.length} exercises`;

  const body = (
    <>
      <span className="font-display text-2xl text-primary">
        {String(index + 1).padStart(2, "0")}
      </span>
      <span>
        <span className="block font-medium">{workout.title}</span>
        <span className="text-sm text-muted-foreground">{workout.summary}</span>
      </span>
      <span className="text-sm text-muted-foreground">{meta}</span>
    </>
  );

  if (blocked) {
    return (
      <div className="grid gap-2 px-4 py-4 opacity-70 lg:grid-cols-[auto_1fr_auto] lg:items-center lg:gap-6">
        {body}
      </div>
    );
  }

  return (
    <Link
      href={`/app/workouts/${workout.id}`}
      className="grid gap-2 px-4 py-4 hover:bg-secondary/60 lg:grid-cols-[auto_1fr_auto] lg:items-center lg:gap-6"
    >
      {body}
    </Link>
  );
}

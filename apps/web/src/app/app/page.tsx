import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { PhaseWorkoutList } from "@/components/phase-workout-list";
import { memberLocked } from "@/lib/phases";
import { getViewer, listPhases, listWeighIns, listWorkouts, openWorkoutId } from "@/lib/queries";

export const metadata = { title: "Home" };

export default async function MemberHomePage() {
  const viewer = await getViewer();
  if (!viewer) return null;
  const [workouts, phases, weighIns, continueId] = await Promise.all([
    listWorkouts("strength-foundations"),
    listPhases("strength-foundations"),
    listWeighIns(viewer),
    openWorkoutId(viewer),
  ]);
  const latest = weighIns[0];
  const openWorkouts = workouts.filter(
    (workout) => !memberLocked(workout.phasePosition, viewer),
  );
  const continueWorkout =
    openWorkouts.find((workout) => workout.id === continueId) ?? openWorkouts[0];

  return (
    <div className="grid gap-8">
      <div>
        <p className="text-xs uppercase tracking-[0.16em] text-primary">
          {viewer.statusLabel}
        </p>
        <h1 className="mt-2 font-display text-4xl tracking-tight sm:text-5xl">
          Welcome back, {viewer.name.split(" ")[0]}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Week {viewer.programWeek}
          {viewer.programWeek <= 12 ? " of 12" : ""} · Phase {viewer.currentPhase}
        </p>
      </div>

      <section className="grid gap-4 lg:grid-cols-5">
        {continueWorkout ? (
          <Link
            href={`/app/workouts/${continueWorkout.id}`}
            className="grid gap-6 border border-border bg-card p-6 text-foreground lg:col-span-3"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                {continueId ? "Continue" : "Start"}
              </p>
              <Badge>{continueId ? "In progress" : "Ready"}</Badge>
            </div>
            <div>
              <h2 className="font-display text-4xl tracking-tight">
                {continueWorkout.title}
              </h2>
              <p className="mt-2 text-muted-foreground">{continueWorkout.summary}</p>
            </div>
          </Link>
        ) : null}
        <Link
          href="/app/weight"
          className="grid content-between gap-6 border border-border bg-card p-6 lg:col-span-2"
        >
          <p className="text-xs uppercase tracking-[0.16em] text-primary">
            Latest weigh-in
          </p>
          <p className="font-display text-6xl tabular-nums tracking-tight">
            {latest ? latest.weight : "—"}
            <span className="ml-2 font-sans text-lg text-muted-foreground">
              {viewer.unit}
            </span>
          </p>
          <p className="text-sm text-muted-foreground">
            {latest ? latest.date : "No weigh-in yet"}
          </p>
        </Link>
      </section>

      <section className="grid gap-4">
        <div className="flex items-end justify-between">
          <h2 className="font-display text-3xl tracking-tight">Programs</h2>
          <Link href="/app/programs" className="text-sm text-muted-foreground hover:text-foreground">
            View all
          </Link>
        </div>
        <PhaseWorkoutList
          workouts={workouts}
          phases={phases}
          currentPhase={viewer.currentPhase}
          role={viewer.role}
        />
      </section>
    </div>
  );
}

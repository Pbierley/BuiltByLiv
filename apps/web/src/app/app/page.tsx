import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { getViewer, listWeighIns, listWorkouts, openWorkoutId } from "@/lib/queries";

export const metadata = { title: "Home" };

export default async function MemberHomePage() {
  const viewer = await getViewer();
  if (!viewer) return null;
  const [workouts, weighIns, continueId] = await Promise.all([
    listWorkouts("strength-foundations"),
    listWeighIns(viewer),
    openWorkoutId(viewer),
  ]);
  const latest = weighIns[0];
  const continueWorkout =
    workouts.find((workout) => workout.id === continueId) ?? workouts[0];

  return (
    <div className="grid gap-8">
      <div>
        <p className="text-xs uppercase tracking-[0.16em] text-primary">
          {viewer.statusLabel}
        </p>
        <h1 className="mt-2 font-display text-4xl tracking-tight sm:text-5xl">
          Welcome back, {viewer.name.split(" ")[0]}
        </h1>
      </div>

      <section className="grid gap-4 lg:grid-cols-5">
        {continueWorkout ? (
          <Link
            href={`/app/workouts/${continueWorkout.id}`}
            className="grid gap-6 border border-ink bg-ink p-6 text-background lg:col-span-3"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.16em] text-background/60">
                {continueId ? "Continue" : "Start"}
              </p>
              <Badge>{continueId ? "In progress" : "Ready"}</Badge>
            </div>
            <div>
              <h2 className="font-display text-4xl tracking-tight">
                {continueWorkout.title}
              </h2>
              <p className="mt-2 text-background/70">{continueWorkout.summary}</p>
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
        <ul className="divide-y divide-border border border-border bg-card">
          {workouts.map((workout) => (
            <li key={workout.id}>
              <Link
                href={`/app/workouts/${workout.id}`}
                className="flex flex-col gap-1 px-4 py-4 hover:bg-secondary/60 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
              >
                <span className="min-w-0">
                  <span className="block font-medium">{workout.title}</span>
                  <span className="block text-sm text-muted-foreground">
                    {workout.summary}
                  </span>
                </span>
                <span className="shrink-0 text-sm text-muted-foreground">
                  {workout.exercises.length} exercises
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

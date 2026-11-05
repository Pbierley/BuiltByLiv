import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { member, programs, weighIns, workoutsFor } from "@/lib/content";

export const metadata = { title: "Home" };

export default function MemberHomePage() {
  const latest = weighIns[0];
  const foundation = workoutsFor("strength-foundations");

  return (
    <div className="grid gap-8">
      <div>
        <p className="text-xs uppercase tracking-[0.16em] text-primary">
          Trial · {member.trialDaysLeft} days left
        </p>
        <h1 className="mt-2 font-display text-4xl tracking-tight sm:text-5xl">
          Welcome back, {member.name.split(" ")[0]}
        </h1>
      </div>

      <section className="grid gap-4 lg:grid-cols-5">
        <Link
          href="/app/workouts/lower-a"
          className="grid gap-6 border border-ink bg-ink p-6 text-background lg:col-span-3"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.16em] text-background/60">
              Continue
            </p>
            <Badge>In progress</Badge>
          </div>
          <div>
            <h2 className="font-display text-4xl tracking-tight">Lower A</h2>
            <p className="mt-2 text-background/70">
              Back squat, set 3 still open. 145 lb is in the log for set 2.
            </p>
          </div>
        </Link>
        <Link
          href="/app/weight"
          className="grid content-between gap-6 border border-border bg-card p-6 lg:col-span-2"
        >
          <p className="text-xs uppercase tracking-[0.16em] text-primary">
            Latest weigh-in
          </p>
          <p className="font-display text-6xl tabular-nums tracking-tight">
            {latest.weight}
            <span className="ml-2 font-sans text-lg text-muted-foreground">
              {member.units}
            </span>
          </p>
          <p className="text-sm text-muted-foreground">{latest.date}</p>
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
          {foundation.map((workout) => (
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
        <p className="text-sm text-muted-foreground">
          Also on your membership: {programs[1].title}.
        </p>
      </section>
    </div>
  );
}

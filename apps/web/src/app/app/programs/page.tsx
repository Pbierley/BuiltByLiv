import Link from "next/link";
import { listPrograms, listWorkouts } from "@/lib/queries";

export const metadata = { title: "Programs" };

export default async function ProgramsPage() {
  const programs = await listPrograms();
  const workouts = await listWorkouts();

  return (
    <div className="grid gap-8">
      <div>
        <p className="text-xs uppercase tracking-[0.16em] text-primary">
          Library
        </p>
        <h1 className="mt-2 font-display text-4xl tracking-tight">Programs</h1>
        <p className="mt-2 max-w-xl text-muted-foreground">
          Open any workout. Nothing is locked to a calendar day.
        </p>
      </div>
      <ul className="grid gap-4">
        {programs.map((program) => {
          const days = workouts.filter((workout) => workout.programId === program.id);
          return (
            <li key={program.id}>
              <Link
                href={`/app/programs/${program.id}`}
                className="grid gap-3 border border-border bg-card p-5 hover:border-foreground"
              >
                <div className="flex items-baseline justify-between gap-4">
                  <h2 className="font-display text-3xl tracking-tight">
                    {program.title}
                  </h2>
                  <p className="text-sm text-muted-foreground">{program.days}</p>
                </div>
                <p className="max-w-2xl leading-7 text-muted-foreground">
                  {program.description}
                </p>
                <p className="text-sm">
                  {days.map((workout) => workout.title).join(" · ")}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

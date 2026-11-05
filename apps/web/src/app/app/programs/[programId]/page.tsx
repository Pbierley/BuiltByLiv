import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageFallback } from "@/components/page-fallback";
import {
  getProgram,
  prescriptionLabel,
  programs,
  workoutsFor,
} from "@/lib/content";

export const metadata = { title: "Program" };

export function generateStaticParams() {
  return programs.map((program) => ({ programId: program.id }));
}

export default function Page({
  params,
}: {
  params: Promise<{ programId: string }>;
}) {
  return (
    <Suspense fallback={<PageFallback />}>
      <ProgramDetail params={params} />
    </Suspense>
  );
}

async function ProgramDetail({
  params,
}: {
  params: Promise<{ programId: string }>;
}) {
  const { programId } = await params;
  const program = getProgram(programId);
  if (!program) notFound();
  const days = workoutsFor(program.id);

  return (
    <div className="grid gap-8">
      <div>
        <Link
          href="/app/programs"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          All programs
        </Link>
        <h1 className="mt-2 font-display text-4xl tracking-tight sm:text-5xl">
          {program.title}
        </h1>
        <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">
          {program.description}
        </p>
      </div>
      <ol className="divide-y divide-border border border-border bg-card">
        {days.map((workout, index) => (
          <li key={workout.id}>
            <Link
              href={`/app/workouts/${workout.id}`}
              className="grid gap-2 px-4 py-4 hover:bg-secondary/60 lg:grid-cols-[auto_1fr_auto] lg:items-center lg:gap-6"
            >
              <span className="font-display text-2xl text-primary">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span>
                <span className="block font-medium">{workout.title}</span>
                <span className="text-sm text-muted-foreground">
                  {workout.summary}
                </span>
              </span>
              <span className="text-sm text-muted-foreground">
                {workout.exercises.length} exercises ·{" "}
                {prescriptionLabel(workout.exercises[0])}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}

import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageFallback } from "@/components/page-fallback";
import { PhaseWorkoutList } from "@/components/phase-workout-list";
import { programs } from "@/lib/content";
import { getViewer, listPhases, listPrograms, listWorkouts } from "@/lib/queries";

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
  const viewer = await getViewer();
  if (!viewer) return null;
  const programsFromDb = await listPrograms();
  const program = programsFromDb.find((item) => item.id === programId);
  if (!program) notFound();
  const [days, phases] = await Promise.all([
    listWorkouts(program.id),
    listPhases(program.id),
  ]);

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
        {phases.length ? (
          <p className="mt-3 text-sm text-primary">
            Week {viewer.programWeek} · Phase {viewer.currentPhase}
          </p>
        ) : null}
      </div>
      <PhaseWorkoutList
        workouts={days}
        phases={phases}
        currentPhase={viewer.currentPhase}
        role={viewer.role}
      />
    </div>
  );
}

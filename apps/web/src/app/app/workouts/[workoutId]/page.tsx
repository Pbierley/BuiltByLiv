import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageFallback } from "@/components/page-fallback";
import { WorkoutSession } from "@/components/workout-session";
import { workouts } from "@/lib/content";
import { memberLocked } from "@/lib/phases";
import { getViewer, getWorkoutForViewer } from "@/lib/queries";

export const metadata = { title: "Workout" };

export function generateStaticParams() {
  return workouts.map((workout) => ({ workoutId: workout.id }));
}

export default function Page({
  params,
}: {
  params: Promise<{ workoutId: string }>;
}) {
  return (
    <Suspense fallback={<PageFallback />}>
      <WorkoutDetail params={params} />
    </Suspense>
  );
}

async function WorkoutDetail({
  params,
}: {
  params: Promise<{ workoutId: string }>;
}) {
  const { workoutId } = await params;
  const viewer = await getViewer();
  if (!viewer) return null;
  const workout = await getWorkoutForViewer(workoutId, viewer);
  if (!workout) notFound();
  if (memberLocked(workout.phasePosition, viewer)) {
    return (
      <div className="grid max-w-xl gap-4">
        <h1 className="font-display text-4xl tracking-tight">{workout.title}</h1>
        <p className="leading-7 text-muted-foreground">
          {workout.phaseTitle ?? "This phase"} opens in week {workout.phaseStartsWeek}.
          It stays locked until your program reaches that phase.
        </p>
        <Link
          href={`/app/programs/${workout.programId}`}
          className="text-sm text-primary"
        >
          Back to the program
        </Link>
      </div>
    );
  }
  return <WorkoutSession workout={workout} unit={viewer.unit} />;
}

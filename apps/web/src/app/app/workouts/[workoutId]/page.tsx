import { Suspense } from "react";
import { notFound } from "next/navigation";
import { PageFallback } from "@/components/page-fallback";
import { WorkoutSession } from "@/components/workout-session";
import { workouts } from "@/lib/content";
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
  return <WorkoutSession workout={workout} unit={viewer.unit} />;
}

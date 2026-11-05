import { Suspense } from "react";
import { notFound } from "next/navigation";
import { PageFallback } from "@/components/page-fallback";
import { WorkoutSession } from "@/components/workout-session";
import { getWorkout, member, workouts } from "@/lib/content";

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
  const workout = getWorkout(workoutId);
  if (!workout) notFound();
  return <WorkoutSession workout={workout} unit={member.units} />;
}

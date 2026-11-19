import { Suspense } from "react";
import { AdminStudio } from "@/components/admin-studio";
import { PageFallback } from "@/components/page-fallback";
import { SetupNeeded } from "@/components/setup-needed";
import {
  ConfigError,
  getPaymentSettings,
  getViewer,
  listInvites,
  listPhases,
  listPrograms,
  listThreads,
  listWorkouts,
} from "@/lib/queries";

export const metadata = { title: "Admin" };

export default function AdminPage() {
  return (
    <Suspense fallback={<PageFallback />}>
      <AdminFrame />
    </Suspense>
  );
}

async function AdminFrame() {
  let viewer;
  try {
    viewer = await getViewer();
  } catch (error) {
    if (error instanceof ConfigError) return <SetupNeeded />;
    throw error;
  }
  if (!viewer) return null;
  const [programs, workouts, threads, phases, payment, invites] = await Promise.all([
    listPrograms(),
    listWorkouts(),
    listThreads(viewer.id),
    listPhases(),
    getPaymentSettings(),
    listInvites(),
  ]);
  return (
    <AdminStudio
      programs={programs}
      workouts={workouts}
      threads={threads}
      phases={phases}
      username={payment.username}
      qrUrl={payment.qrUrl}
      invites={invites}
    />
  );
}

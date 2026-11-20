import { Suspense } from "react";
import { redirect } from "next/navigation";
import { MemberShell } from "@/components/member-shell";
import { TrialEnded } from "@/components/trial-ended";
import { PageFallback } from "@/components/page-fallback";
import { SetupNeeded } from "@/components/setup-needed";
import { ConfigError, getViewer } from "@/lib/queries";

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<PageFallback />}>
      <MemberFrame>{children}</MemberFrame>
    </Suspense>
  );
}

async function MemberFrame({ children }: { children: React.ReactNode }) {
  let viewer;
  try {
    viewer = await getViewer();
  } catch (error) {
    if (error instanceof ConfigError) return <SetupNeeded />;
    throw error;
  }
  if (!viewer) redirect("/login");
  if (!viewer.acknowledged) redirect("/acknowledge");
  if (viewer.blocked) return <TrialEnded email={viewer.email} />;
  return <MemberShell viewer={viewer}>{children}</MemberShell>;
}

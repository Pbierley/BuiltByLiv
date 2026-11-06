import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SetupNeeded } from "@/components/setup-needed";
import { acknowledgeCoaching } from "@/lib/actions";
import { ConfigError, getViewer } from "@/lib/queries";

export const metadata = { title: "Before you start" };

export default function AcknowledgePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <Suspense fallback={<div className="px-5 py-16 text-sm text-muted-foreground">Loading</div>}>
      <AcknowledgeContent searchParams={searchParams} />
    </Suspense>
  );
}

async function AcknowledgeContent({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const failed = (await searchParams).error === "1";
  try {
    const viewer = await getViewer();
    if (!viewer) redirect("/login");
    if (viewer.acknowledged) redirect("/app");
  } catch (error) {
    if (error instanceof ConfigError) return <SetupNeeded />;
    throw error;
  }

  return (
    <div className="mx-auto grid w-full max-w-md gap-6 px-5 py-16">
      <h1 className="font-display text-4xl tracking-tight">Before you start</h1>
      <p className="leading-7 text-muted-foreground">
        This is fitness coaching, not medical advice. Get cleared for exercise
        before you start.
      </p>
      {failed ? (
        <p className="text-sm text-destructive">That acknowledgement could not be saved.</p>
      ) : null}
      <form action={acknowledgeCoaching}>
        <Button className="h-11" type="submit">
          I understand
        </Button>
      </form>
    </div>
  );
}

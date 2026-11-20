import { Suspense } from "react";
import { VenmoPayPanel } from "@/components/venmo-pay-panel";
import { SetupNeeded } from "@/components/setup-needed";
import { membership } from "@/lib/content";
import { ConfigError, getPaymentSettings, getViewer } from "@/lib/queries";

export const metadata = { title: "Pay with Venmo" };

export default function PayPage() {
  return (
    <Suspense fallback={<div className="px-5 py-16 text-sm text-muted-foreground">Loading</div>}>
      <PayContent />
    </Suspense>
  );
}

async function PayContent() {
  let qrUrl: string | null = null;
  try {
    qrUrl = (await getPaymentSettings()).qrUrl;
  } catch (error) {
    if (error instanceof ConfigError) return <SetupNeeded />;
    throw error;
  }

  let email: string | null = null;
  try {
    email = (await getViewer())?.email ?? null;
  } catch (error) {
    if (!(error instanceof ConfigError)) throw error;
  }

  return (
    <VenmoPayPanel
      email={email}
      qrUrl={qrUrl}
      eyebrow="Membership"
      title="Pay with Venmo"
      description={`The membership is $${membership.price} a ${membership.interval}. Pay Liv on Venmo. This site does not collect the payment. Access starts after Liv confirms it.`}
    />
  );
}

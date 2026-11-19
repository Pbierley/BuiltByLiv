import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { SetupNeeded } from "@/components/setup-needed";
import { membership, venmo, venmoNote } from "@/lib/content";
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

  const note = email ? venmoNote(email) : "Built By Liv (your email)";

  return (
    <div className="mx-auto grid w-full max-w-xl gap-6 px-5 py-16">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-primary">Membership</p>
        <h1 className="mt-3 font-display text-5xl tracking-tight">Pay with Venmo</h1>
        <p className="mt-4 leading-7 text-muted-foreground">
          The membership is ${membership.price} a {membership.interval}. Pay Liv
          on Venmo. This site does not collect the payment. Access starts after
          Liv sends an invite.
        </p>
      </div>
      <div className="grid gap-4 border border-border bg-card p-5">
        <p className="font-display text-4xl tracking-tight">
          ${membership.price}
          <span className="text-lg text-muted-foreground"> / {membership.interval}</span>
        </p>
        <div className="grid gap-2">
          <p className="text-sm font-medium">What to put in the Venmo note</p>
          <p className="border border-border bg-background px-3 py-3 text-sm leading-6">
            {note}
          </p>
          <p className="text-sm leading-6 text-muted-foreground">
            {email
              ? "Copy that note into the Venmo payment. Liv matches it to your account, then sends your invite."
              : "Replace “your email” with the email you use on this site, then put that full note on the Venmo payment."}
          </p>
        </div>
        <Button className="h-12" asChild>
          <a href={venmo.url} target="_blank" rel="noreferrer">
            Pay ${membership.price} on Venmo
          </a>
        </Button>
        <p className="text-sm leading-6 text-muted-foreground">
          This opens @{venmo.username} at {venmo.url}.
        </p>
        {qrUrl ? (
          <img
            src={qrUrl}
            alt={`Venmo QR code for @${venmo.username}`}
            className="h-56 w-56 border border-border object-contain"
          />
        ) : null}
      </div>
    </div>
  );
}

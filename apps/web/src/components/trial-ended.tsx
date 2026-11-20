import { Button } from "@/components/ui/button";
import { VenmoPayPanel } from "@/components/venmo-pay-panel";
import { membership } from "@/lib/content";
import { signOut } from "@/lib/actions";
import { getPaymentSettings } from "@/lib/queries";

export async function TrialEnded({ email }: { email: string }) {
  let qrUrl: string | null = null;
  try {
    qrUrl = (await getPaymentSettings()).qrUrl;
  } catch {
    qrUrl = null;
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <VenmoPayPanel
        email={email}
        qrUrl={qrUrl}
        eyebrow="Trial ended"
        title="Pay to continue"
        description={`The ${membership.trialDays}-day trial is over. The workouts stay locked until you pay Liv $${membership.price} on Venmo. She matches the note to this account and turns access back on.`}
      />
      <form action={signOut} className="mx-auto -mt-8 mb-16 w-full max-w-xl px-5">
        <Button type="submit" variant="outline" className="h-11">
          Log out
        </Button>
      </form>
    </div>
  );
}

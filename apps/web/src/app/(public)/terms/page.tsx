import { membership } from "@/lib/content";

export const metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <article className="mx-auto grid w-full max-w-2xl gap-4 px-5 py-16 leading-7">
      <h1 className="font-display text-5xl tracking-tight">Terms</h1>
      <p>
        The membership is ${membership.price} per {membership.interval} after a{" "}
        {membership.trialDays}-day trial. A payment method is required to start
        the trial. Cancel before the trial ends and you are not charged. After
        that, the membership renews until you cancel.
      </p>
      <p>
        On the website, billing is by card. In the iOS app, membership is
        purchased through Apple. On Android, it is purchased through Google
        Play. An account that already has an active membership can sign in on
        any of them.
      </p>
      <p>
        Training content is coaching, not medical care. You are responsible for
        training within your own limits.
      </p>
    </article>
  );
}

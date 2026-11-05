export const metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <article className="mx-auto grid w-full max-w-2xl gap-4 px-5 py-16 leading-7">
      <h1 className="font-display text-5xl tracking-tight">Privacy</h1>
      <p>
        Built by Liv stores the account details you give us, your membership
        status, the workouts you log, and your body-weight entries. Liv cannot
        open another member&apos;s logs.
      </p>
      <p>
        Card numbers are handled by the payment provider. This preview does not
        collect them. Video is streamed to signed-in members with an active
        trial or membership.
      </p>
      <p>
        You can delete your account from the account screen. Deleting it removes
        your profile, weigh-ins, and workout logs.
      </p>
    </article>
  );
}

import { Button } from "@/components/ui/button";
import { membership, venmo, venmoNote } from "@/lib/content";

export function VenmoPayPanel({
  email,
  qrUrl,
  eyebrow,
  title,
  description,
}: {
  email: string | null;
  qrUrl: string | null;
  eyebrow: string;
  title: string;
  description: string;
}) {
  const note = email ? venmoNote(email) : "Built By Liv (your email)";

  return (
    <div className="mx-auto grid w-full max-w-xl gap-6 px-5 py-16">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
        <h1 className="mt-3 font-display text-5xl tracking-tight">{title}</h1>
        <p className="mt-4 leading-7 text-muted-foreground">{description}</p>
      </div>
      <div className="grid gap-4 border border-border bg-card p-5">
        <p className="font-display text-4xl tracking-tight">
          ${membership.price}
          <span className="text-lg text-muted-foreground"> / {membership.interval}</span>
        </p>
        <div className="grid gap-2">
          <p className="text-sm font-medium">What to put in the Venmo note</p>
          <p className="border border-border bg-background px-3 py-3 text-sm leading-6">{note}</p>
          <p className="text-sm leading-6 text-muted-foreground">
            {email
              ? "Copy that note into the Venmo payment. Liv matches it to your account and turns access back on."
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

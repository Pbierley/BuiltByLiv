import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/field";
import { membership } from "@/lib/content";

export const metadata = { title: "Start trial" };

export default function CheckoutPage() {
  return (
    <div className="mx-auto grid w-full max-w-5xl gap-10 px-5 py-16 lg:grid-cols-2">
      <section>
        <p className="text-xs uppercase tracking-[0.18em] text-primary">
          Free week
        </p>
        <h1 className="mt-3 font-display text-5xl tracking-tight">
          Add a card to start.
        </h1>
        <p className="mt-4 max-w-md leading-7 text-muted-foreground">
          Nothing is charged today. On day {membership.trialDays + 1} the
          membership renews at ${membership.price} a {membership.interval} until
          you cancel.
        </p>
        <dl className="mt-8 grid gap-4 border border-border bg-card p-5 text-sm">
          <Row label="Today" value="$0.00" />
          <Row
            label={`After ${membership.trialDays} days`}
            value={`$${membership.price}.00`}
          />
          <Row label="Then" value={`$${membership.price} / ${membership.interval}`} />
          <Row
            label="How to cancel"
            value="Account, then Billing, before the trial ends"
          />
        </dl>
      </section>

      <div className="grid gap-4 border border-border bg-card p-5">
        <Field label="Name on card" htmlFor="card-name">
          <Input id="card-name" autoComplete="cc-name" className="h-11" />
        </Field>
        <Field label="Card number" htmlFor="card-number">
          <Input
            id="card-number"
            inputMode="numeric"
            autoComplete="cc-number"
            placeholder="1234 1234 1234 1234"
            className="h-11"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Expiry" htmlFor="card-expiry">
            <Input
              id="card-expiry"
              autoComplete="cc-exp"
              placeholder="MM / YY"
              className="h-11"
            />
          </Field>
          <Field label="CVC" htmlFor="card-cvc">
            <Input
              id="card-cvc"
              inputMode="numeric"
              autoComplete="cc-csc"
              placeholder="123"
              className="h-11"
            />
          </Field>
        </div>
        <p className="text-sm leading-6 text-muted-foreground">
          By starting the trial you agree to be charged ${membership.price} on
          day {membership.trialDays + 1}, then every {membership.interval}, until
          you cancel. Cancel from Account → Billing and you will not be charged
          for a trial you end in time.
        </p>
        <Button className="h-12" asChild>
          <Link href="/app">Start {membership.trialDays}-day trial</Link>
        </Button>
        <p className="text-xs text-muted-foreground">
          Preview only. This form does not send or store a card.
        </p>
        <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground">
          Membership terms
        </Link>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 border-b border-border pb-3 last:border-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium sm:text-right">{value}</dd>
    </div>
  );
}

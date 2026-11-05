import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/field";
import { UnitToggle } from "@/components/unit-toggle";
import { member, membership } from "@/lib/content";

export const metadata = { title: "Account" };

export default function AccountPage() {
  return (
    <div className="grid max-w-2xl gap-10">
      <div>
        <p className="text-xs uppercase tracking-[0.16em] text-primary">
          Membership
        </p>
        <h1 className="mt-2 font-display text-4xl tracking-tight">Account</h1>
      </div>

      <section className="grid gap-4">
        <h2 className="font-display text-2xl tracking-tight">Profile</h2>
        <Field label="Name" htmlFor="name">
          <Input id="name" className="h-11" defaultValue={member.name} />
        </Field>
        <Field label="Email" htmlFor="email">
          <Input
            id="email"
            type="email"
            className="h-11"
            defaultValue={member.email}
          />
        </Field>
        <div className="grid gap-2">
          <p className="text-sm font-medium">Units</p>
          <UnitToggle initial={member.units} />
        </div>
        <Button className="h-11 w-fit" type="button">
          Save profile
        </Button>
      </section>

      <section className="grid gap-3 border border-border bg-card p-5">
        <h2 className="font-display text-2xl tracking-tight">Billing</h2>
        <p className="text-sm leading-6">
          Trial, {member.trialDaysLeft} days left. Card ending {member.cardLast4}.
          On day 8 the membership is ${membership.price} a {membership.interval}.
          Cancel before the trial ends and you will not be charged.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" asChild>
            <Link href="/checkout">Update payment method</Link>
          </Button>
          <Button variant="ghost" type="button">
            Cancel trial
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          If you subscribed in the App Store or Google Play, cancel there. This
          screen can only change a card billed on the website.
        </p>
      </section>

      <section className="grid gap-3 border border-destructive/40 p-5">
        <h2 className="font-display text-2xl tracking-tight">Delete account</h2>
        <p className="text-sm leading-6 text-muted-foreground">
          Deletes your profile, body-weight entries, and workout logs. A website
          subscription would be canceled with it. An App Store or Play
          subscription has to be canceled in that store.
        </p>
        <details>
          <summary className="text-sm font-medium text-primary">
            I want to delete this account
          </summary>
          <div className="mt-4 grid gap-3">
            <p className="text-sm">
              This cannot be undone. Your history will not come back if you
              sign up again.
            </p>
            <Button variant="destructive" className="w-fit" type="button">
              Delete account
            </Button>
          </div>
        </details>
      </section>

      <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground">
        Open content admin
      </Link>
    </div>
  );
}

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/field";
import { SocialAuth } from "@/components/social-auth";
import { UnitToggle } from "@/components/unit-toggle";
import { Separator } from "@/components/ui/separator";

export const metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <div className="mx-auto grid w-full max-w-md gap-6 px-5 py-16">
      <div>
        <h1 className="font-display text-4xl tracking-tight">Create your account</h1>
        <p className="mt-2 text-muted-foreground">
          Next you will confirm your email, then add a card for the free week.
        </p>
      </div>
      <SocialAuth />
      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
          or email
        </span>
        <Separator className="flex-1" />
      </div>
      <div className="grid gap-4">
        <Field label="Name" htmlFor="name">
          <Input id="name" name="name" autoComplete="name" className="h-11" />
        </Field>
        <Field label="Email" htmlFor="email">
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            className="h-11"
          />
        </Field>
        <Field label="Password" htmlFor="password">
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            className="h-11"
          />
        </Field>
        <div className="grid gap-2">
          <p className="text-sm font-medium">Units</p>
          <UnitToggle />
          <p className="text-sm text-muted-foreground">
            Used for body weight and for loads you log on exercises.
          </p>
        </div>
        <label className="flex gap-3 text-sm leading-6">
          <input
            type="checkbox"
            defaultChecked
            className="mt-1 size-4 accent-primary"
          />
          <span>
            I understand this is fitness coaching, not medical advice, and I
            will get cleared for exercise before I start.
          </span>
        </label>
        <Button className="h-11" asChild>
          <Link href="/verify">Create account</Link>
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Already training?{" "}
        <Link href="/login" className="text-foreground underline-offset-4 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}

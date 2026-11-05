"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/field";
import { UnitToggle } from "@/components/unit-toggle";
import {
  requestPasswordReset,
  signIn,
  signUp,
  updatePassword,
  type ActionResult,
} from "@/lib/actions";

export function SignupForm() {
  const [state, action, pending] = useActionState(submit(signUp), undefined);
  return (
    <form action={action} className="grid gap-4">
      <Field label="Name" htmlFor="name">
        <Input id="name" name="name" autoComplete="name" className="h-11" required maxLength={80} />
      </Field>
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" className="h-11" required />
      </Field>
      <Field label="Password" htmlFor="password">
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          className="h-11"
          required
          minLength={12}
          maxLength={72}
        />
      </Field>
      <p className="text-sm text-muted-foreground">
        Use 12 to 72 characters, with a letter and a number. The password is
        hashed before it is stored, and it cannot be read back.
      </p>
      <div className="grid gap-2">
        <p className="text-sm font-medium">Units</p>
        <UnitToggle name="unit" />
      </div>
      <label className="flex gap-3 text-sm leading-6">
        <input type="checkbox" name="coaching" required className="mt-1 size-4 accent-primary" />
        <span>
          I understand this is fitness coaching, not medical advice, and I will
          get cleared for exercise before I start.
        </span>
      </label>
      <FormError message={state?.error} />
      <Button className="h-11" type="submit" disabled={pending}>
        {pending ? "Creating account" : "Create account"}
      </Button>
    </form>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(submit(signIn), undefined);
  return (
    <form action={action} className="grid gap-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <Field label="Email" htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          className="h-11"
          placeholder="you@email.com"
          required
        />
      </Field>
      <Field label="Password" htmlFor="password">
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          className="h-11"
          required
        />
      </Field>
      <Link href="/forgot" className="text-sm text-muted-foreground hover:text-foreground">
        Forgot password
      </Link>
      <FormError message={state?.error} />
      <Button className="h-11" type="submit" disabled={pending}>
        {pending ? "Logging in" : "Log in"}
      </Button>
    </form>
  );
}

export function ForgotForm() {
  const [state, action, pending] = useActionState(submit(requestPasswordReset), undefined);
  return (
    <form action={action} className="grid gap-4">
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" className="h-11" required />
      </Field>
      <FormError message={state?.error} />
      <Button className="h-11" type="submit" disabled={pending}>
        {pending ? "Sending" : "Send reset link"}
      </Button>
    </form>
  );
}

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(submit(updatePassword), undefined);
  return (
    <form action={action} className="grid gap-4">
      <Field label="New password" htmlFor="password">
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          className="h-11"
          required
          minLength={12}
          maxLength={72}
        />
      </Field>
      <FormError message={state?.error} />
      <Button className="h-11" type="submit" disabled={pending}>
        {pending ? "Saving" : "Save password"}
      </Button>
    </form>
  );
}

function submit(action: (formData: FormData) => Promise<ActionResult>) {
  return async (_previous: ActionResult | undefined, formData: FormData) => action(formData);
}

function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-sm text-destructive">
      {message}
    </p>
  );
}

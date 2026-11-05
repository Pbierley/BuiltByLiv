import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/field";
import { SocialAuth } from "@/components/social-auth";
import { Separator } from "@/components/ui/separator";

export const metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <div className="mx-auto grid w-full max-w-md gap-6 px-5 py-16">
      <div>
        <h1 className="font-display text-4xl tracking-tight">Log in</h1>
        <p className="mt-2 text-muted-foreground">
          The same account works on the website and in the apps.
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
        <Field label="Email" htmlFor="email">
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            className="h-11"
            placeholder="you@email.com"
          />
        </Field>
        <Field label="Password" htmlFor="password">
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            className="h-11"
          />
        </Field>
        <Link href="/forgot" className="text-sm text-muted-foreground hover:text-foreground">
          Forgot password
        </Link>
        <Button className="h-11" asChild>
          <Link href="/app">Log in</Link>
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        New here?{" "}
        <Link href="/signup" className="text-foreground underline-offset-4 hover:underline">
          Start a trial
        </Link>
      </p>
    </div>
  );
}

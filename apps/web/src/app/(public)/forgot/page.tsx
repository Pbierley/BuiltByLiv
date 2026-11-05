import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/field";

export const metadata = { title: "Reset password" };

export default function ForgotPage() {
  return (
    <div className="mx-auto grid w-full max-w-md gap-6 px-5 py-16">
      <h1 className="font-display text-4xl tracking-tight">Reset your password</h1>
      <p className="text-muted-foreground">
        We will email you a link to choose a new one.
      </p>
      <div className="grid gap-4">
        <Field label="Email" htmlFor="email">
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            className="h-11"
          />
        </Field>
        <Button className="h-11" asChild>
          <Link href="/forgot/sent">Send reset link</Link>
        </Button>
      </div>
      <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
        Back to log in
      </Link>
    </div>
  );
}

import Link from "next/link";
import { SignupForm } from "@/components/auth-forms";
import { SocialAuth } from "@/components/social-auth";
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
      <SignupForm />
      <p className="text-sm text-muted-foreground">
        Already training?{" "}
        <Link href="/login" className="text-foreground underline-offset-4 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}

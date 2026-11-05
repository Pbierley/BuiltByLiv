import { Suspense } from "react";
import Link from "next/link";
import { LoginForm } from "@/components/auth-forms";
import { SocialAuth } from "@/components/social-auth";
import { Separator } from "@/components/ui/separator";

export const metadata = { title: "Log in" };

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  return (
    <Suspense fallback={<div className="px-5 py-16 text-sm text-muted-foreground">Loading</div>}>
      <LoginContent searchParams={searchParams} />
    </Suspense>
  );
}

async function LoginContent({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next = params.next;
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
      {params.error === "provider" ? (
        <p className="text-sm text-destructive">
          That sign-in option is not available yet. Use email instead.
        </p>
      ) : null}
      <LoginForm next={next?.startsWith("/") && !next.startsWith("//") ? next : undefined} />
      <p className="text-sm text-muted-foreground">
        New here?{" "}
        <Link href="/signup" className="text-foreground underline-offset-4 hover:underline">
          Start a trial
        </Link>
      </p>
    </div>
  );
}

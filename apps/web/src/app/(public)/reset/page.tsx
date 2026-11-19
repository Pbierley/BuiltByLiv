import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ResetPasswordForm } from "@/components/auth-forms";
import { InviteSession } from "@/components/invite-session";

export const metadata = { title: "Choose a password" };

export default function ResetPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; type?: string }>;
}) {
  return (
    <Suspense fallback={<div className="px-5 py-16 text-sm text-muted-foreground">Loading</div>}>
      <ResetContent searchParams={searchParams} />
    </Suspense>
  );
}

async function ResetContent({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; type?: string }>;
}) {
  const params = await searchParams;
  if (params.token_hash && params.type) {
    const next = new URLSearchParams({
      token_hash: params.token_hash,
      type: params.type,
      next: "/reset",
    });
    redirect(`/auth/callback?${next.toString()}`);
  }

  return (
    <div className="mx-auto grid w-full max-w-md gap-6 px-5 py-16">
      <h1 className="font-display text-4xl tracking-tight">Choose a password</h1>
      <p className="text-muted-foreground">
        Use this for a new invite or to replace a password. It is stored only as a hash.
      </p>
      <InviteSession />
      <ResetPasswordForm />
      <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
        Back to log in
      </Link>
    </div>
  );
}

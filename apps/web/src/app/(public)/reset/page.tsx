import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth-forms";

export const metadata = { title: "Choose a password" };

export default function ResetPage() {
  return (
    <div className="mx-auto grid w-full max-w-md gap-6 px-5 py-16">
      <h1 className="font-display text-4xl tracking-tight">Choose a new password</h1>
      <p className="text-muted-foreground">
        This replaces the old password. It is stored only as a hash.
      </p>
      <ResetPasswordForm />
      <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
        Back to log in
      </Link>
    </div>
  );
}

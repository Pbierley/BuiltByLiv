import Link from "next/link";
import { ForgotForm } from "@/components/auth-forms";

export const metadata = { title: "Reset password" };

export default function ForgotPage() {
  return (
    <div className="mx-auto grid w-full max-w-md gap-6 px-5 py-16">
      <h1 className="font-display text-4xl tracking-tight">Reset your password</h1>
      <p className="text-muted-foreground">
        We will email you a link to choose a new one.
      </p>
      <ForgotForm />
      <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
        Back to log in
      </Link>
    </div>
  );
}

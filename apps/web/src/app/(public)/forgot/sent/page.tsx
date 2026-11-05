import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Reset link sent" };

export default function ForgotSentPage() {
  return (
    <div className="mx-auto grid w-full max-w-md gap-6 px-5 py-16">
      <h1 className="font-display text-4xl tracking-tight">Check your email</h1>
      <p className="leading-7 text-muted-foreground">
        If an account uses that address, a reset link is on the way. It expires
        in an hour.
      </p>
      <Button className="h-11" asChild>
        <Link href="/login">Back to log in</Link>
      </Button>
    </div>
  );
}

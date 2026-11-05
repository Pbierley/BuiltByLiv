import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Check your email" };

export default function VerifyPage() {
  return (
    <div className="mx-auto grid w-full max-w-md gap-6 px-5 py-16">
      <p className="text-xs uppercase tracking-[0.18em] text-primary">
        One more step
      </p>
      <h1 className="font-display text-4xl tracking-tight">Check your email</h1>
      <p className="leading-7 text-muted-foreground">
        Confirm the address on your account before the trial starts. The link
        expires in a day. After that, you will add a payment method.
      </p>
      <Button className="h-11" asChild>
        <Link href="/checkout">Continue to checkout</Link>
      </Button>
      <Link href="/signup" className="text-sm text-muted-foreground hover:text-foreground">
        Use a different email
      </Link>
    </div>
  );
}

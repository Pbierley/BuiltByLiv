import Link from "next/link";
import { Button } from "@/components/ui/button";

export function SocialAuth() {
  return (
    <div className="grid gap-2">
      <Button variant="outline" className="h-11 bg-card" asChild>
        <Link href="/app">Continue with Apple</Link>
      </Button>
      <Button variant="outline" className="h-11 bg-card" asChild>
        <Link href="/app">Continue with Google</Link>
      </Button>
    </div>
  );
}

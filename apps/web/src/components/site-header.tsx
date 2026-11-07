import Link from "next/link";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-20 w-full max-w-6xl items-center justify-between gap-2 px-4 sm:px-5">
        <Logo />
        <nav className="flex shrink-0 items-center gap-1 sm:gap-3">
          <Button variant="ghost" className="px-2 sm:px-4" asChild>
            <Link href="/login">Log in</Link>
          </Button>
          <Button className="h-10 px-3 sm:px-4" asChild>
            <Link href="/signup">Start trial</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}

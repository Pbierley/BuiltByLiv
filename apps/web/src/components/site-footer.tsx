import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto grid w-full max-w-6xl gap-6 px-5 py-10 sm:grid-cols-[1fr_auto] sm:items-end">
        <div className="grid gap-3">
          <p className="font-display text-xl tracking-tight">Built by Liv</p>
          <p className="max-w-md text-sm leading-6 text-muted-foreground">
            Fitness coaching, not medical advice. Get cleared for exercise
            before you start, and stop if something hurts in a way that is not
            ordinary training effort.
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <Link href="/privacy" className="hover:text-primary">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-primary">
            Terms
          </Link>
          <Link href="/admin" className="hover:text-primary">
            Admin
          </Link>
        </nav>
      </div>
    </footer>
  );
}

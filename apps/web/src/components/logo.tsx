import Link from "next/link";
import { cn } from "cn";

export function Logo({
  className,
  href = "/",
}: {
  className?: string;
  href?: string;
}) {
  return (
    <Link
      href={href}
      className={cn("inline-flex items-center gap-2.5", className)}
    >
      <span className="grid size-8 place-items-center bg-primary font-display text-sm text-primary-foreground">
        L
      </span>
      <span className="font-display text-lg leading-none tracking-tight">
        Built by Liv
      </span>
    </Link>
  );
}

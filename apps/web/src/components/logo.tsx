import Image from "next/image";
import Link from "next/link";
import { cn } from "cn";

export function Logo({
  className,
  href = "/",
  markClassName,
}: {
  className?: string;
  href?: string;
  markClassName?: string;
}) {
  return (
    <Link
      href={href}
      aria-label="Built by Liv"
      className={cn("inline-flex items-center", className)}
    >
      <Image
        src="/logo.png"
        alt="Built by Liv"
        width={512}
        height={512}
        priority
        className={cn("size-14 object-contain sm:size-16", markClassName)}
      />
    </Link>
  );
}

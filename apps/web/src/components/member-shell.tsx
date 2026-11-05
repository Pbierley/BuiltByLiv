"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CircleUser,
  History,
  House,
  LayoutGrid,
  Scale,
} from "lucide-react";
import { cn } from "cn";
import { Logo } from "@/components/logo";

const items = [
  {
    href: "/app",
    label: "Home",
    icon: House,
    active: (path: string) => path === "/app",
  },
  {
    href: "/app/programs",
    label: "Programs",
    icon: LayoutGrid,
    active: (path: string) =>
      path.startsWith("/app/programs") || path.startsWith("/app/workouts"),
  },
  {
    href: "/app/weight",
    label: "Weight",
    icon: Scale,
    active: (path: string) => path.startsWith("/app/weight"),
  },
  {
    href: "/app/history",
    label: "History",
    icon: History,
    active: (path: string) => path.startsWith("/app/history"),
  },
  {
    href: "/app/account",
    label: "Account",
    icon: CircleUser,
    active: (path: string) => path.startsWith("/app/account"),
  },
];

export function MemberShell({
  children,
  viewer,
}: {
  children: React.ReactNode;
  viewer: { name: string; email: string; statusLabel: string };
}) {
  const path = usePathname();

  return (
    <div className="flex min-h-full flex-1 flex-col md:flex-row">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-card px-4 py-6 md:flex">
        <Logo href="/app" />
        <p className="mt-4 text-sm text-muted-foreground">
          {viewer.statusLabel}
        </p>
        <nav className="mt-8 grid gap-1">
          {items.map((item) => (
            <NavLink key={item.href} item={item} path={path} />
          ))}
        </nav>
        <p className="mt-auto pt-8 text-sm">
          <span className="block font-medium">{viewer.name}</span>
          <span className="text-muted-foreground">{viewer.email}</span>
        </p>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-3 md:hidden">
          <Logo href="/app" className="min-w-0 [&_span:last-child]:truncate" />
          <p className="shrink-0 text-sm text-muted-foreground">
            {viewer.statusLabel}
          </p>
        </header>
        <div className="mx-auto w-full min-w-0 max-w-5xl flex-1 px-4 py-6 pb-[calc(7rem+env(safe-area-inset-bottom))] md:px-8 md:py-10 md:pb-10">
          {children}
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] md:hidden">
        <ul className="grid grid-cols-5">
          {items.map((item) => {
            const active = item.active(path);
            const Icon = item.icon;
            return (
              <li key={item.href} className="min-w-0">
                <Link
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center gap-1 px-0.5 py-2.5 text-[10px] leading-tight sm:text-[11px]",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon className="size-5" aria-hidden />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

function NavLink({
  item,
  path,
}: {
  item: (typeof items)[number];
  path: string;
}) {
  const active = item.active(path);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm",
        active
          ? "bg-secondary font-medium text-foreground"
          : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground",
      )}
    >
      <Icon className="size-4" aria-hidden />
      {item.label}
    </Link>
  );
}

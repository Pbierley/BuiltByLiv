"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "cn";
import { AdminEditor } from "@/components/admin-editor";
import { ClientMessages } from "@/components/client-messages";

type Section = "workouts" | "clients";

export function AdminStudio() {
  const [section, setSection] = useState<Section>("workouts");
  const [waiting, setWaiting] = useState(3);

  return (
    <div className="min-h-full flex-1 bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-primary">
              Liv
            </p>
            <p className="font-display text-2xl tracking-tight">Admin</p>
          </div>
          <div className="flex gap-2" role="tablist" aria-label="Admin sections">
            <Tab
              pressed={section === "workouts"}
              onClick={() => setSection("workouts")}
            >
              Workouts
            </Tab>
            <Tab
              pressed={section === "clients"}
              onClick={() => setSection("clients")}
            >
              Clients{waiting > 0 ? ` (${waiting})` : ""}
            </Tab>
          </div>
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            View site
          </Link>
        </div>
      </header>
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-5 sm:py-8">
        <div className={section === "workouts" ? undefined : "hidden"}>
          <AdminEditor />
        </div>
        <div className={section === "clients" ? undefined : "hidden"}>
          <ClientMessages onWaitingChange={setWaiting} />
        </div>
      </div>
    </div>
  );
}

function Tab({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={pressed}
      onClick={onClick}
      className={cn(
        "h-10 border px-3 text-sm",
        pressed
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-card",
      )}
    >
      {children}
    </button>
  );
}

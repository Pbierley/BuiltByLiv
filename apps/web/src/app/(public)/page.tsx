import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  membership,
  prescriptionLabel,
  programs,
  workoutsFor,
} from "@/lib/content";

const steps = [
  {
    number: "01",
    title: "Create an account",
    copy: "Name, email, and a password. Pick pounds or kilograms once.",
  },
  {
    number: "02",
    title: "Add a card",
    copy: `The first ${membership.trialDays} days are free. You will see the price before you confirm.`,
  },
  {
    number: "03",
    title: "Train and write it down",
    copy: "Watch the demo, follow Liv's sets, and log weight, reps, or time.",
  },
];

export default function HomePage() {
  const featured = workoutsFor("strength-foundations");

  return (
    <div>
      <section className="mx-auto grid w-full max-w-6xl items-end gap-10 px-5 py-16 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:py-24">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-primary">
            Online training
          </p>
          <h1 className="mt-4 max-w-xl font-display text-5xl leading-[0.95] tracking-tight text-balance sm:text-7xl">
            Show up. Do the work. Write it down.
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-muted-foreground">
            Liv&apos;s programs, a demo for every exercise, and a log for the
            weight, the reps, or the time. One week free when you put a card
            on file.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button className="h-12 px-5 sm:w-auto" asChild>
              <Link href="/signup">Start the {membership.trialDays}-day trial</Link>
            </Button>
            <Button variant="outline" className="h-12 bg-card px-5 sm:w-auto" asChild>
              <Link href="/login">I already have an account</Link>
            </Button>
          </div>
        </div>

        <article className="border border-ink bg-ink p-5 text-background sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs uppercase tracking-[0.16em] text-background/60">
              Lower A · in progress
            </p>
            <Badge>Set 3 of 3</Badge>
          </div>
          <h2 className="mt-6 font-display text-4xl tracking-tight">
            Back squat
          </h2>
          <p className="mt-2 text-background/70">3 × 8 · 2 min rest</p>
          <div className="mt-6 grid gap-2">
            <SetRow set="1" detail="135 lb × 8" done />
            <SetRow set="2" detail="145 lb × 8" done />
            <SetRow set="3" detail="Log this set" />
          </div>
        </article>
      </section>

      <section className="border-y border-border bg-card">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-5 py-5 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p>
            <span className="font-medium">
              ${membership.price}/{membership.interval}
            </span>{" "}
            after {membership.trialDays} free days. A card is required to start.
          </p>
          <p className="text-muted-foreground">
            Cancel before the trial ends and you are not charged.
          </p>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-16 md:grid-cols-3">
        {steps.map((step) => (
          <article key={step.number} className="grid gap-3">
            <p className="font-display text-3xl text-primary">{step.number}</p>
            <h2 className="font-display text-3xl tracking-tight">{step.title}</h2>
            <p className="leading-7 text-muted-foreground">{step.copy}</p>
          </article>
        ))}
      </section>

      <section className="border-t border-border">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-16 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-primary">
              Inside a workout
            </p>
            <h2 className="mt-3 font-display text-4xl tracking-tight">
              The demo, the prescription, and your numbers stay on one screen.
            </h2>
          </div>
          <ul className="grid gap-px bg-border sm:grid-cols-3">
            <Info
              title="Video"
              copy="Play, pause, and scrub a demo of the movement before the set."
            />
            <Info
              title="Liv's plan"
              copy="Sets, target reps or time, rest, and a note when the day needs one."
            />
            <Info
              title="Your log"
              copy="Weight and reps, reps only, or a timer. Extra sets are allowed."
            />
          </ul>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-5 py-16">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-primary">
              Sample program
            </p>
            <h2 className="mt-3 font-display text-4xl tracking-tight">
              {programs[0].title}
            </h2>
          </div>
          <Button variant="outline" className="hidden bg-card sm:inline-flex" asChild>
            <Link href="/signup">Train this</Link>
          </Button>
        </div>
        <ul className="mt-8 divide-y divide-border border border-border bg-card">
          {featured.map((workout) => (
              <li
                key={workout.id}
                className="flex flex-col gap-1 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
              >
                <div className="min-w-0">
                  <p className="font-medium">{workout.title}</p>
                  <p className="text-sm text-muted-foreground">{workout.summary}</p>
                </div>
                <p className="shrink-0 text-sm text-muted-foreground">
                  {workout.exercises.length} exercises ·{" "}
                  {prescriptionLabel(workout.exercises[0])}
                </p>
              </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function SetRow({
  set,
  detail,
  done = false,
}: {
  set: string;
  detail: string;
  done?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border border-background/15 px-3 py-3 text-sm">
      <span className="text-background/60">Set {set}</span>
      <span className={done ? "text-background" : "text-primary"}>{detail}</span>
    </div>
  );
}

function Info({ title, copy }: { title: string; copy: string }) {
  return (
    <li className="bg-background p-5">
      <h3 className="font-display text-2xl tracking-tight">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy}</p>
    </li>
  );
}

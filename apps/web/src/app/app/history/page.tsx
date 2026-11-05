import Link from "next/link";
import { sessionHistory } from "@/lib/content";

export const metadata = { title: "History" };

export default function HistoryPage() {
  return (
    <div className="grid gap-8">
      <div>
        <p className="text-xs uppercase tracking-[0.16em] text-primary">
          Completed sessions
        </p>
        <h1 className="mt-2 font-display text-4xl tracking-tight">History</h1>
        <p className="mt-2 max-w-xl text-muted-foreground">
          What you logged. Liv&apos;s prescription stays on the workout, and
          these rows stay yours.
        </p>
      </div>
      <ul className="divide-y divide-border border border-border bg-card">
        {sessionHistory.map((session) => (
          <li key={session.id}>
            <Link
              href={`/app/workouts/${session.workoutId}`}
              className="grid gap-1 px-4 py-4 hover:bg-secondary/60"
            >
              <span className="flex items-baseline justify-between gap-4">
                <span className="font-medium">{session.title}</span>
                <span className="text-sm text-muted-foreground">
                  {session.date}
                </span>
              </span>
              <span className="text-sm leading-6 text-muted-foreground">
                {session.detail}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

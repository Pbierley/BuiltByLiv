import Link from "next/link";
import { getViewer, listHistory } from "@/lib/queries";

export const metadata = { title: "History" };

export default async function HistoryPage() {
  const viewer = await getViewer();
  if (!viewer) return null;
  const sessions = await listHistory(viewer);

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
      {sessions.length ? (
        <ul className="divide-y divide-border border border-border bg-card">
          {sessions.map((session) => (
            <li key={session.id}>
              <Link
                href={`/app/workouts/${session.workoutId}`}
                className="grid gap-1 px-4 py-4 hover:bg-secondary/60"
              >
                <span className="flex items-baseline justify-between gap-4">
                  <span className="font-medium">{session.title}</span>
                  <span className="text-sm text-muted-foreground">{session.date}</span>
                </span>
                <span className="text-sm leading-6 text-muted-foreground">
                  {session.detail}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          Completed workouts will show up here.
        </p>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { sendMessage } from "@/lib/actions";
import { cn } from "cn";

type Note = {
  id: string;
  from: "liv" | "client";
  at: string;
  body: string;
};

export type Thread = {
  id: string;
  name: string;
  email: string;
  status: "Trial" | "Member";
  messages: Note[];
};

export function ClientMessages({
  threads: initialThreads,
  onWaitingChange,
}: {
  threads: Thread[];
  onWaitingChange?: (waiting: number) => void;
}) {
  const [threads, setThreads] = useState(initialThreads);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const selected = threads.find((thread) => thread.id === selectedId) ?? null;

  useEffect(() => {
    const waiting = threads.filter(
      (thread) => thread.messages.at(-1)?.from === "client",
    ).length;
    onWaitingChange?.(waiting);
  }, [threads, onWaitingChange]);

  async function send() {
    const body = draft.trim();
    if (!body || !selected) return;
    const result = await sendMessage(selected.id, body);
    if (result.error) {
      setError(result.error);
      return;
    }
    setError("");
    setThreads((current) =>
      current.map((thread) =>
        thread.id === selected.id
          ? {
              ...thread,
              messages: [
                ...thread.messages,
                { id: `liv-${thread.messages.length + 1}`, from: "liv", at: "Now", body },
              ],
            }
          : thread,
      ),
    );
    setDraft("");
  }

  return (
    <div className="grid min-w-0 gap-4 md:grid-cols-[16rem_minmax(0,1fr)]">
      <div className={cn("grid content-start gap-3", selected && "hidden md:grid")}>
        <div>
          <h2 className="font-display text-3xl tracking-tight">Clients</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Write coaching notes. Replies stay on this screen for this visit
            and are not delivered. Weigh-ins and set logs stay private to the
            member.
          </p>
        </div>
        <ul className="grid gap-2">
          {threads.map((thread) => {
            const last = thread.messages.at(-1);
            const waiting = last?.from === "client";
            return (
              <li key={thread.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(thread.id);
                    setDraft("");
                  }}
                  className="grid w-full gap-1 border border-border bg-card px-3 py-3 text-left"
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-medium">{thread.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {thread.status}
                    </span>
                  </span>
                  <span className="line-clamp-2 text-sm text-muted-foreground">
                    {last?.body}
                  </span>
                  {waiting ? (
                    <span className="text-xs text-primary">Waiting on you</span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <section
        className={cn(
          "grid min-w-0 content-start gap-4 border border-border bg-card p-4 sm:p-5",
          !selected && "hidden md:grid",
        )}
      >
        {selected ? (
          <>
            <div className="flex items-start justify-between gap-3">
              <div>
                <button
                  type="button"
                  className="mb-2 text-sm text-muted-foreground md:hidden"
                  onClick={() => setSelectedId(null)}
                >
                  All clients
                </button>
                <h2 className="font-display text-3xl tracking-tight">
                  {selected.name}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {selected.status} · {selected.email}
                </p>
              </div>
            </div>
            <ol className="grid gap-3">
              {selected.messages.map((message) => (
                <li
                  key={message.id}
                  className={cn(
                    "max-w-[36rem] border px-3 py-3 text-sm leading-6",
                    message.from === "liv"
                      ? "justify-self-end border-primary bg-primary text-primary-foreground"
                      : "justify-self-start border-border bg-background",
                  )}
                >
                  <p className="mb-1 text-xs opacity-70">
                    {message.from === "liv" ? "Liv" : selected.name} · {message.at}
                  </p>
                  {message.body}
                </li>
              ))}
            </ol>
            <div className="grid gap-3">
              <Textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                rows={3}
                placeholder={`Reply to ${selected.name.split(" ")[0]}`}
                aria-label={`Message to ${selected.name}`}
              />
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <Button type="button" className="h-11 w-fit" onClick={() => void send()}>
                Send
              </Button>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Choose a client to read the thread and reply.
          </p>
        )}
      </section>
    </div>
  );
}

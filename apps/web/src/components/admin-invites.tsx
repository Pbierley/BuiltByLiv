"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/field";
import { membership, venmo, venmoNote } from "@/lib/content";
import { inviteMember, saveVenmoSettings } from "@/lib/actions";

export function AdminInvites({
  username,
  qrUrl,
  invites,
}: {
  username: string | null;
  qrUrl: string | null;
  invites: {
    email: string;
    invitedAt: string;
    status: "invited" | "already_had_account";
  }[];
}) {
  const router = useRouter();
  const [venmoError, setVenmoError] = useState("");
  const [venmoSaved, setVenmoSaved] = useState(false);
  const [savingVenmo, setSavingVenmo] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");
  const [sending, setSending] = useState(false);

  return (
    <div className="grid max-w-3xl gap-10">
      <section className="grid gap-4">
        <div>
          <h2 className="font-display text-3xl tracking-tight">Venmo</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Members pay ${membership.price} a month at{" "}
            <a
              href={venmo.url}
              className="underline-offset-4 hover:underline"
              rel="noreferrer"
              target="_blank"
            >
              {venmo.url}
            </a>
            . They put {venmoNote("their email")} in the Venmo note. The site
            does not collect the payment. Liv checks Venmo, then sends an invite.
          </p>
        </div>
        <form
          key={`${username ?? ""}:${qrUrl ?? ""}`}
          className="grid gap-4 border border-border bg-card p-5"
          onSubmit={async (event) => {
            event.preventDefault();
            setSavingVenmo(true);
            setVenmoSaved(false);
            const result = await saveVenmoSettings(new FormData(event.currentTarget));
            setSavingVenmo(false);
            setVenmoError(result.error ?? "");
            setVenmoSaved(!result.error);
            if (!result.error) router.refresh();
          }}
        >
          <Field
            label="Venmo username"
            htmlFor="venmo-username"
            hint="Letters, numbers, and . _ -. A leading @ is removed."
          >
            <Input
              id="venmo-username"
              name="username"
              className="h-11"
              defaultValue={username ?? venmo.username}
              autoComplete="off"
              maxLength={40}
              placeholder={venmo.username}
            />
          </Field>
          {username ? (
            <p className="text-sm">
              <a
                href={`https://venmo.com/u/${encodeURIComponent(username)}`}
                className="underline-offset-4 hover:underline"
                rel="noreferrer"
                target="_blank"
              >
                venmo.com/u/{username}
              </a>
            </p>
          ) : null}
          {qrUrl ? (
            <img
              src={qrUrl}
              alt="Current Venmo QR code"
              className="h-40 w-40 border border-border object-contain"
            />
          ) : null}
          <Field label="QR image" htmlFor="venmo-qr" hint="PNG, JPEG, or WebP. 2 MB max.">
            <Input id="venmo-qr" name="qr" type="file" accept="image/png,image/jpeg,image/webp" />
          </Field>
          {qrUrl ? (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="removeQr" value="yes" className="size-4 accent-primary" />
              Remove the current QR
            </label>
          ) : null}
          {venmoError ? <p className="text-sm text-destructive">{venmoError}</p> : null}
          {venmoSaved ? <p className="text-sm text-muted-foreground">Saved.</p> : null}
          <div className="flex flex-wrap gap-3">
            <Button className="h-11" type="submit" disabled={savingVenmo}>
              {savingVenmo ? "Saving" : "Save Venmo"}
            </Button>
            <Button variant="outline" className="h-11" asChild>
              <Link href="/pay">Open pay page</Link>
            </Button>
          </div>
        </form>
      </section>

      <section className="grid gap-4">
        <div>
          <h2 className="font-display text-3xl tracking-tight">Invite</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Send an invite only after the Venmo payment is in. A new person gets
            an email to set a password. Someone who already has an account is
            marked active and is not invited again.
          </p>
        </div>
        <form
          className="grid gap-4 border border-border bg-card p-5"
          onSubmit={async (event) => {
            event.preventDefault();
            setSending(true);
            setInviteMessage("");
            const result = await inviteMember(new FormData(event.currentTarget));
            setSending(false);
            setInviteError(result.error ?? "");
            setInviteMessage(result.message ?? "");
            if (!result.error) {
              event.currentTarget.reset();
              router.refresh();
            }
          }}
        >
          <Field label="Email" htmlFor="invite-email">
            <Input
              id="invite-email"
              name="email"
              type="email"
              autoComplete="email"
              className="h-11"
              required
              maxLength={320}
            />
          </Field>
          <label className="flex gap-3 text-sm leading-6">
            <input
              type="checkbox"
              name="paid"
              value="yes"
              required
              className="mt-1 size-4 accent-primary"
            />
            <span>I confirmed this person paid ${membership.price} on Venmo.</span>
          </label>
          {inviteError ? <p className="text-sm text-destructive">{inviteError}</p> : null}
          {inviteMessage ? <p className="text-sm text-muted-foreground">{inviteMessage}</p> : null}
          <Button className="h-11 w-fit" type="submit" disabled={sending}>
            {sending ? "Sending" : "Send invite"}
          </Button>
        </form>
        {invites.length ? (
          <ul className="divide-y divide-border border border-border bg-card">
            {invites.map((invite) => (
              <li
                key={invite.email}
                className="flex flex-col gap-1 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <span>{invite.email}</span>
                <span className="text-muted-foreground">
                  {invite.status === "already_had_account"
                    ? "Already had an account"
                    : "Invite sent"}
                  {" · "}
                  {invite.invitedAt}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No invites yet.</p>
        )}
      </section>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/field";
import { UnitToggle } from "@/components/unit-toggle";
import { deleteAccount, saveProfile, sendMessage, signOut } from "@/lib/actions";

export function AccountPanel({
  viewer,
  messages,
}: {
  viewer: { id: string; name: string; email: string; unit: "lb" | "kg"; statusLabel: string };
  messages: { id: string; from: "liv" | "client"; at: string; body: string }[];
}) {
  const router = useRouter();
  const [profileError, setProfileError] = useState("");
  const [saved, setSaved] = useState(false);
  const [draft, setDraft] = useState("");
  const [messageError, setMessageError] = useState("");
  const [deleteError, setDeleteError] = useState("");

  return (
    <div className="grid max-w-2xl gap-10">
      <div>
        <p className="text-xs uppercase tracking-[0.16em] text-primary">{viewer.statusLabel}</p>
        <h1 className="mt-2 font-display text-4xl tracking-tight">Account</h1>
      </div>

      <form
        className="grid gap-4"
        onSubmit={async (event) => {
          event.preventDefault();
          const result = await saveProfile(new FormData(event.currentTarget));
          setProfileError(result.error ?? "");
          setSaved(!result.error);
          if (!result.error) router.refresh();
        }}
      >
        <h2 className="font-display text-2xl tracking-tight">Profile</h2>
        <Field label="Name" htmlFor="name">
          <Input id="name" name="name" className="h-11" defaultValue={viewer.name} required maxLength={80} />
        </Field>
        <Field label="Email" htmlFor="email">
          <Input id="email" type="email" className="h-11" value={viewer.email} readOnly />
        </Field>
        <div className="grid gap-2">
          <p className="text-sm font-medium">Units</p>
          <UnitToggle initial={viewer.unit} name="unit" />
        </div>
        {profileError ? <p className="text-sm text-destructive">{profileError}</p> : null}
        {saved ? <p className="text-sm text-muted-foreground">Saved.</p> : null}
        <Button className="h-11 w-fit" type="submit">
          Save profile
        </Button>
      </form>

      <section className="grid gap-3 border border-border bg-card p-5">
        <h2 className="font-display text-2xl tracking-tight">Message Liv</h2>
        <p className="text-sm leading-6 text-muted-foreground">
          Liv can reply here. She cannot see your weigh-ins or set logs.
        </p>
        <ol className="grid gap-3">
          {messages.map((message) => (
            <li
              key={message.id}
              className="border border-border px-3 py-3 text-sm leading-6"
            >
              <p className="mb-1 text-xs text-muted-foreground">
                {message.from === "liv" ? "Liv" : "You"} · {message.at}
              </p>
              {message.body}
            </li>
          ))}
        </ol>
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="Write to Liv"
          aria-label="Message to Liv"
        />
        {messageError ? <p className="text-sm text-destructive">{messageError}</p> : null}
        <Button
          type="button"
          className="h-11 w-fit"
          onClick={async () => {
            const result = await sendMessage(viewer.id, draft);
            if (result.error) {
              setMessageError(result.error);
              return;
            }
            setDraft("");
            setMessageError("");
            router.refresh();
          }}
        >
          Send
        </Button>
      </section>

      <section className="grid gap-3 border border-border bg-card p-5">
        <h2 className="font-display text-2xl tracking-tight">Billing</h2>
        <p className="text-sm leading-6">
          {viewer.statusLabel}. The membership is $29 a month after the trial.
          Card numbers are never stored on this site. Cancel before the trial
          ends and you will not be charged.
        </p>
        <p className="text-sm text-muted-foreground">
          If you subscribed in the App Store or Google Play, cancel there. This
          screen can only change a card billed on the website.
        </p>
      </section>

      <form action={signOut}>
        <Button variant="outline" type="submit">
          Log out
        </Button>
      </form>

      <section className="grid gap-3 border border-destructive/40 p-5">
        <h2 className="font-display text-2xl tracking-tight">Delete account</h2>
        <p className="text-sm leading-6 text-muted-foreground">
          Deletes your profile, messages, body-weight entries, and workout logs.
          An App Store or Play subscription has to be canceled in that store.
        </p>
        <form
          className="grid gap-3"
          onSubmit={async (event) => {
            event.preventDefault();
            const result = await deleteAccount(new FormData(event.currentTarget));
            if (result?.error) setDeleteError(result.error);
          }}
        >
          <Field label="Type DELETE to confirm" htmlFor="confirm">
            <Input id="confirm" name="confirm" className="h-11" autoComplete="off" />
          </Field>
          {deleteError ? <p className="text-sm text-destructive">{deleteError}</p> : null}
          <Button variant="destructive" className="w-fit" type="submit">
            Delete account
          </Button>
        </form>
      </section>
    </div>
  );
}

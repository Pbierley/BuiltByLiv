"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { acceptInviteSession } from "@/lib/actions";

export function InviteSession() {
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const accessToken = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");
    const code = new URLSearchParams(window.location.search).get("code");
    if (!accessToken && !refreshToken && !code) return;

    let cancelled = false;
    if (!accessToken || !refreshToken) {
      window.history.replaceState(null, "", window.location.pathname);
      setError("This link could not be opened. Ask Liv to send it again.");
      return;
    }

    acceptInviteSession(accessToken, refreshToken).then((result) => {
      if (cancelled) return;
      window.history.replaceState(null, "", window.location.pathname);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!error) return null;
  return (
    <p role="alert" className="text-sm text-destructive">
      {error}
    </p>
  );
}

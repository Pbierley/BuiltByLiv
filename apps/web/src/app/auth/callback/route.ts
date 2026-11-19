import { NextResponse } from "next/server";
import { createSupabase } from "@/lib/supabase/server";

const emailOtpTypes = ["signup", "invite", "magiclink", "recovery", "email"] as const;

type EmailOtpType = (typeof emailOtpTypes)[number];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = emailOtpType(url.searchParams.get("type"));
  const next = safeNext(url.searchParams.get("next"));

  if (code || tokenHash) {
    const supabase = await createSupabase();
    const { error } = tokenHash
      ? type
        ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
        : { error: { message: "invalid" } }
      : await supabase.auth.exchangeCodeForSession(code ?? "");
    if (error) {
      return NextResponse.redirect(new URL("/login", url.origin));
    }
  }

  return NextResponse.redirect(new URL(next, url.origin));
}

function emailOtpType(value: string | null): EmailOtpType | null {
  if (value === "signup" || value === "invite" || value === "magiclink" || value === "recovery" || value === "email") {
    return value;
  }
  return null;
}

function safeNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return "/app";
  }
  return value;
}

import { NextResponse } from "next/server";
import { createServiceClient, createSupabase } from "@/lib/supabase/server";
import { videoIdSchema } from "@/lib/validation";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ exerciseId: string }> },
) {
  const { exerciseId } = await params;
  const id = videoIdSchema.safeParse(exerciseId);
  if (!id.success) return new NextResponse("Not found", { status: 404 });

  const supabase = await createSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Sign in required", { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    const { data: entitlement } = await supabase
      .from("entitlements")
      .select("status, current_period_end")
      .eq("user_id", user.id)
      .maybeSingle();
    const open =
      entitlement &&
      ["trialing", "active", "grace"].includes(entitlement.status) &&
      (!entitlement.current_period_end ||
        Date.parse(entitlement.current_period_end) > Date.now());
    if (!open) return new NextResponse("Membership required", { status: 403 });
  }

  const { data: exercise } = await supabase
    .from("exercises")
    .select("video_path, published")
    .eq("id", id.data)
    .maybeSingle();
  if (!exercise?.video_path || (profile?.role !== "admin" && !exercise.published)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const admin = createServiceClient();
  const { data, error } = await admin.storage
    .from("exercise-videos")
    .createSignedUrl(exercise.video_path, 60 * 60);
  if (error || !data?.signedUrl) return new NextResponse("Unavailable", { status: 404 });

  return NextResponse.redirect(data.signedUrl);
}

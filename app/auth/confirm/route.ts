import { type EmailOtpType } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);

  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") || "/agenda";

  const redirectTo = new URL(next, origin);

  if (!token_hash || !type) {
    redirectTo.pathname = "/login";
    redirectTo.searchParams.set("error", "invalid_recovery_link");
    return NextResponse.redirect(redirectTo);
  }

  const supabase = await getSupabaseServer();

  const { error } = await supabase.auth.verifyOtp({
    type,
    token_hash,
  });

  if (error) {
    const errorRedirect = new URL("/login", origin);
    errorRedirect.searchParams.set("error", "invalid_recovery_link");
    return NextResponse.redirect(errorRedirect);
  }

  return NextResponse.redirect(redirectTo);
}
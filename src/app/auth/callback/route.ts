import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { safeNextPath } from "@/lib/safeNext";
import { createClient } from "@/lib/supabase/server";
import { analytics } from "@/lib/analytics";

/** Handles email confirmation, magic links and password recovery (PKCE code or token hash). */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const next = safeNextPath(url.searchParams.get("next"), "/dashboard");
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const supabase = await createClient();

  let ok = false;
  if (code) ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  else if (tokenHash && type) ok = !(await supabase.auth.verifyOtp({ type, token_hash: tokenHash })).error;

  if (ok && type !== "recovery") {
    // First confirmed visit completes the signup (one-time ids make later magic links no-ops).
    const { data } = await supabase.auth.getUser();
    if (data.user?.email_confirmed_at) {
      analytics.step(data.user.id, "email_confirmado");
      analytics.signupCompleted(data.user.id);
    }
  }

  const target = request.nextUrl.clone();
  target.search = "";
  if (ok) {
    target.pathname = type === "recovery" ? "/reset-password" : next;
  } else {
    target.pathname = "/login";
    target.searchParams.set("error", "link");
  }
  return NextResponse.redirect(target);
}

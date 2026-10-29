import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { safeNextPath } from "@/lib/safeNext";
import { createClient } from "@/lib/supabase/server";

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

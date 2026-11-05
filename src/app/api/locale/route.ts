import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/auth";
import { LOCALE_COOKIE, isLocale } from "@/lib/i18n/config";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { locale?: unknown } | null;
  if (!isLocale(body?.locale)) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  // Saved on the profile too, so the choice follows a signed-in user to other devices. Best effort.
  await getApiUser()
    .then(({ user, supabase }) => (user ? supabase.from("profiles").update({ ui_locale: body.locale }).eq("id", user.id) : null))
    .catch(() => null);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(LOCALE_COOKIE, body.locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  return res;
}

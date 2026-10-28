import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJson, withUser } from "@/lib/api";
import { LOCALE_COOKIE } from "@/lib/i18n/config";

const schema = z.object({
  full_name: z.string().trim().max(200),
  headline: z.string().trim().max(200),
  location: z.string().trim().max(200),
  target_locations: z.array(z.string().trim().min(1).max(100)).max(20),
  ui_locale: z.enum(["pt", "es", "en"]),
  cv_language: z.enum(["pt", "es", "en"]),
  cv_template: z.enum(["classic", "modern"]),
});

export const PATCH = withUser(async (req, _ctx, { user, supabase }) => {
  const body = await parseJson(req, schema);
  const { error } = await supabase.from("profiles").update(body).eq("id", user.id);
  if (error) throw error;
  const res = NextResponse.json({ ok: true });
  res.cookies.set(LOCALE_COOKIE, body.ui_locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  return res;
});

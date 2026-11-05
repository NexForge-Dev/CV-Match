import "server-only";
import { notFound, redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { isAdmin } from "@/lib/admin";
import { isAuthOutage } from "@/lib/authOutage";
import { createClient } from "@/lib/supabase/server";

/** For Server Components / pages: returns the user or redirects to login. */
export async function requireUser(next?: string): Promise<{ user: User; supabase: Awaited<ReturnType<typeof createClient>> }> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (isAuthOutage(error)) throw new Error("auth_unavailable");
  if (!user) redirect(`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  return { user, supabase };
}

/** For admin pages: logged-in users who are not admins get the 404 page. */
export async function requireAdmin(next?: string) {
  const auth = await requireUser(next);
  if (!isAdmin(auth.user)) notFound();
  return auth;
}

/** For Route Handlers: returns the user or null (the handler answers 401). */
export async function getApiUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (isAuthOutage(error)) throw new Error("auth_unavailable");
  return { user, supabase };
}

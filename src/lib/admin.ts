import type { User } from "@supabase/supabase-js";

/**
 * Admin = app_metadata.role "superadmin" on the Supabase user. app_metadata can only be changed with
 * the service role; user_metadata is user-editable and must never be used here.
 * No imports beyond types: the middleware (Edge) uses this too.
 */
export function isAdmin(user: Pick<User, "app_metadata"> | null | undefined): boolean {
  return user?.app_metadata?.role === "superadmin";
}

import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { HttpError } from "@/lib/api";
import { FEEDBACK_PER_HOUR, type FeedbackKind, type FeedbackStatus } from "@/lib/feedback";

type Saved = { id: string; created_at: string };

/** Enforces the hourly limit and inserts the row atomically (see submit_product_feedback). */
export async function saveFeedback(admin: SupabaseClient, userId: string, item: { kind: FeedbackKind; message: string; page: string }): Promise<Saved> {
  const { data, error } = await admin.rpc("submit_product_feedback", {
    p_user: userId,
    p_kind: item.kind,
    p_message: item.message,
    p_page: item.page,
    p_per_hour: FEEDBACK_PER_HOUR,
  });
  if (error) {
    if (error.message === "rate_limited") throw new HttpError("rate_limited", "feedback_limit");
    throw error;
  }
  return data as Saved;
}

export const FEEDBACK_PAGE_SIZE = 50;

export type FeedbackRow = {
  id: string;
  user_id: string;
  kind: FeedbackKind;
  message: string;
  page: string;
  status: FeedbackStatus;
  created_at: string;
  email: string | null;
};

/** One page of messages, newest first, with each author's e-mail (kept in auth.users, not in public tables). */
export async function listFeedback(admin: SupabaseClient, filters: { status?: FeedbackStatus; kind?: FeedbackKind; page: number }) {
  const from = (filters.page - 1) * FEEDBACK_PAGE_SIZE;
  let query = admin.from("product_feedback").select("id, user_id, kind, message, page, status, created_at", { count: "exact" });
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.kind) query = query.eq("kind", filters.kind);
  const { data, count, error } = await query.order("created_at", { ascending: false }).range(from, from + FEEDBACK_PAGE_SIZE - 1);
  if (error) throw error;

  const rows = (data ?? []) as Omit<FeedbackRow, "email">[];
  const ids = [...new Set(rows.map((r) => r.user_id))];
  // One failed lookup costs one e-mail on the screen, not the whole list.
  const users = await Promise.allSettled(ids.map((id) => admin.auth.admin.getUserById(id)));
  const emails = new Map(
    ids.map((id, i) => {
      const res = users[i];
      return [id, res.status === "fulfilled" ? (res.value.data.user?.email ?? null) : null] as const;
    }),
  );
  return { rows: rows.map((r): FeedbackRow => ({ ...r, email: emails.get(r.user_id) ?? null })), total: count ?? 0 };
}

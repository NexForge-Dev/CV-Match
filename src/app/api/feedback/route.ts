import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJson, withUser } from "@/lib/api";
import { forwardFeedback } from "@/lib/analytics";
import { FEEDBACK_KINDS, FEEDBACK_MAX, cleanPage } from "@/lib/feedback";
import { saveFeedback } from "@/lib/server/feedback";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const schema = z.object({
  kind: z.enum(FEEDBACK_KINDS),
  // Postgres text cannot hold NUL.
  message: z.string().trim().min(1).max(FEEDBACK_MAX).refine((m) => !m.includes("\0"), "message"),
  page: z.string().max(2048).default("").transform(cleanPage),
});

/** Saves one suggestion or problem report, then copies it to the NexForge panel without the author's identity. */
export const POST = withUser(async (req, _ctx, { user }) => {
  const { kind, message, page } = await parseJson(req, schema);
  const saved = await saveFeedback(createAdminClient(), user.id, { kind, message, page });
  await forwardFeedback({ externalId: saved.id, kind, message, page, occurredAt: new Date(saved.created_at) });
  return NextResponse.json({ ok: true });
});

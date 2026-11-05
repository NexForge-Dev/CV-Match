import { NextResponse } from "next/server";
import { z } from "zod";
import { HttpError, assertUuid, parseJson, withAdmin } from "@/lib/api";
import { FEEDBACK_STATUSES } from "@/lib/feedback";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({ status: z.enum(FEEDBACK_STATUSES) });

/** Changes the status of one message. */
export const PATCH = withAdmin<Ctx>(async (req, { params }) => {
  const { id } = await params;
  assertUuid(id);
  const { status } = await parseJson(req, schema);
  const { data, error } = await createAdminClient().from("product_feedback").update({ status }).eq("id", id).select("id").maybeSingle();
  if (error) throw error;
  if (!data) throw new HttpError("not_found");
  return NextResponse.json({ ok: true });
});

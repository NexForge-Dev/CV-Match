import { NextResponse } from "next/server";
import { z } from "zod";
import { analytics } from "@/lib/analytics";
import { getApiUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/** A signup is only counted while it is fresh, so a known user id cannot be replayed later. */
const SIGNUP_WINDOW_MS = 30 * 60 * 1000;

const schema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("signup"), userId: z.string().uuid() }),
  z.object({ kind: z.literal("session") }),
]);

/**
 * Browser-side signals for the NexForge panel (signup and login happen in the browser via Supabase).
 * The server never trusts the client for identity: a signup is verified against Supabase Auth,
 * a session needs the auth cookie. Always answers 204 so it reveals nothing.
 */
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new NextResponse(null, { status: 204 });

  try {
    if (parsed.data.kind === "signup") {
      const { data } = await createAdminClient().auth.admin.getUserById(parsed.data.userId);
      const user = data?.user;
      const created = user ? Date.parse(user.created_at) : NaN;
      if (user && Date.now() - created < SIGNUP_WINDOW_MS) {
        analytics.signupStarted(user.id, new Date(created));
        // Projects without e-mail confirmation get a session straight away.
        if (user.email_confirmed_at) analytics.signupCompleted(user.id);
      }
    } else {
      const { user } = await getApiUser();
      if (user) analytics.session(user.id);
    }
  } catch {
    // Metrics must never surface errors to the user.
  }
  return new NextResponse(null, { status: 204 });
}

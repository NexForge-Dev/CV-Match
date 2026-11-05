import "server-only";
import { after } from "next/server";
import { env } from "@/lib/env";
import { log } from "@/lib/log";
import { createNexforge, type FeedbackItem, type NexforgeClient, type NexforgeEvent } from "./nexforge-client.cjs";

/**
 * Product metrics for the internal NexForge management panel.
 *
 * Only the event name, a pseudonymous id (HMAC of the Supabase user id with
 * NEXFORGE_PSEUDONYM_SECRET, which never leaves this server) and fixed codes are
 * sent — never CV text, job ads, names, e-mails or file names. Without the three
 * NEXFORGE_* variables (and always under NODE_ENV=test) every call is a no-op.
 * Sending happens after the response via `after()`, so it never slows a request.
 */

let client: NexforgeClient | null = null;

function nf(): NexforgeClient {
  if (!client) {
    const e = env();
    client = createNexforge({
      endpoint: e.NEXFORGE_ENDPOINT,
      ingestKey: e.NEXFORGE_INGEST_KEY,
      pseudonymSecret: e.NEXFORGE_PSEUDONYM_SECRET,
      enabled: process.env.NODE_ENV !== "test",
      timeoutMs: 2500,
      retries: 1,
      onError: (err) => log.warn("nexforge.failed", { reason: err instanceof Error ? err.message.slice(0, 80) : "unknown" }),
    });
  }
  return client;
}

function flushLater(c: NexforgeClient) {
  try {
    after(() => c.flush(3000));
  } catch {
    // Outside a request (scripts): send now without waiting.
    void c.flush(3000);
  }
}

type Props = Record<string, string | number>;

export function track(event: NexforgeEvent, userId: string | null | undefined, properties: Props = {}, opts: { once?: string; occurredAt?: Date } = {}) {
  const c = nf();
  if (!c.enabled || !userId) return;
  c.track(event, {
    userId,
    properties: { platform: "web", ...properties },
    eventId: opts.once ? c.onceId(opts.once, event, userId) : undefined,
    occurredAt: opts.occurredAt,
  });
  flushLater(c);
}

/**
 * Copies a message already saved in our database to the panel, waiting at most 2.5 s. This is the only
 * call that carries free text, so it never takes the author's id. It never throws: the user's message
 * is safe in our database, and a panel failure is only logged.
 */
export async function forwardFeedback(item: FeedbackItem) {
  try {
    await nf().feedback(item, 2500);
  } catch (err) {
    log.warn("nexforge.feedback_failed", { reason: err instanceof Error ? err.message.slice(0, 80) : "unknown" });
  }
}

/** Feature keys allowlisted for CV Match in the panel (Administração → Projetos). */
export type Feature =
  | "cv_importado"
  | "ocr_usado"
  | "vaga_adicionada"
  | "analise_executada"
  | "sugestao_aceita"
  | "versao_criada"
  | "exportacao_pdf"
  | "exportacao_docx"
  | "carta_apresentacao"
  | "preparacao_entrevista"
  | "banco_competencias"
  | "exportacao_dados";

/** Onboarding steps, in funnel order (see the panel's project configuration). */
export type Step = "email_confirmado" | "cv_importado" | "cv_revisado" | "vaga_adicionada" | "primeira_analise";

export const analytics = {
  feature: (userId: string, feature: Feature) => track("feature_used", userId, { feature }),
  /** One-time: only the first occurrence per user counts. */
  step: (userId: string, step: Step) => track("signup_step_completed", userId, { step }, { once: step }),
  signupStarted: (userId: string, at?: Date) => track("signup_started", userId, { method: "email" }, { once: "signup", occurredAt: at }),
  signupCompleted: (userId: string) => track("signup_completed", userId, { method: "email" }, { once: "signup" }),
  onboardingCompleted: (userId: string) => track("onboarding_completed", userId, {}, { once: "onboarding" }),
  session: (userId: string) => track("session_started", userId),
};

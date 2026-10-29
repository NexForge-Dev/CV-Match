"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { AuthShell } from "./AuthShell";
import { Alert } from "@/components/ui";
import { useI18n } from "@/lib/i18n/client";
import { createClient } from "@/lib/supabase/client";
import { safeNextPath } from "@/lib/safeNext";

export function SignupForm() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  const plan = params.get("plan");
  const next = safeNextPath(params.get("next"), plan && plan !== "free" ? "/billing" : "/new");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError(t.auth.passwordHint);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error } = await createClient().auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName.trim() },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    setLoading(false);
    if (error) {
      setError(error.message.length < 160 ? error.message : t.errors.generic);
      return;
    }
    if (data.session) {
      router.push(next);
      router.refresh();
    } else {
      setDone(true);
    }
  }

  return (
    <AuthShell
      title={t.auth.signupTitle}
      subtitle={t.auth.signupSubtitle}
      footer={
        <>
          {t.auth.haveAccount}{" "}
          <Link className="link" href="/login">
            {t.auth.login}
          </Link>
        </>
      }
    >
      {!configured && <Alert tone="warn">{t.auth.notConfigured}</Alert>}
      {done ? (
        <Alert tone="success">{t.auth.checkEmail}</Alert>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="label" htmlFor="name">{t.auth.fullName}</label>
            <input id="name" autoComplete="name" className="input" value={fullName} maxLength={200} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="email">{t.auth.email}</label>
            <input id="email" type="email" autoComplete="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="password">{t.auth.password}</label>
            <input id="password" type="password" autoComplete="new-password" minLength={8} required className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
            <p className="mt-1 text-xs text-ink-muted">{t.auth.passwordHint}</p>
          </div>
          <label className="flex items-start gap-2 text-sm text-ink-soft">
            <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} required />
            <span>
              {t.auth.acceptTerms}{" "}
              <Link href="/terms" className="link" target="_blank">{t.auth.terms}</Link> ·{" "}
              <Link href="/privacy" className="link" target="_blank">{t.auth.privacy}</Link>
            </span>
          </label>
          {error && <Alert tone="error">{error}</Alert>}
          <button type="submit" className="btn-primary w-full" disabled={loading || !accepted || !configured}>
            {loading ? t.common.loading : t.auth.signup}
          </button>
        </form>
      )}
    </AuthShell>
  );
}

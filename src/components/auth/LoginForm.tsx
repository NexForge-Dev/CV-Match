"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { AuthShell } from "./AuthShell";
import { Alert } from "@/components/ui";
import { useI18n } from "@/lib/i18n/client";
import { createClient } from "@/lib/supabase/client";
import { safeNextPath } from "@/lib/safeNext";

export function LoginForm() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(params.get("error") === "link" ? t.errors.generic : null);
  const [loading, setLoading] = useState(false);
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await createClient().auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(/confirm/i.test(error.message) ? t.auth.emailNotConfirmed : t.auth.invalidCredentials);
      return;
    }
    router.push(safeNextPath(params.get("next"), "/dashboard"));
    router.refresh();
  }

  return (
    <AuthShell
      title={t.auth.loginTitle}
      footer={
        <>
          {t.auth.noAccount}{" "}
          <Link className="link" href={`/signup${params.get("next") ? `?next=${encodeURIComponent(params.get("next")!)}` : ""}`}>
            {t.auth.signup}
          </Link>
        </>
      }
    >
      {!configured && <Alert tone="warn">{t.auth.notConfigured}</Alert>}
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="label" htmlFor="email">{t.auth.email}</label>
          <input id="email" type="email" autoComplete="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="label" htmlFor="password">{t.auth.password}</label>
            <Link href="/forgot-password" className="text-xs link">{t.auth.forgot}</Link>
          </div>
          <input id="password" type="password" autoComplete="current-password" required className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <Alert tone="error">{error}</Alert>}
        <button type="submit" className="btn-primary w-full" disabled={loading || !configured}>
          {loading ? t.common.loading : t.auth.login}
        </button>
      </form>
    </AuthShell>
  );
}

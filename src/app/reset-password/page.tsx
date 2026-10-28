"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Alert } from "@/components/ui";
import { useI18n } from "@/lib/i18n/client";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return setError(t.auth.passwordHint);
    setLoading(true);
    const { error } = await createClient().auth.updateUser({ password });
    setLoading(false);
    if (error) return setError(error.message.length < 160 ? error.message : t.errors.generic);
    setDone(true);
    setTimeout(() => router.push("/dashboard"), 1200);
  }

  return (
    <AuthShell title={t.auth.resetTitle}>
      {done ? (
        <Alert tone="success">{t.auth.resetDone}</Alert>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="label" htmlFor="password">{t.auth.password}</label>
            <input id="password" type="password" autoComplete="new-password" minLength={8} required className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
            <p className="mt-1 text-xs text-ink-muted">{t.auth.passwordHint}</p>
          </div>
          {error && <Alert tone="error">{error}</Alert>}
          <button className="btn-primary w-full" disabled={loading}>{loading ? t.common.saving : t.auth.resetButton}</button>
        </form>
      )}
    </AuthShell>
  );
}

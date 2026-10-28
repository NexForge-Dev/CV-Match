"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Alert } from "@/components/ui";
import { useI18n } from "@/lib/i18n/client";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    // The response is the same whether or not the account exists (no account enumeration).
    await createClient().auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/callback?next=/reset-password` });
    setLoading(false);
    setSent(true);
  }

  return (
    <AuthShell title={t.auth.forgotTitle} subtitle={t.auth.forgotText} footer={<Link className="link" href="/login">{t.common.back}</Link>}>
      {sent ? (
        <Alert tone="success">{t.auth.linkSent}</Alert>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="label" htmlFor="email">{t.auth.email}</label>
            <input id="email" type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <button className="btn-primary w-full" disabled={loading}>{loading ? t.common.loading : t.auth.sendLink}</button>
        </form>
      )}
    </AuthShell>
  );
}

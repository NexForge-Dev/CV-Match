"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Alert } from "@/components/ui";
import { useI18n } from "@/lib/i18n/client";
import { createClient } from "@/lib/supabase/client";
import { isCaptchaError } from "@/lib/captcha";
import { useCaptcha } from "@/components/auth/Captcha";

export default function ForgotPasswordPage() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const captcha = useCaptcha();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    // The response is the same whether or not the account exists (no account enumeration).
    const { error } = await createClient().auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`, ...captcha.options });
    setLoading(false);
    if (error) captcha.reset();
    // Only a captcha rejection is shown: other errors would reveal nothing useful and keep the same answer.
    if (isCaptchaError(error)) return setError(t.auth.captchaFailed);
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
          {captcha.widget}
          {error && <Alert tone="error">{error}</Alert>}
          <button className="btn-primary w-full" disabled={loading || !captcha.ready}>{loading ? t.common.loading : t.auth.sendLink}</button>
        </form>
      )}
    </AuthShell>
  );
}

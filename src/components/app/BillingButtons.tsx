"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { api, errorMessage } from "@/lib/client/api";
import { useI18n } from "@/lib/i18n/client";

/**
 * EU right of withdrawal: before paying for digital content/services the buyer must expressly request
 * immediate access and acknowledge losing the 14-day withdrawal right. One checkbox covers every
 * CheckoutButton inside the provider; the server rejects a checkout without it.
 */
const WithdrawalConsentContext = createContext<{ accepted: boolean; setAccepted: (v: boolean) => void }>({ accepted: false, setAccepted: () => {} });

export function WithdrawalConsentProvider({ children }: { children: ReactNode }) {
  const [accepted, setAccepted] = useState(false);
  return <WithdrawalConsentContext.Provider value={{ accepted, setAccepted }}>{children}</WithdrawalConsentContext.Provider>;
}

export function WithdrawalConsentCheckbox() {
  const { t } = useI18n();
  const { accepted, setAccepted } = useContext(WithdrawalConsentContext);
  return (
    <label className="card flex items-start gap-3 p-4 text-sm text-ink-soft">
      <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
      <span>
        {t.billing.withdrawalConsent}{" "}
        <a href="/terms" className="link" target="_blank" rel="noopener">{t.auth.terms}</a>
        <span className="mt-1 block text-xs text-ink-muted">{t.billing.withdrawalConsentHint}</span>
      </span>
    </label>
  );
}

export function CheckoutButton({ planId, label, disabled }: { planId: string; label: string; disabled?: boolean }) {
  const { t } = useI18n();
  const { accepted } = useContext(WithdrawalConsentContext);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function go() {
    if (!accepted) return setError(t.errors.withdrawal_consent_required);
    setBusy(true);
    setError(null);
    const res = await api<{ url: string }>("/api/billing/checkout", { method: "POST", json: { planId, withdrawalConsent: true } });
    if (!res.ok) {
      setBusy(false);
      return setError(errorMessage(t, res.error, res.detail));
    }
    window.location.href = res.data.url;
  }
  return (
    <div>
      <button className="btn-primary w-full" disabled={busy || disabled} aria-disabled={!accepted} onClick={go}>
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        {busy ? t.billing.redirecting : label}
      </button>
      {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
    </div>
  );
}

export function PortalButton() {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function go() {
    setBusy(true);
    const res = await api<{ url: string }>("/api/billing/portal", { method: "POST" });
    if (!res.ok) {
      setBusy(false);
      return setError(errorMessage(t, res.error, res.detail));
    }
    window.location.href = res.data.url;
  }
  return (
    <>
      <button className="btn-secondary btn-sm" disabled={busy} onClick={go}>{t.billing.manage}</button>
      {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
    </>
  );
}

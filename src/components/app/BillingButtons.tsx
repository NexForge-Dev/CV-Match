"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { api, errorMessage } from "@/lib/client/api";
import { useI18n } from "@/lib/i18n/client";

/**
 * Purchase terms (Brazil, CDC art. 49 + Decreto 7.962/2013): before paying the buyer confirms they read the
 * Terms and the 7-day refund policy. One checkbox covers every CheckoutButton inside the provider; the server
 * rejects a checkout without it.
 */
const TermsConsentContext = createContext<{ accepted: boolean; setAccepted: (v: boolean) => void; missing: boolean; setMissing: (v: boolean) => void }>({ accepted: false, setAccepted: () => {}, missing: false, setMissing: () => {} });
const CONSENT_ID = "terms-consent";

export function TermsConsentProvider({ children }: { children: ReactNode }) {
  const [accepted, setAccepted] = useState(false);
  const [missing, setMissing] = useState(false);
  return <TermsConsentContext.Provider value={{ accepted, setAccepted, missing, setMissing }}>{children}</TermsConsentContext.Provider>;
}

export function TermsConsentCheckbox() {
  const { t } = useI18n();
  const { accepted, setAccepted, missing, setMissing } = useContext(TermsConsentContext);
  return (
    <label className="card flex cursor-pointer items-start gap-3 p-4 text-sm text-ink-soft">
      <input
        id={CONSENT_ID}
        type="checkbox"
        className="mt-0.5 h-5 w-5 shrink-0"
        checked={accepted}
        onChange={(e) => {
          setAccepted(e.target.checked);
          setMissing(false);
        }}
      />
      <span>
        {t.billing.termsConsent}{" "}
        <a href="/terms" className="link" target="_blank" rel="noopener">{t.auth.terms}</a>
        <span className="mt-1 block text-xs text-ink-muted">{t.billing.termsConsentHint}</span>
        {missing && <span className="mt-1 block text-xs font-medium text-missing-ink" role="alert">{t.errors.terms_consent_required}</span>}
      </span>
    </label>
  );
}

export function CheckoutButton({ planId, label, disabled }: { planId: string; label: string; disabled?: boolean }) {
  const { t } = useI18n();
  const { accepted, setMissing } = useContext(TermsConsentContext);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function go() {
    if (!accepted) {
      // The checkbox is above the plans, out of view on phones.
      setMissing(true);
      const box = document.getElementById(CONSENT_ID);
      box?.scrollIntoView({ block: "center" });
      box?.focus({ preventScroll: true });
      return;
    }
    setBusy(true);
    setError(null);
    const res = await api<{ url: string }>("/api/billing/checkout", { method: "POST", json: { planId, termsAccepted: true } });
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
      {error && <p className="mt-2 text-xs text-missing-ink" role="alert">{error}</p>}
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
      <button className="btn-secondary btn-sm" disabled={busy} onClick={go}>
        {busy && <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" />}
        {t.billing.manage}
      </button>
      {error && <p className="mt-1 text-xs text-missing-ink" role="alert">{error}</p>}
    </>
  );
}

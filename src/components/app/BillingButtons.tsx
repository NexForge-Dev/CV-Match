"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { api, errorMessage } from "@/lib/client/api";
import { useI18n } from "@/lib/i18n/client";

export function CheckoutButton({ planId, label, disabled }: { planId: string; label: string; disabled?: boolean }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function go() {
    setBusy(true);
    setError(null);
    const res = await api<{ url: string }>("/api/billing/checkout", { method: "POST", json: { planId } });
    if (!res.ok) {
      setBusy(false);
      return setError(errorMessage(t, res.error, res.detail));
    }
    window.location.href = res.data.url;
  }
  return (
    <div>
      <button className="btn-primary w-full" disabled={busy || disabled} onClick={go}>
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

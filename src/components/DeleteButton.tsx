"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { api, errorMessage } from "@/lib/client/api";
import { useI18n } from "@/lib/i18n/client";

/** Confirm-then-DELETE button. Redirects to `redirectTo` or refreshes the current page. */
export function DeleteButton({ url, label, redirectTo, small = true, className = "" }: { url: string; label?: string; redirectTo?: string; small?: boolean; className?: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    if (!window.confirm(t.common.confirmDelete)) return;
    setBusy(true);
    const res = await api(url, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) return setError(errorMessage(t, res.error, res.detail));
    if (redirectTo) router.push(redirectTo);
    router.refresh();
  }

  return (
    <span className="inline-flex flex-col items-start">
      <button type="button" onClick={onClick} disabled={busy} className={`btn-danger ${small ? "btn-sm" : ""} ${className}`}>
        <Trash2 className="h-3.5 w-3.5" aria-hidden />
        {busy ? t.common.deleting : (label ?? t.common.delete)}
      </button>
      {error && <span className="mt-1 text-xs text-red-700">{error}</span>}
    </span>
  );
}

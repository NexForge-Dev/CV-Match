"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { api, errorMessage } from "@/lib/client/api";
import { useI18n } from "@/lib/i18n/client";

/** Confirm-then-DELETE button. Redirects to `redirectTo` or refreshes the current page. */
export function DeleteButton({ url, label, redirectTo, small = true, className = "" }: { url: string; label?: string; redirectTo?: string; small?: boolean; className?: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const text = label ?? t.common.delete;

  async function confirm() {
    setBusy(true);
    setError(null);
    const res = await api(url, { method: "DELETE" });
    setBusy(false);
    dialog.current?.close();
    if (!res.ok) return setError(errorMessage(t, res.error, res.detail));
    if (redirectTo) router.push(redirectTo);
    router.refresh();
  }

  return (
    <span className="inline-flex flex-col items-start">
      <button type="button" onClick={() => dialog.current?.showModal()} disabled={busy} className={`btn-danger ${small ? "btn-sm" : ""} ${className}`}>
        <Trash2 className="h-3.5 w-3.5" aria-hidden />
        {busy ? t.common.deleting : text}
      </button>
      {error && <span className="mt-1 text-xs text-missing-ink">{error}</span>}
      <dialog ref={dialog} aria-labelledby={titleId} className="m-auto w-[calc(100vw-2rem)] max-w-sm rounded-xl border border-line bg-white p-6 text-left shadow-raised">
        <h2 id={titleId} className="font-semibold text-ink">{text}</h2>
        <p className="mt-1 text-sm text-ink-soft">{t.common.confirmDelete}</p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className="btn-secondary" disabled={busy} onClick={() => dialog.current?.close()}>{t.common.cancel}</button>
          <button type="button" className="btn-danger-solid" disabled={busy} onClick={confirm}>
            {busy && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />}
            {busy ? t.common.deleting : t.common.delete}
          </button>
        </div>
      </dialog>
    </span>
  );
}

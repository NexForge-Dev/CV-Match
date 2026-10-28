"use client";

import { useState } from "react";
import { Alert } from "@/components/ui";
import { api, errorMessage } from "@/lib/client/api";
import { DELETE_WORD } from "@/lib/i18n/dictionaries";
import { useI18n } from "@/lib/i18n/client";

export function DeleteAccount() {
  const { t, locale } = useI18n();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const word = DELETE_WORD[locale];

  async function onDelete() {
    setBusy(true);
    const res = await api("/api/account", { method: "DELETE", json: { confirm: true } });
    if (!res.ok) {
      setBusy(false);
      return setError(errorMessage(t, res.error, res.detail));
    }
    window.location.href = "/";
  }

  return (
    <div className="mt-4 space-y-3">
      <label className="label" htmlFor="confirm-delete">{t.account.typeToConfirm}</label>
      <input id="confirm-delete" className="input max-w-xs" value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" />
      {error && <Alert tone="error">{error}</Alert>}
      <button className="btn-danger" disabled={text.trim().toUpperCase() !== word || busy} onClick={onDelete}>
        {busy ? t.common.deleting : t.account.deleteButton}
      </button>
    </div>
  );
}

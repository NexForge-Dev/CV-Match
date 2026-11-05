"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, errorMessage } from "@/lib/client/api";
import { FEEDBACK_STATUSES, type FeedbackStatus } from "@/lib/feedback";
import { useI18n } from "@/lib/i18n/client";

/** Admin: changes the status of one feedback message and refreshes the list. */
export function FeedbackStatusSelect({ id, status, labels }: { id: string; status: FeedbackStatus; labels: Record<FeedbackStatus, string> }) {
  const { t } = useI18n();
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function change(next: FeedbackStatus) {
    setValue(next);
    setBusy(true);
    setError(null);
    const res = await api(`/api/admin/feedback/${id}`, { method: "PATCH", json: { status: next } });
    setBusy(false);
    if (!res.ok) {
      setValue(status);
      return setError(errorMessage(t, res.error, res.detail));
    }
    router.refresh();
  }

  return (
    <span className="inline-flex flex-col items-start sm:items-end">
      <select className="input w-auto" aria-label="Status" value={value} disabled={busy} onChange={(e) => change(e.target.value as FeedbackStatus)}>
        {FEEDBACK_STATUSES.map((s) => (
          <option key={s} value={s}>{labels[s]}</option>
        ))}
      </select>
      {error && <span role="alert" className="mt-1 text-xs text-missing-ink">{error}</span>}
    </span>
  );
}

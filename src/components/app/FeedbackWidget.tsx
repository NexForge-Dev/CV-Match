"use client";

import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Loader2, MessageSquare, X } from "lucide-react";
import { Alert } from "@/components/ui";
import { api, errorMessage } from "@/lib/client/api";
import { FEEDBACK_KINDS, FEEDBACK_MAX, type FeedbackKind } from "@/lib/feedback";
import { useI18n } from "@/lib/i18n/client";

type Notice = { tone: "success" | "error"; text: string };

/** Floating balloon for suggestions and problem reports. Rendered only by the authenticated layout. */
export function FeedbackWidget() {
  const { t } = useI18n();
  const f = t.feedback;
  const path = usePathname();
  const id = useId();
  const toggle = useRef<HTMLButtonElement>(null);
  const firstOption = useRef<HTMLInputElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<FeedbackKind | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  function close() {
    setOpen(false);
    setNotice(null);
    toggle.current?.focus();
  }

  useEffect(() => {
    if (!open) return;
    firstOption.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!kind || busy) return;
    setBusy(true);
    setNotice(null);
    const res = await api("/api/feedback", { method: "POST", json: { kind, message, page: path } });
    setBusy(false);
    // The send button was disabled while sending, which drops keyboard focus: put it back in the form.
    if (!res.ok) {
      setNotice({ tone: "error", text: errorMessage(t, res.error, res.detail) });
      textarea.current?.focus();
      return;
    }
    setKind(null);
    setMessage("");
    setNotice({ tone: "success", text: f.sent });
    firstOption.current?.focus();
  }

  return (
    <div className="feedback-dock print:hidden">
      {open && (
        <div id={`${id}-panel`} role="dialog" aria-labelledby={`${id}-title`} className="feedback-panel card absolute bottom-14 right-0 w-[min(22rem,calc(100vw-2rem))] overflow-y-auto p-4 shadow-raised">
          <h2 id={`${id}-title`} className="text-sm font-semibold text-ink">{f.title}</h2>
          <form onSubmit={send} className="mt-3 space-y-3">
            <fieldset>
              <legend className="sr-only">{f.title}</legend>
              <div className="space-y-2">
                {FEEDBACK_KINDS.map((k, i) => (
                  <label key={k} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-line-strong px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:border-slate-400 has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50 has-[:checked]:text-brand-800 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-500 sm:min-h-0">
                    <input ref={i === 0 ? firstOption : undefined} type="radio" name={`${id}-kind`} value={k} checked={kind === k} onChange={() => setKind(k)} />
                    {f[k]}
                  </label>
                ))}
              </div>
            </fieldset>
            <div>
              <label className="label" htmlFor={`${id}-message`}>{f.message}</label>
              <textarea ref={textarea} id={`${id}-message`} className="input" rows={4} maxLength={FEEDBACK_MAX} value={message} onChange={(e) => setMessage(e.target.value)} aria-describedby={`${id}-hint`} />
              <p id={`${id}-hint`} className="hint flex justify-between gap-3">
                <span>{f.hint}</span>
                <span className="readout shrink-0">{message.length}/{FEEDBACK_MAX}</span>
              </p>
            </div>
            {notice && <Alert tone={notice.tone}>{notice.text}</Alert>}
            <button type="submit" className="btn-primary w-full" disabled={!kind || !message.trim() || busy}>
              {busy && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />}
              {busy ? f.sending : f.send}
            </button>
          </form>
        </div>
      )}
      <button
        ref={toggle}
        type="button"
        className="btn-primary h-11 w-11 rounded-full p-0 shadow-raised focus-visible:rounded-full"
        aria-label={open ? t.common.close : f.open}
        title={open ? t.common.close : f.open}
        aria-expanded={open}
        aria-controls={open ? `${id}-panel` : undefined}
        onClick={() => (open ? close() : setOpen(true))}
      >
        {open ? <X aria-hidden className="h-5 w-5" /> : <MessageSquare aria-hidden className="h-5 w-5" />}
      </button>
    </div>
  );
}

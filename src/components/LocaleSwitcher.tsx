"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { LOCALES, LOCALE_NAMES, type Locale } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/client";

export function LocaleSwitcher({ className = "" }: { className?: string }) {
  const { locale } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <select
      aria-label="Language"
      className={`min-h-11 rounded-lg border border-line-strong bg-white px-2 py-1.5 text-base text-ink-soft transition-colors hover:border-slate-400 sm:min-h-0 sm:text-xs ${className}`}
      value={locale}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value as Locale;
        start(async () => {
          await fetch("/api/locale", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ locale: next }) });
          router.refresh();
        });
      }}
    >
      {LOCALES.map((l) => (
        <option key={l} value={l}>
          {LOCALE_NAMES[l]}
        </option>
      ))}
    </select>
  );
}

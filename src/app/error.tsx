"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/client";

/** Route-level error boundary: branded, translated, no error details shown to the user. */
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n();
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-bold text-ink">{t.status.errorTitle}</h1>
      <p className="text-ink-soft">{t.status.errorText}</p>
      <div className="flex flex-wrap justify-center gap-3">
        <button onClick={reset} className="rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700">
          {t.status.retry}
        </button>
        <Link href="/" className="rounded-lg border border-slate-300 px-4 py-2 font-medium text-ink hover:bg-slate-50">
          {t.status.home}
        </Link>
      </div>
    </main>
  );
}

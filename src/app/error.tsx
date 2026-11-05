"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition } from "react";
import { AlertTriangle } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";

/** Route-level error boundary: branded, translated, no error details shown to the user. */
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n();
  const router = useRouter();
  // reset() alone re-renders what the server already sent: the failed result. refresh() asks for it again.
  const retry = () =>
    startTransition(() => {
      router.refresh();
      reset();
    });
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-3 px-4 text-center">
      <span className="grid h-11 w-11 place-items-center rounded-full bg-partial-soft text-partial">
        <AlertTriangle aria-hidden className="h-5 w-5" />
      </span>
      <h1 className="text-2xl font-bold text-ink">{t.status.errorTitle}</h1>
      <p className="text-ink-soft">{t.status.errorText}</p>
      <div className="mt-2 flex flex-wrap justify-center gap-3">
        <button onClick={retry} className="btn-primary">
          {t.status.retry}
        </button>
        <Link href="/" className="btn-secondary">
          {t.status.home}
        </Link>
      </div>
    </main>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition } from "react";
import { AlertTriangle } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";

/** Error inside the app: keeps the navigation, shows no error details. */
export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n();
  const router = useRouter();
  // reset() alone re-renders what the server already sent: the failed result. refresh() asks for it again.
  const retry = () =>
    startTransition(() => {
      router.refresh();
      reset();
    });
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center gap-3 text-center">
      <span className="grid h-11 w-11 place-items-center rounded-full bg-partial-soft text-partial">
        <AlertTriangle aria-hidden className="h-5 w-5" />
      </span>
      <h1 className="text-xl font-bold text-ink">{t.status.errorTitle}</h1>
      <p className="text-sm text-ink-soft">{t.status.errorText}</p>
      <div className="mt-2 flex flex-wrap justify-center gap-3">
        <button onClick={retry} className="btn-primary">{t.status.retry}</button>
        <Link href="/dashboard" className="btn-secondary">{t.nav.dashboard}</Link>
      </div>
    </div>
  );
}

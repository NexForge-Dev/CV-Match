import Link from "next/link";
import type { Metadata } from "next";
import { getDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: t.status.notFoundTitle };
}

/** Inside the app (e.g. a deleted analysis): keep the navigation and lead back to the dashboard. */
export default async function AppNotFound() {
  const { t } = await getDictionary();
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-2xl font-bold text-ink">{t.status.notFoundTitle}</h1>
      <p className="text-ink-soft">{t.status.notFoundText}</p>
      <Link href="/dashboard" className="btn-primary">
        {t.nav.dashboard}
      </Link>
    </div>
  );
}

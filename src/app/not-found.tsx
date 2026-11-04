import Link from "next/link";
import type { Metadata } from "next";
import { Logo } from "@/components/ui";
import { getDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: t.status.notFoundTitle };
}

export default async function NotFound() {
  const { t } = await getDictionary();
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <Logo />
      <h1 className="mt-4 text-2xl font-bold text-ink">{t.status.notFoundTitle}</h1>
      <p className="text-ink-soft">{t.status.notFoundText}</p>
      <Link href="/" className="btn-primary">
        {t.status.home}
      </Link>
    </main>
  );
}

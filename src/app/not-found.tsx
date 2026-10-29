import Link from "next/link";
import { Logo } from "@/components/ui";
import { getDictionary } from "@/lib/i18n/server";

export default async function NotFound() {
  const { t } = await getDictionary();
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <Logo />
      <h1 className="mt-4 text-2xl font-bold text-ink">{t.status.notFoundTitle}</h1>
      <p className="text-ink-soft">{t.status.notFoundText}</p>
      <Link href="/" className="rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700">
        {t.status.home}
      </Link>
    </main>
  );
}

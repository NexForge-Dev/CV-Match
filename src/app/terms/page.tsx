import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/LegalPage";
import { marketing } from "@/lib/i18n/marketing";
import { getLocale } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = marketing[await getLocale()];
  return { title: t.terms.title };
}

export default async function TermsPage() {
  const t = marketing[await getLocale()];
  return <LegalPage t={t} title={t.terms.title} intro={t.terms.intro} sections={t.terms.sections} />;
}

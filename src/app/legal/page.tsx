import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/LegalPage";
import { marketing } from "@/lib/i18n/marketing";
import { getLocale } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = marketing[await getLocale()];
  return { title: t.legalNotice.title };
}

export default async function LegalNoticePage() {
  const t = marketing[await getLocale()];
  return <LegalPage t={t} title={t.legalNotice.title} intro={t.legalNotice.intro} sections={t.legalNotice.sections} />;
}

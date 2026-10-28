import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/LegalPage";
import { marketing } from "@/lib/i18n/marketing";
import { getLocale } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = marketing[await getLocale()];
  return { title: t.privacy.title };
}

export default async function PrivacyPage() {
  const t = marketing[await getLocale()];
  return <LegalPage t={t} title={t.privacy.title} intro={t.privacy.intro} sections={t.privacy.sections} />;
}

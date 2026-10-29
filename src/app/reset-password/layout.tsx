import type { Metadata } from "next";
import { getDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: t.auth.resetTitle };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

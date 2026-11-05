import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Inter } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n/client";
import { getDictionary } from "@/lib/i18n/server";

// Self-hosted at build time, so the Content-Security-Policy (font-src 'self') needs no change.
// Only the text face in Latin is preloaded: the other files load on demand through unicode-range.
const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const mono = IBM_Plex_Mono({ subsets: ["latin", "latin-ext"], weight: ["400", "500", "600"], variable: "--font-mono", display: "swap", preload: false });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export async function generateMetadata(): Promise<Metadata> {
  const { t, locale } = await getDictionary();
  return {
    title: { default: `CV Match — ${t.meta.tagline}`, template: "%s · CV Match" },
    description: t.meta.description,
    metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
    openGraph: { type: "website", siteName: "CV Match", locale: locale === "pt" ? "pt_BR" : locale === "es" ? "es_419" : "en_US", title: `CV Match — ${t.meta.tagline}`, description: t.meta.description },
    twitter: { card: "summary_large_image", title: `CV Match — ${t.meta.tagline}`, description: t.meta.description },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale } = await getDictionary();
  return (
    <html lang={locale === "pt" ? "pt-BR" : locale} className={`${sans.variable} ${mono.variable}`}>
      <body className="min-h-screen font-sans">
        <I18nProvider locale={locale}>{children}</I18nProvider>
      </body>
    </html>
  );
}

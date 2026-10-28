import { CircleAlert } from "lucide-react";
import type { LegalSection, MarketingDict } from "@/lib/i18n/marketing";
import { LEGAL_LAST_UPDATED } from "@/lib/i18n/marketing";
import { MarketingFooter } from "./MarketingFooter";
import { MarketingHeader } from "./MarketingHeader";

const PLACEHOLDER_EMAIL = "privacy@cvmatch.example";

function Paragraph({ text, note }: { text: string; note: string }) {
  if (!text.includes(PLACEHOLDER_EMAIL)) return <p>{text}</p>;
  const [before, after] = text.split(PLACEHOLDER_EMAIL);
  return (
    <p>
      {before}
      <span className="font-medium text-ink">{PLACEHOLDER_EMAIL}</span> <span className="text-amber-700">{note}</span>
      {after}
    </p>
  );
}

export function LegalPage({ t, title, intro, sections }: { t: MarketingDict; title: string; intro: string; sections: LegalSection[] }) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <MarketingHeader t={t} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:py-14">
        <h1 className="text-3xl font-bold tracking-tight text-ink">{title}</h1>
        <p className="mt-2 text-sm text-ink-muted">
          {t.legal.updated}: {LEGAL_LAST_UPDATED}
        </p>
        <div className="mt-6 flex gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="note">
          <CircleAlert aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{t.legal.templateNote}</p>
        </div>
        <p className="mt-6 text-ink-soft">{intro}</p>
        <div className="mt-8 space-y-8">
          {sections.map((s) => (
            <section key={s.title}>
              <h2 className="text-lg font-semibold text-ink">{s.title}</h2>
              <div className="mt-2 space-y-2 text-sm leading-relaxed text-ink-soft">
                {s.paragraphs.map((p) => (
                  <Paragraph key={p} text={p} note={t.legal.contactPlaceholderNote} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
      <MarketingFooter t={t} />
    </div>
  );
}

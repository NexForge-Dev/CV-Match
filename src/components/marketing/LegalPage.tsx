import type { LegalSection, MarketingDict } from "@/lib/i18n/marketing";
import { LEGAL_LAST_UPDATED } from "@/lib/i18n/marketing";
import { fillLegal, legalOperator } from "@/lib/legal";
import { MarketingFooter } from "./MarketingFooter";
import { MarketingHeader } from "./MarketingHeader";

/** Renders a paragraph with the operator's details filled in and the contact email as a mailto link. */
function Paragraph({ text, email }: { text: string; email: string }) {
  if (!email.includes("@") || !text.includes(email)) return <p>{text}</p>;
  const [before, ...rest] = text.split(email);
  return (
    <p>
      {before}
      <a href={`mailto:${email}`} className="font-medium text-brand-700 underline">
        {email}
      </a>
      {rest.join(email)}
    </p>
  );
}

export function LegalPage({ t, title, intro, sections }: { t: MarketingDict; title: string; intro: string; sections: LegalSection[] }) {
  const op = legalOperator();
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <MarketingHeader t={t} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:py-14">
        <h1 className="text-3xl font-bold tracking-tight text-ink">{title}</h1>
        <p className="mt-2 text-sm text-ink-muted">
          {t.legal.updated}: {LEGAL_LAST_UPDATED}
        </p>
        <p className="mt-6 text-ink-soft">{fillLegal(intro, op)}</p>
        <div className="mt-8 space-y-8">
          {sections.map((s) => (
            <section key={s.title}>
              <h2 className="text-lg font-semibold text-ink">{s.title}</h2>
              <div className="mt-2 space-y-2 text-sm leading-relaxed text-ink-soft">
                {s.paragraphs.map((p) => (
                  <Paragraph key={p} text={fillLegal(p, op)} email={op.email} />
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

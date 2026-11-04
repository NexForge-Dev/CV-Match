import type { LegalSection, MarketingDict } from "@/lib/i18n/marketing";
import { fillLegal, legalFeatures, legalOperator, legalParagraphs } from "@/lib/legal";
import { MarketingFooter } from "./MarketingFooter";
import { MarketingHeader } from "./MarketingHeader";

/** Renders a paragraph with the operator's details filled in and the contact email as a mailto link. */
function Paragraph({ text, email }: { text: string; email: string }) {
  if (!text.includes(email)) return <p>{text}</p>;
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
  const features = legalFeatures();
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <MarketingHeader t={t} />
      <main className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 gap-10 px-4 py-10 sm:py-14 lg:grid-cols-[240px_minmax(0,1fr)]">
        <nav aria-label={t.legal.contents} className="hidden lg:block">
          <div className="sticky top-20">
            <p className="eyebrow mb-2">{t.legal.contents}</p>
            <ul className="space-y-1.5 text-sm">
              {sections.map((s, i) => (
                <li key={s.title}>
                  <a href={`#s${i + 1}`} className="text-ink-muted transition-colors hover:text-ink">{s.title}</a>
                </li>
              ))}
            </ul>
          </div>
        </nav>
        <article className="min-w-0 max-w-3xl">
          <h1 className="text-3xl font-bold tracking-tight text-ink">{title}</h1>
          <p className="mt-2 text-sm text-ink-muted">
            {t.legal.updated}: <span className="readout">{t.legal.updatedDate}</span>
          </p>
          <p className="mt-6 leading-relaxed text-ink-soft">{fillLegal(intro, op)}</p>
          <div className="mt-8 space-y-8">
            {sections.map((s, i) => (
              <section key={s.title} id={`s${i + 1}`} className="scroll-mt-20">
                <h2 className="text-lg font-semibold text-ink">{s.title}</h2>
                <div className="mt-2 space-y-2 text-sm leading-relaxed text-ink-soft">
                  {legalParagraphs(s, op, features).map((p) => (
                    <Paragraph key={p} text={p} email={op.email} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </article>
      </main>
      <MarketingFooter t={t} />
    </div>
  );
}

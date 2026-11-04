import { CheckCircle2, SearchX, ShieldCheck } from "lucide-react";
import { CardHeader, ScoreRing, ScoreScale } from "@/components/ui";
import { STATUS_STYLE } from "@/components/StatusBadge";
import type { MatchStatus } from "@/lib/analysis/match";
import { scoreBand } from "@/lib/analysis/scoreBand";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { MarketingDict } from "@/lib/i18n/marketing";

const STATUS_ORDER: MatchStatus[] = ["found", "partial", "not_found", "ambiguous"];

/**
 * The analysis screen with a fixed, illustrative dataset. The figures follow the real formula: four must-haves
 * (2 found, 1 partial, 1 not identified) and two nice-to-haves found give (6 + 1.5 + 2) / 14 = 68; one ambiguous
 * requirement is left out. Nothing on this page comes from a real user.
 */
const EXAMPLE = { score: 68, counts: { found: 4, partial: 1, not_found: 1, ambiguous: 1 }, mustFound: 2, mustTotal: 4 };

function Row({ label, status, must, a }: { label: string; status: MatchStatus; must: boolean; a: Dictionary["analysis"] }) {
  const { Icon, text } = STATUS_STYLE[status];
  return (
    <li className="flex items-center gap-2.5 px-5 py-2.5 text-sm">
      <Icon aria-hidden className={`h-4 w-4 shrink-0 ${text}`} />
      <span className="sr-only">{a.status[status]}:</span>
      <span className="min-w-0 flex-1 text-ink">{label}</span>
      <span className="shrink-0 text-xs text-ink-muted">{must ? a.must : a.nice}</span>
    </li>
  );
}

export function ResultPreview({ t, a }: { t: MarketingDict; a: Dictionary["analysis"] }) {
  const p = t.preview;
  const band = scoreBand(EXAMPLE.score);
  return (
    <figure className="rounded-2xl border border-line bg-white p-3 sm:p-4">
      <figcaption className="mb-3 flex flex-col gap-1 px-1 sm:flex-row sm:items-center sm:gap-3">
        <span className="tag w-fit shrink-0 border-brand-200 bg-brand-50 text-brand-700">{p.label}</span>
        <span className="text-xs text-ink-muted">{p.note}</span>
      </figcaption>

      <div className="card mb-3 grid grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="border-b border-slate-100 p-5 sm:p-6 lg:border-b-0 lg:border-r">
          <p className="eyebrow">{a.scoreLabel}</p>
          <div className="mt-3 flex items-center gap-5">
            <ScoreRing score={EXAMPLE.score} size={104} label={`${p.label}. ${a.scoreLabel}`} />
            <div className="min-w-0">
              <p className="text-lg font-semibold text-ink">{a.bands[band].label}</p>
              <p className="mt-1 text-sm text-ink-soft">{a.bands[band].text}</p>
            </div>
          </div>
          <div className="mt-5"><ScoreScale score={EXAMPLE.score} /></div>
        </div>
        <div className="p-5 sm:p-6">
          <p className="eyebrow">{a.coverage}</p>
          <div className="mt-3 flex h-3 gap-0.5" aria-hidden>
            {STATUS_ORDER.flatMap((status) =>
              Array.from({ length: EXAMPLE.counts[status] }, (_, i) => <span key={`${status}-${i}`} className={`min-w-0 flex-1 first:rounded-l-full last:rounded-r-full ${STATUS_STYLE[status].solid}`} />),
            )}
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-2 xl:grid-cols-4">
            {STATUS_ORDER.map((status) => {
              const { Icon, text } = STATUS_STYLE[status];
              return (
                <div key={status} className="rounded-lg border border-line px-3 py-2">
                  <dd className="flex items-center gap-1.5">
                    <Icon aria-hidden className={`h-3.5 w-3.5 ${text}`} />
                    <span className="readout text-lg font-semibold text-ink">{EXAMPLE.counts[status]}</span>
                  </dd>
                  <dt className="mt-0.5 text-xs leading-snug text-ink-muted">{a.status[status]}</dt>
                </div>
              );
            })}
          </dl>
          <div className="mt-4">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <p className="font-medium text-ink">{a.mustCoverage}</p>
              <p className="readout shrink-0 font-semibold text-ink">{EXAMPLE.mustFound}/{EXAMPLE.mustTotal}</p>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-brand-600" style={{ width: `${(EXAMPLE.mustFound / EXAMPLE.mustTotal) * 100}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-2">
        <section className="card min-w-0">
          <CardHeader icon={ShieldCheck} title={a.strengths} />
          <ul className="divider-list">
            {p.strengths.map((s) => <Row key={s.label} label={s.label} must={s.must} status="found" a={a} />)}
          </ul>
        </section>
        <section className="card min-w-0">
          <CardHeader icon={SearchX} title={a.gaps} />
          <ul className="divider-list">
            {p.gaps.map((g) => <Row key={g.label} label={g.label} must={g.must} status={g.status as MatchStatus} a={a} />)}
          </ul>
        </section>
      </div>

      <div className="card p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="badge bg-brand-50 text-brand-700">{a.kinds.summary}</span>
          <span className="badge text-found-ink"><CheckCircle2 aria-hidden className="h-3.5 w-3.5" /> {a.accepted}</span>
        </div>
        <p className="mt-2 text-sm text-ink-soft">{p.suggestion.rationale}</p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="min-w-0">
            <p className="eyebrow">{a.original}</p>
            <p className="well mt-1.5 text-sm text-ink-soft">{p.suggestion.current}</p>
          </div>
          <div className="min-w-0">
            <p className="eyebrow text-found-ink">{a.suggested}</p>
            <p className="mt-1.5 rounded-lg bg-found-soft p-3 text-sm text-ink">{p.suggestion.suggested}</p>
          </div>
        </div>
      </div>
    </figure>
  );
}

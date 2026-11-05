import { Briefcase, Equal, FileText, Plus } from "lucide-react";
import { ScoreRing } from "@/components/ui";
import { StatusBadge } from "@/components/StatusBadge";
import type { MatchStatus } from "@/lib/analysis/match";
import type { MarketingDict } from "@/lib/i18n/marketing";

/** Static illustration of the analysis flow (no real data). */
export function DemoFlow({ t }: { t: MarketingDict }) {
  const d = t.demo;
  return (
    <figure id="demo" className="min-w-0 scroll-mt-20 rounded-2xl border border-line bg-slate-50 p-3 sm:p-4">
      <figcaption className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-1">
        <span className="text-sm font-semibold text-ink">{d.title}</span>
        <span className="tag shrink-0">{d.example}</span>
      </figcaption>

      {/* CV + job = structured analysis */}
      <div className="relative grid grid-cols-1 gap-2 sm:grid-cols-2">
        <span className="absolute left-1/2 top-1/2 z-10 grid h-6 w-6 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-line bg-white text-brand-600">
          <Plus aria-hidden className="h-3.5 w-3.5" />
        </span>
        {[
          { Icon: FileText, label: d.cvLabel, lines: d.cvLines },
          { Icon: Briefcase, label: d.jobLabel, lines: d.jobLines },
        ].map(({ Icon, label, lines }) => (
          <div key={label} className="min-w-0 rounded-lg border border-line bg-white p-3">
            <p className="eyebrow mb-1.5 flex items-center gap-1.5">
              <Icon aria-hidden className="h-3.5 w-3.5 text-brand-600" />
              {label}
            </p>
            <ul className="space-y-0.5 text-xs text-ink-soft">
              {lines.slice(0, 3).map((l) => (
                <li key={l} className="truncate">{l}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <span className="relative z-10 mx-auto -my-1 grid h-6 w-6 place-items-center rounded-full border border-line bg-white text-brand-600">
        <Equal aria-hidden className="h-3.5 w-3.5" />
      </span>

      <div className="rounded-lg border border-line bg-white shadow-card">
        <div className="flex items-center gap-4 border-b border-slate-100 p-4">
          <ScoreRing score={68} size={68} label={d.scoreLabel} />
          <div className="min-w-0">
            <p className="font-semibold text-ink">{d.scoreLabel}</p>
            <p className="text-xs text-ink-muted">{d.scoreNote}</p>
          </div>
        </div>
        <p className="eyebrow px-4 pt-3">{d.resultLabel}</p>
        <ul className="divider-list px-4 pb-1">
          {d.rows.map((row) => {
            const status = row.status as MatchStatus;
            return (
              <li key={row.label} className="flex flex-col gap-1 py-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">{row.label}</p>
                  <p className="text-xs text-ink-muted">{row.note}</p>
                </div>
                <div className="max-w-full sm:shrink-0"><StatusBadge status={status} label={d.statuses[status]} /></div>
              </li>
            );
          })}
        </ul>
      </div>
    </figure>
  );
}

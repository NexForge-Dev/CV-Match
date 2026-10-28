import { ArrowRight, Briefcase, FileText } from "lucide-react";
import { ScoreRing } from "@/components/ui";
import type { MarketingDict } from "@/lib/i18n/marketing";
import { StatusBadge, type DemoStatus } from "./StatusBadge";

/** Static illustration of the analysis flow (no real data). */
export function DemoFlow({ t }: { t: MarketingDict }) {
  const d = t.demo;
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_auto_1.4fr] lg:items-center">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
        <div className="card p-4">
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
            <FileText aria-hidden className="h-4 w-4 text-brand-600" />
            {d.cvLabel}
          </p>
          <ul className="space-y-1.5 text-sm text-ink-soft">
            {d.cvLines.map((l) => (
              <li key={l} className="truncate">
                {l}
              </li>
            ))}
          </ul>
        </div>
        <div className="card p-4">
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
            <Briefcase aria-hidden className="h-4 w-4 text-brand-600" />
            {d.jobLabel}
          </p>
          <ul className="space-y-1.5 text-sm text-ink-soft">
            {d.jobLines.map((l) => (
              <li key={l} className="truncate">
                • {l}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <ArrowRight aria-hidden className="mx-auto hidden h-6 w-6 text-brand-400 lg:block" />

      <div className="card p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-4">
          <ScoreRing score={68} size={80} />
          <div className="min-w-0">
            <p className="font-semibold text-ink">{d.scoreLabel}</p>
            <p className="text-xs text-ink-muted">{d.scoreNote}</p>
          </div>
        </div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">{d.resultLabel}</p>
        <ul className="divide-y divide-slate-100">
          {d.rows.map((row) => {
            const status = row.status as DemoStatus;
            return (
              <li key={row.label} className="flex flex-col gap-1 py-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">{row.label}</p>
                  <p className="text-xs text-ink-muted">{row.note}</p>
                </div>
                <StatusBadge status={status} label={d.statuses[status]} />
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

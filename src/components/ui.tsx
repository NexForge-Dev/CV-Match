import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { BAND_COLORS, BAND_LIMITS, scoreBand } from "@/lib/analysis/scoreBand";

type IconType = ComponentType<{ className?: string; "aria-hidden"?: boolean }>;

export function Logo({ className = "", inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <Link href="/" className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap font-bold ${inverted ? "text-white" : "text-ink"} ${className}`}>
      <span className={`grid h-8 w-8 place-items-center rounded-lg text-sm ${inverted ? "bg-white text-brand-700" : "bg-brand-600 text-white"}`}>CV</span>
      <span className="text-lg tracking-tight">
        CV <span className={inverted ? "text-brand-200" : "text-brand-600"}>Match</span>
      </span>
    </Link>
  );
}

export function PageHeader({ title, subtitle, actions, back }: { title: string; subtitle?: string; actions?: ReactNode; back?: { href: string; label: string } }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between lg:mb-8">
      <div className="min-w-0">
        {back && (
          <Link href={back.href} className="mb-1 inline-block text-sm text-ink-muted hover:text-ink">
            ← {back.label}
          </Link>
        )}
        <h1 className="text-2xl font-bold tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-ink-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function CardHeader({ icon: Icon, title, action }: { icon?: IconType; title: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
      <h2 className="flex min-w-0 items-center gap-2 text-sm font-semibold text-ink">
        {Icon && <Icon aria-hidden className="h-4 w-4 shrink-0 text-brand-600" />}
        <span className="truncate">{title}</span>
      </h2>
      {action && <div className="shrink-0 text-sm">{action}</div>}
    </div>
  );
}

export function StatCard({ label, value, hint, icon: Icon, children }: { label: string; value: ReactNode; hint?: ReactNode; icon?: IconType; children?: ReactNode }) {
  return (
    <div className="card flex min-w-0 flex-col p-5">
      <p className="flex items-center gap-2 text-sm font-medium text-ink-muted">
        {Icon && <Icon aria-hidden className="h-4 w-4 shrink-0" />}
        {label}
      </p>
      <p className="readout mt-2 text-3xl font-semibold text-ink">{value}</p>
      {hint && <div className="mt-1 text-sm text-ink-muted">{hint}</div>}
      {children && <div className="mt-auto pt-3">{children}</div>}
    </div>
  );
}

export function EmptyState({ title, text, action, icon: Icon }: { title: string; text?: string; action?: ReactNode; icon?: IconType }) {
  return (
    <div className="rounded-xl border border-dashed border-line-strong bg-white px-6 py-12 text-center">
      {Icon && (
        <span className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-full bg-brand-50 text-brand-600">
          <Icon aria-hidden className="h-5 w-5" />
        </span>
      )}
      <p className="font-semibold text-ink">{title}</p>
      {text && <p className="mx-auto mt-1 max-w-md text-sm text-ink-muted">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Alert({ tone = "info", children }: { tone?: "info" | "warn" | "error" | "success"; children: ReactNode }) {
  const tones = {
    info: { cls: "border-brand-200 bg-brand-50 text-brand-900", Icon: Info },
    warn: { cls: "border-partial-line bg-partial-soft text-partial-ink", Icon: AlertTriangle },
    error: { cls: "border-missing-line bg-missing-soft text-missing-ink", Icon: XCircle },
    success: { cls: "border-found-line bg-found-soft text-found-ink", Icon: CheckCircle2 },
  };
  const { cls, Icon } = tones[tone];
  return (
    <div className={`flex gap-2.5 rounded-lg border px-4 py-3 text-sm ${cls}`} role={tone === "error" ? "alert" : "status"}>
      <Icon aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function ScoreRing({ score, size = 96, label }: { score: number | null; size?: number; label?: string }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const pct = score ?? 0;
  const color = BAND_COLORS[scoreBand(score)];
  const name = score === null ? "—" : `${score}/100`;
  return (
    <svg className="shrink-0" width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={label ? `${label}: ${name}` : name}>
      <circle cx="50" cy="50" r={r} fill="none" stroke="#e2e8f0" strokeWidth="8" />
      <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (c * pct) / 100} transform="rotate(-90 50 50)" />
      <text x="50" y="50" dy="0.35em" textAnchor="middle" fontSize="27" fontWeight="600" fill="#0f172a" style={{ fontFamily: "var(--font-mono), monospace" }}>
        {score === null ? "—" : score}
      </text>
    </svg>
  );
}

/** The 0–100 ruler with its three reading zones and a marker on the current score. */
export function ScoreScale({ score }: { score: number | null }) {
  const { mid, high } = BAND_LIMITS;
  return (
    <div aria-hidden>
      <div className="relative">
        <div className="flex h-1.5 gap-0.5 overflow-hidden rounded-full">
          <span className="bg-missing/70" style={{ width: `${mid}%` }} />
          <span className="bg-partial/70" style={{ width: `${high - mid}%` }} />
          <span className="flex-1 bg-found/70" />
        </div>
        {score !== null && <span className="absolute -top-1 h-3.5 w-1 -translate-x-1/2 rounded-full bg-ink ring-2 ring-white" style={{ left: `${score}%` }} />}
      </div>
      <div className="relative mt-1.5 h-4 font-mono text-[11px] text-ink-muted">
        <span className="absolute left-0">0</span>
        <span className="absolute -translate-x-1/2" style={{ left: `${mid}%` }}>{mid}</span>
        <span className="absolute -translate-x-1/2" style={{ left: `${high}%` }}>{high}</span>
        <span className="absolute right-0">100</span>
      </div>
    </div>
  );
}

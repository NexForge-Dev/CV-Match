import Link from "next/link";
import type { ReactNode } from "react";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`inline-flex items-center gap-2 font-bold text-ink ${className}`}>
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-sm text-white">CV</span>
      <span className="text-lg tracking-tight">
        CV <span className="text-brand-600">Match</span>
      </span>
    </Link>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
      <p className="font-semibold text-ink">{title}</p>
      {text && <p className="mx-auto mt-1 max-w-md text-sm text-ink-muted">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Alert({ tone = "info", children }: { tone?: "info" | "warn" | "error" | "success"; children: ReactNode }) {
  const tones = {
    info: "border-brand-200 bg-brand-50 text-brand-900",
    warn: "border-amber-200 bg-amber-50 text-amber-900",
    error: "border-red-200 bg-red-50 text-red-800",
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  };
  return <div className={`rounded-lg border px-4 py-3 text-sm ${tones[tone]}`} role={tone === "error" ? "alert" : "status"}>{children}</div>;
}

export function ScoreRing({ score, size = 96 }: { score: number | null; size?: number }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const pct = score ?? 0;
  const color = score === null ? "#94a3b8" : pct >= 70 ? "#059669" : pct >= 45 ? "#d97706" : "#dc2626";
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={score === null ? "—" : `${score}/100`}>
      <circle cx="50" cy="50" r={r} fill="none" stroke="#e2e8f0" strokeWidth="9" />
      <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="9" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (c * pct) / 100} transform="rotate(-90 50 50)" />
      <text x="50" y="56" textAnchor="middle" fontSize="24" fontWeight="700" fill="#0f172a">
        {score === null ? "—" : score}
      </text>
    </svg>
  );
}

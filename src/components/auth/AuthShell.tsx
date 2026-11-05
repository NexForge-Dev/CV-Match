"use client";

import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { Logo } from "@/components/ui";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { useI18n } from "@/lib/i18n/client";

export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="min-h-screen bg-white lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex min-h-screen flex-col">
        <header className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-8">
          <Logo />
          <LocaleSwitcher />
        </header>
        <main className="flex flex-1 items-start justify-center px-4 pb-12 pt-6 sm:items-center sm:pt-0">
          <div className="w-full max-w-sm">
            <h1 className="text-2xl font-bold tracking-tight text-ink">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>}
            <div className="mt-6">{children}</div>
            {footer && <div className="mt-6 text-sm text-ink-muted">{footer}</div>}
          </div>
        </main>
      </div>
      <aside className="hidden flex-col justify-center bg-brand-800 px-12 text-white lg:flex xl:px-20">
        <p className="max-w-md text-3xl font-bold leading-tight tracking-tight">{t.auth.panelTitle}</p>
        <ul className="mt-8 max-w-md space-y-3 text-brand-100">
          {t.auth.panelPoints.map((point) => (
            <li key={point} className="flex gap-3">
              <Check aria-hidden className="mt-1 h-4 w-4 shrink-0 text-brand-300" />
              {point}
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}

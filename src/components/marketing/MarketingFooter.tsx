import Link from "next/link";
import { Logo } from "@/components/ui";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import type { MarketingDict } from "@/lib/i18n/marketing";

export function MarketingFooter({ t }: { t: MarketingDict }) {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Logo />
          <p className="mt-2 text-sm text-ink-muted">{t.footer.tagline}</p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <Link href="/privacy" className="text-ink-soft hover:text-ink">
            {t.footer.privacy}
          </Link>
          <Link href="/terms" className="text-ink-soft hover:text-ink">
            {t.footer.terms}
          </Link>
          <LocaleSwitcher />
        </div>
      </div>
      <p className="mx-auto max-w-6xl px-4 pb-8 text-xs text-ink-muted">
        © {new Date().getFullYear()} CV Match. {t.footer.rights}
      </p>
    </footer>
  );
}

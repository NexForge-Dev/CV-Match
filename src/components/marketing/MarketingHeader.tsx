import Link from "next/link";
import { Logo } from "@/components/ui";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import type { MarketingDict } from "@/lib/i18n/marketing";

export function MarketingHeader({ t }: { t: MarketingDict }) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Logo />
        <nav className="hidden items-center gap-6 text-sm text-ink-soft md:flex">
          <Link href="/#how" className="hover:text-ink">
            {t.nav.how}
          </Link>
          <Link href="/#pricing" className="hover:text-ink">
            {t.nav.pricing}
          </Link>
          <Link href="/#faq" className="hover:text-ink">
            {t.nav.faq}
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <LocaleSwitcher className="hidden sm:block" />
          <Link href="/login" className="btn-ghost btn-sm">
            {t.nav.login}
          </Link>
          <Link href="/signup" className="btn-primary btn-sm">
            {t.nav.start}
          </Link>
        </div>
      </div>
    </header>
  );
}

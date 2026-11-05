import Link from "next/link";
import { Logo } from "@/components/ui";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import type { MarketingDict } from "@/lib/i18n/marketing";

export function MarketingHeader({ t }: { t: MarketingDict }) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-2.5">
        <Logo compact />
        <nav className="hidden items-center gap-6 whitespace-nowrap text-sm font-medium text-ink-soft md:flex lg:gap-7">
          <Link href="/#how" className="transition-colors hover:text-ink">
            {t.nav.how}
          </Link>
          <Link href="/#result" className="transition-colors hover:text-ink">
            {t.nav.result}
          </Link>
          <Link href="/#pricing" className="transition-colors hover:text-ink">
            {t.nav.pricing}
          </Link>
          <Link href="/#faq" className="transition-colors hover:text-ink">
            {t.nav.faq}
          </Link>
        </nav>
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <LocaleSwitcher className="hidden lg:block" />
          <Link href="/login" className="btn-ghost btn-sm whitespace-nowrap">
            {t.nav.login}
          </Link>
          <Link href="/signup" className="btn-primary btn-sm whitespace-nowrap">
            {t.nav.start}
          </Link>
        </div>
      </div>
    </header>
  );
}

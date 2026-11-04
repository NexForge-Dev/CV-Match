import Link from "next/link";
import { Logo } from "@/components/ui";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import type { MarketingDict } from "@/lib/i18n/marketing";
import { LEGAL_CONTACT_EMAIL } from "@/lib/legal";

export function MarketingFooter({ t }: { t: MarketingDict }) {
  const linkCls = "text-ink-soft transition-colors hover:text-ink";
  return (
    <footer className="border-t border-line bg-white">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-4 py-10 md:grid-cols-[2fr_1fr_1fr]">
        <div className="col-span-2 md:col-span-1">
          <Logo />
          <p className="mt-2 max-w-xs text-sm text-ink-muted">{t.footer.tagline}</p>
          <div className="mt-4"><LocaleSwitcher /></div>
        </div>
        <nav aria-label={t.footer.product}>
          <p className="eyebrow mb-3">{t.footer.product}</p>
          <ul className="space-y-2 text-sm">
            <li><Link href="/#how" className={linkCls}>{t.nav.how}</Link></li>
            <li><Link href="/#result" className={linkCls}>{t.nav.result}</Link></li>
            <li><Link href="/#pricing" className={linkCls}>{t.nav.pricing}</Link></li>
            <li><Link href="/#faq" className={linkCls}>{t.nav.faq}</Link></li>
            <li><Link href="/login" className={linkCls}>{t.nav.login}</Link></li>
            <li><Link href="/signup" className={linkCls}>{t.nav.start}</Link></li>
          </ul>
        </nav>
        <nav aria-label={t.footer.legalTitle}>
          <p className="eyebrow mb-3">{t.footer.legalTitle}</p>
          <ul className="space-y-2 text-sm">
            <li><Link href="/privacy" className={linkCls}>{t.footer.privacy}</Link></li>
            <li><Link href="/terms" className={linkCls}>{t.footer.terms}</Link></li>
            <li><Link href="/legal" className={linkCls}>{t.footer.legal}</Link></li>
            <li><a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className={linkCls}>{t.footer.contact}</a></li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-slate-100">
        <p className="mx-auto max-w-6xl px-4 py-4 text-xs text-ink-muted">
          © {new Date().getFullYear()} CV Match. {t.footer.rights}
        </p>
      </div>
    </footer>
  );
}

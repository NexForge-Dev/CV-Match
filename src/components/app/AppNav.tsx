"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Briefcase, CreditCard, FileSearch, FileText, FolderOpen, LayoutDashboard, LogOut, Menu, PlusCircle, Settings, User, X } from "lucide-react";
import { Logo } from "@/components/ui";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";

const ICONS = {
  dashboard: LayoutDashboard,
  new: PlusCircle,
  resumes: FileText,
  analyses: FileSearch,
  jobs: Briefcase,
  documents: FolderOpen,
  profile: User,
  billing: CreditCard,
  account: Settings,
} as const;

type Item = { href: string; label: string; icon: keyof typeof ICONS };

export function AppNav({ items, email, logoutLabel }: { items: Item[]; email: string; logoutLabel: string }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);

  // Mobile menu: lock page scroll behind it and close with Escape (links close it on click).
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);
  const links = (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const Icon = ICONS[item.icon];
        const active = path === item.href || path.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition lg:py-2 ${active ? "bg-brand-50 text-brand-700" : "text-ink-soft hover:bg-slate-100"} ${item.icon === "new" && !active ? "text-brand-700" : ""}`}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
  const footer = (
    <div className="mt-auto space-y-3 border-t border-slate-200 pt-4">
      <LocaleSwitcher className="w-full" />
      <p className="truncate text-xs text-ink-muted" title={email}>{email}</p>
      <form action="/auth/signout" method="post">
        <button className="btn-ghost btn-sm w-full justify-start">
          <LogOut className="h-3.5 w-3.5" /> {logoutLabel}
        </button>
      </form>
    </div>
  );

  return (
    <>
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <Logo />
        <button className="btn-ghost btn-sm" onClick={() => setOpen((o) => !o)} aria-label="Menu" aria-expanded={open} aria-controls="mobile-menu">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <div id="mobile-menu" className="fixed inset-0 z-20 overflow-y-auto bg-white px-4 pb-6 pt-20 lg:hidden">
          <div className="flex h-full flex-col">
            {links}
            {footer}
          </div>
        </div>
      )}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white px-4 py-6 lg:flex">
        <Logo className="mb-8 px-2" />
        {links}
        {footer}
      </aside>
    </>
  );
}

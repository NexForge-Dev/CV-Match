"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Briefcase, CreditCard, FileSearch, FileText, FolderOpen, LayoutDashboard, LogOut, Menu, MessageSquare, Plus, Settings, User, X } from "lucide-react";
import { Logo } from "@/components/ui";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";

const ICONS = {
  dashboard: LayoutDashboard,
  resumes: FileText,
  analyses: FileSearch,
  jobs: Briefcase,
  documents: FolderOpen,
  profile: User,
  billing: CreditCard,
  account: Settings,
  feedback: MessageSquare,
} as const;

type Item = { href: string; label: string; icon: keyof typeof ICONS };
type Group = { label: string; items: Item[] };

export function AppNav({
  groups,
  newAnalysisLabel,
  availableLabel,
  email,
  logoutLabel,
}: {
  groups: Group[];
  newAnalysisLabel: string;
  availableLabel: string;
  email: string;
  logoutLabel: string;
}) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Mobile menu: lock page scroll behind it, close with Escape (links close it on click), keep keyboard
  // focus inside it and hand focus back to the toggle on the way out.
  useEffect(() => {
    if (!open) return;
    const toggle = toggleRef.current;
    const focusable = () => Array.from(menuRef.current?.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), select") ?? []);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    focusable()[0]?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return setOpen(false);
      if (e.key !== "Tab") return;
      const items = focusable();
      const first = items[0];
      const last = items[items.length - 1];
      const inside = menuRef.current?.contains(document.activeElement);
      if (e.shiftKey && (document.activeElement === first || !inside)) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && (document.activeElement === last || !inside)) {
        e.preventDefault();
        first?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
      toggle?.focus();
    };
  }, [open]);

  const body = (
    <>
      <Link href="/new" onClick={() => setOpen(false)} aria-current={path === "/new" ? "page" : undefined} className="btn-primary w-full">
        <Plus aria-hidden className="h-4 w-4" />
        {newAnalysisLabel}
      </Link>
      <nav className="mt-6 space-y-6">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="eyebrow mb-1.5 px-3">{group.label}</p>
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const Icon = ICONS[item.icon];
                const active = path === item.href || path.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors lg:py-2 ${active ? "bg-brand-50 text-brand-700" : "text-ink-soft hover:bg-slate-100 hover:text-ink"}`}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="mt-auto space-y-3 pt-6">
        <Link href="/billing" onClick={() => setOpen(false)} className="block rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-ink-soft transition-colors hover:bg-brand-50 hover:text-brand-700">
          {availableLabel}
        </Link>
        <LocaleSwitcher className="w-full" />
        <div className="flex items-center justify-between gap-2 border-t border-line pt-3">
          <p className="min-w-0 truncate text-xs text-ink-muted" title={email}>{email}</p>
          <form action="/auth/signout" method="post" className="shrink-0">
            <button className="btn-ghost btn-sm" aria-label={logoutLabel} title={logoutLabel}>
              <LogOut aria-hidden className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </>
  );

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-white px-4 py-2 lg:hidden">
        <Logo />
        <button ref={toggleRef} className="btn-ghost btn-sm" onClick={() => setOpen((o) => !o)} aria-label="Menu" aria-expanded={open} aria-controls="mobile-menu">
          {open ? <X aria-hidden className="h-5 w-5" /> : <Menu aria-hidden className="h-5 w-5" />}
        </button>
      </header>
      {open && (
        <div className="fixed inset-0 z-20 lg:hidden">
          <button aria-label="Menu" tabIndex={-1} className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
          <div id="mobile-menu" ref={menuRef} className="absolute inset-y-0 right-0 flex w-[min(20rem,calc(100vw-3rem))] flex-col overflow-y-auto bg-white px-4 pb-6 pt-20 shadow-raised">
            {body}
          </div>
        </div>
      )}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col overflow-y-auto border-r border-line bg-white px-4 py-5 lg:flex">
        <Logo className="mb-6 px-2" />
        {body}
      </aside>
    </>
  );
}

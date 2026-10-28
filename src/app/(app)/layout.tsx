import { requireUser } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n/server";
import { AppNav } from "@/components/app/AppNav";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireUser();
  const { t } = await getDictionary();
  const items = [
    { href: "/dashboard", label: t.nav.dashboard, icon: "dashboard" },
    { href: "/new", label: t.nav.newAnalysis, icon: "new" },
    { href: "/resumes", label: t.nav.resumes, icon: "resumes" },
    { href: "/analyses", label: t.nav.analyses, icon: "analyses" },
    { href: "/jobs", label: t.nav.jobs, icon: "jobs" },
    { href: "/documents", label: t.nav.documents, icon: "documents" },
    { href: "/profile", label: t.nav.profile, icon: "profile" },
    { href: "/billing", label: t.nav.billing, icon: "billing" },
    { href: "/account", label: t.nav.account, icon: "account" },
  ] as const;
  return (
    <div className="min-h-screen lg:flex">
      <AppNav items={[...items]} email={user.email ?? ""} logoutLabel={t.nav.logout} />
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">{children}</main>
    </div>
  );
}

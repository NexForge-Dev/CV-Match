import { isAdmin } from "@/lib/admin";
import { requireUser } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n/server";
import { analysesAvailable, getCreditSummary } from "@/lib/server/credits";
import { AppNav } from "@/components/app/AppNav";
import { FeedbackWidget } from "@/components/app/FeedbackWidget";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, supabase } = await requireUser();
  const { t } = await getDictionary();
  const credits = await getCreditSummary(supabase);
  const groups = [
    {
      label: t.nav.groupWork,
      items: [
        { href: "/dashboard", label: t.nav.dashboard, icon: "dashboard" as const },
        { href: "/analyses", label: t.nav.analyses, icon: "analyses" as const },
        { href: "/resumes", label: t.nav.resumes, icon: "resumes" as const },
        { href: "/jobs", label: t.nav.jobs, icon: "jobs" as const },
        { href: "/documents", label: t.nav.documents, icon: "documents" as const },
      ],
    },
    {
      label: t.nav.groupAccount,
      items: [
        { href: "/profile", label: t.nav.profile, icon: "profile" as const },
        { href: "/billing", label: t.nav.billing, icon: "billing" as const },
        { href: "/account", label: t.nav.account, icon: "account" as const },
      ],
    },
    ...(isAdmin(user) ? [{ label: "Admin", items: [{ href: "/admin/feedback", label: "Feedback", icon: "feedback" as const }] }] : []),
  ];
  return (
    <div className="min-h-screen lg:flex">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow-raised">
        {t.nav.skip}
      </a>
      <AppNav groups={groups} newAnalysisLabel={t.nav.newAnalysis} availableLabel={t.nav.available(analysesAvailable(credits))} email={user.email ?? ""} logoutLabel={t.nav.logout} />
      <main id="main" className="min-w-0 flex-1 px-4 pb-20 pt-6 sm:px-6 lg:px-10 lg:pt-8">{children}</main>
      <FeedbackWidget />
    </div>
  );
}

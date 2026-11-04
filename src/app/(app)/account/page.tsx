import type { Metadata } from "next";
import { Download } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n/server";
import { PageHeader } from "@/components/ui";
import { DeleteAccount } from "@/components/app/DeleteAccount";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: t.nav.account };
}

export default async function AccountPage() {
  const { user } = await requireUser("/account");
  const { t } = await getDictionary();
  const a = t.account;
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title={a.title} />
      <section className="card p-5 sm:p-6">
        <p className="eyebrow">{a.email}</p>
        <p className="mt-1 break-words font-medium text-ink">{user.email}</p>
      </section>
      <section className="card p-5 sm:p-6">
        <h2 className="font-semibold text-ink">{a.exportData}</h2>
        <p className="mt-1 text-sm text-ink-muted">{a.exportText}</p>
        <a href="/api/account" className="btn-secondary mt-4"><Download aria-hidden className="h-4 w-4" /> {a.exportData}</a>
      </section>
      <section className="card border-missing-line p-5 sm:p-6">
        <h2 className="font-semibold text-missing-ink">{a.dangerZone}</h2>
        <p className="mt-1 text-sm text-ink-soft">{a.dangerText}</p>
        <DeleteAccount />
      </section>
    </div>
  );
}

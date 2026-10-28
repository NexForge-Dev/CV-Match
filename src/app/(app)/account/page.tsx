import type { Metadata } from "next";
import { Download } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n/server";
import { PageHeader } from "@/components/ui";
import { DeleteAccount } from "@/components/app/DeleteAccount";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage() {
  const { user } = await requireUser("/account");
  const { t } = await getDictionary();
  const a = t.account;
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title={a.title} />
      <section className="card p-6">
        <p className="text-sm text-ink-muted">{a.email}</p>
        <p className="font-medium">{user.email}</p>
      </section>
      <section className="card p-6">
        <h2 className="font-semibold">{a.exportData}</h2>
        <p className="mt-1 text-sm text-ink-muted">{a.exportText}</p>
        <a href="/api/account" className="btn-secondary mt-4"><Download className="h-4 w-4" /> {a.exportData}</a>
      </section>
      <section className="card border-red-200 p-6">
        <h2 className="font-semibold text-red-800">{a.dangerZone}</h2>
        <p className="mt-1 text-sm text-ink-soft">{a.dangerText}</p>
        <DeleteAccount />
      </section>
    </div>
  );
}

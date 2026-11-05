import Link from "next/link";
import type { Metadata } from "next";
import { MessageSquare } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { FEEDBACK_KINDS, FEEDBACK_STATUSES, type FeedbackKind, type FeedbackStatus } from "@/lib/feedback";
import { FEEDBACK_PAGE_SIZE, listFeedback } from "@/lib/server/feedback";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDate } from "@/lib/i18n/config";
import { EmptyState, PageHeader } from "@/components/ui";
import { FeedbackStatusSelect } from "@/components/app/FeedbackStatusSelect";

export const metadata: Metadata = { title: "Feedback" };

const KIND_LABELS: Record<FeedbackKind, string> = { suggestion: "Sugestão", problem: "Problema" };
const STATUS_LABELS: Record<FeedbackStatus, string> = { new: "Novo", reviewing: "Em análise", resolved: "Resolvido" };

function oneOf<T extends string>(values: readonly T[], value: string | undefined): T | undefined {
  return values.find((v) => v === value);
}

export default async function AdminFeedbackPage({ searchParams }: { searchParams: Promise<{ status?: string; kind?: string; page?: string }> }) {
  await requireAdmin("/admin/feedback");
  const params = await searchParams;
  const status = oneOf(FEEDBACK_STATUSES, params.status);
  const kind = oneOf(FEEDBACK_KINDS, params.kind);
  const page = Math.max(1, Number.parseInt(params.page ?? "", 10) || 1);
  const { rows, total } = await listFeedback(createAdminClient(), { status, kind, page });

  const pageHref = (n: number) => {
    const query = new URLSearchParams();
    if (status) query.set("status", status);
    if (kind) query.set("kind", kind);
    query.set("page", String(n));
    return `/admin/feedback?${query}`;
  };

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Feedback" subtitle="Sugestões e problemas enviados pelos usuários." />
      <form method="get" className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="label" htmlFor="filter-status">Status</label>
          <select id="filter-status" name="status" className="input w-auto" defaultValue={status ?? ""}>
            <option value="">Todos</option>
            {FEEDBACK_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="filter-kind">Tipo</label>
          <select id="filter-kind" name="kind" className="input w-auto" defaultValue={kind ?? ""}>
            <option value="">Todos</option>
            {FEEDBACK_KINDS.map((k) => <option key={k} value={k}>{KIND_LABELS[k]}</option>)}
          </select>
        </div>
        <button className="btn-secondary">Filtrar</button>
      </form>
      {rows.length ? (
        <>
          <ul className="card divider-list">
            {rows.map((r) => (
              <li key={r.id} className="p-4 sm:px-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm text-ink-muted">
                      <span className="tag">{KIND_LABELS[r.kind]}</span>
                      <span className="break-all">{r.email ?? "—"}</span>
                      <span>{formatDate(r.created_at, "pt")}</span>
                    </p>
                    <p className="mt-2 whitespace-pre-wrap break-words text-sm text-ink">{r.message}</p>
                    {r.page && <p className="mt-1 break-all font-mono text-xs text-ink-muted">{r.page}</p>}
                  </div>
                  <FeedbackStatusSelect key={`${r.id}:${r.status}`} id={r.id} status={r.status} labels={STATUS_LABELS} />
                </div>
              </li>
            ))}
          </ul>
          <nav aria-label="Páginas" className="mt-4 flex items-center justify-between gap-3 text-sm text-ink-muted">
            <p>{total} {total === 1 ? "mensagem" : "mensagens"}</p>
            <div className="flex gap-2">
              {page > 1 && <Link className="btn-secondary btn-sm" href={pageHref(page - 1)}>Anterior</Link>}
              {page * FEEDBACK_PAGE_SIZE < total && <Link className="btn-secondary btn-sm" href={pageHref(page + 1)}>Próxima</Link>}
            </div>
          </nav>
        </>
      ) : (
        <EmptyState icon={MessageSquare} title="Nenhuma mensagem" text="Nada encontrado com estes filtros." />
      )}
    </div>
  );
}

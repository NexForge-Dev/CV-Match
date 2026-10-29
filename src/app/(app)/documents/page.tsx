import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n/server";
import { formatDate } from "@/lib/i18n/config";
import { EmptyState, PageHeader } from "@/components/ui";
import { DeleteButton } from "@/components/DeleteButton";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: t.nav.documents };
}

function size(bytes: number) {
  return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default async function DocumentsPage() {
  const { supabase } = await requireUser("/documents");
  const { t, locale } = await getDictionary();
  const d = t.documents;
  const { data } = await supabase
    .from("documents")
    .select("id, file_name, kind, size_bytes, storage_path, extraction_status, extracted_text, original_deleted_at, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title={d.title} subtitle={d.subtitle} />
      {data?.length ? (
        <ul className="space-y-3">
          {data.map((doc) => (
            <li key={doc.id} className="card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{doc.file_name}</p>
                  <p className="text-xs text-ink-muted">
                    {doc.kind.toUpperCase()} · {d.size}: {size(doc.size_bytes)} · {formatDate(doc.created_at, locale)}
                  </p>
                  <p className="mt-1 text-xs text-ink-soft">
                    {d.status}: {t.wizard.status[doc.extraction_status as keyof typeof t.wizard.status]} · {d.original}:{" "}
                    {doc.storage_path ? d.stored : doc.original_deleted_at ? `${d.deletedOn} ${formatDate(doc.original_deleted_at, locale)}` : d.notStored}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {doc.storage_path && <DeleteButton url={`/api/documents/${doc.id}?scope=original`} label={d.deleteOriginal} />}
                  <DeleteButton url={`/api/documents/${doc.id}?scope=all`} label={d.deleteAll} />
                </div>
              </div>
              {doc.extracted_text && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm text-brand-700">{d.viewText}</summary>
                  <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap rounded bg-slate-50 p-3 text-xs text-ink-soft">{doc.extracted_text}</pre>
                </details>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title={t.common.none} />
      )}
    </div>
  );
}

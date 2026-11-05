import type { Metadata } from "next";
import { ChevronDown, FileText, FolderOpen } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n/server";
import { formatDate } from "@/lib/i18n/config";
import { EmptyState, PageHeader } from "@/components/ui";
import { DeleteButton } from "@/components/DeleteButton";
import { must } from "@/lib/server/must";

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
  const { data } = must(await supabase
    .from("documents")
    .select("id, file_name, kind, size_bytes, storage_path, extraction_status, extracted_text, original_deleted_at, created_at")
    .order("created_at", { ascending: false })
    .limit(100));

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title={d.title} subtitle={d.subtitle} />
      {data?.length ? (
        <ul className="card divider-list">
          {data.map((doc) => (
            <li key={doc.id} className="p-4 sm:px-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex min-w-0 gap-3">
                  <FileText aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink">{doc.kind === "text" ? d.pastedText : doc.file_name}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-muted">
                      <span className="tag">{doc.kind === "text" ? "TXT" : doc.kind.toUpperCase()}</span>
                      {size(doc.size_bytes)} · {formatDate(doc.created_at, locale)}
                    </p>
                    <p className="mt-1.5 text-xs text-ink-soft">{d.status}: {t.wizard.status[doc.extraction_status as keyof typeof t.wizard.status]}</p>
                    <p className="text-xs text-ink-soft">
                      {d.original}: {doc.storage_path ? d.stored : doc.original_deleted_at ? `${d.deletedOn} ${formatDate(doc.original_deleted_at, locale)}` : d.notStored}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {doc.storage_path && <DeleteButton url={`/api/documents/${doc.id}?scope=original`} label={d.deleteOriginal} />}
                  <DeleteButton url={`/api/documents/${doc.id}?scope=all`} label={d.deleteAll} />
                </div>
              </div>
              {doc.extracted_text && (
                <details className="group mt-2 sm:pl-8">
                  <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1 text-sm font-medium text-brand-700 sm:min-h-0">
                    {d.viewText}
                    <ChevronDown aria-hidden className="h-4 w-4 transition-transform group-open:rotate-180" />
                  </summary>
                  <pre className="well mt-2 max-h-80 overflow-auto whitespace-pre-wrap break-words font-mono text-xs text-ink-soft">{doc.extracted_text}</pre>
                </details>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={FolderOpen} title={t.common.none} text={d.subtitle} />
      )}
    </div>
  );
}

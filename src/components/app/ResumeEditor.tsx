"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Download, FileSearch, GitCompare, Loader2, Save } from "lucide-react";
import { CvForm } from "@/components/cv/CvForm";
import { CvPreview } from "@/components/cv/CvPreview";
import { VersionDiff } from "@/components/cv/VersionDiff";
import { DeleteButton } from "@/components/DeleteButton";
import { Alert } from "@/components/ui";
import { api, errorMessage } from "@/lib/client/api";
import type { CvData, CvLanguage } from "@/lib/cv/schema";
import { formatDate } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/client";

export type VersionRow = { id: string; number: number; origin: string; label: string; createdAt: string; cv: CvData };
type Resume = { id: string; title: string; language: CvLanguage; template: "classic" | "modern" };

export function ResumeEditor({ resume, versions }: { resume: Resume; versions: VersionRow[] }) {
  const { t, locale } = useI18n();
  const r = t.resumes;
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(versions[0].id);
  const selected = versions.find((v) => v.id === selectedId) ?? versions[0];
  const [draft, setDraft] = useState<CvData>(selected.cv);
  const [view, setView] = useState<"editor" | "preview" | "compare">("editor");
  const [compareId, setCompareId] = useState(versions[1]?.id ?? versions[0].id);
  const [label, setLabel] = useState("");
  const [settings, setSettings] = useState({ title: resume.title, language: resume.language, template: resume.template });
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  // Reset the draft when switching versions or after a refresh brings a new version.
  useEffect(() => {
    setDraft(selected.cv);
  }, [selected.id, selected.cv]);
  useEffect(() => {
    setSelectedId(versions[0].id);
  }, [versions]);

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(selected.cv), [draft, selected.cv]);
  const compareTo = versions.find((v) => v.id === compareId) ?? versions[0];

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  async function saveVersion() {
    setError(null);
    setBusy("save");
    const res = await api<{ versionId: string; versionNumber: number }>(`/api/resumes/${resume.id}/versions`, { method: "POST", json: { cv: draft, label } });
    setBusy(null);
    if (!res.ok) return setError(errorMessage(t, res.error, res.detail));
    setLabel("");
    setSaved(`${t.common.saved} — ${r.version(res.data.versionNumber)}`);
    router.refresh();
  }

  async function saveSettings() {
    setError(null);
    setBusy("settings");
    const res = await api(`/api/resumes/${resume.id}`, { method: "PATCH", json: settings });
    setBusy(null);
    if (!res.ok) return setError(errorMessage(t, res.error, res.detail));
    setSaved(t.common.saved);
    router.refresh();
  }

  const exportUrl = (format: "pdf" | "docx") => `/api/export?versionId=${selected.id}&format=${format}&template=${settings.template}&language=${settings.language}`;

  return (
    <div className="mx-auto max-w-[1400px]">
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link href="/resumes" className="text-sm text-ink-muted hover:text-ink">← {t.nav.resumes}</Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">{resume.title}</h1>
          <p className="text-sm text-ink-muted">{r.version(selected.number)} · {r.origin[selected.origin] ?? selected.origin}{selected.label ? ` · ${selected.label}` : ""}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={exportUrl("pdf")} className={`btn-secondary ${dirty ? "pointer-events-none opacity-50" : ""}`} aria-disabled={dirty}><Download className="h-4 w-4" /> {r.exportPdf}</a>
          <a href={exportUrl("docx")} className={`btn-secondary ${dirty ? "pointer-events-none opacity-50" : ""}`} aria-disabled={dirty}><Download className="h-4 w-4" /> {r.exportDocx}</a>
          <Link href={`/new?resume=${resume.id}`} className="btn-primary"><FileSearch className="h-4 w-4" /> {r.analyze}</Link>
        </div>
      </div>

      {error && <div className="mb-4"><Alert tone="error">{error}</Alert></div>}
      {saved && !dirty && <div className="mb-4"><Alert tone="success">{saved}</Alert></div>}
      {dirty && <div className="mb-4"><Alert tone="warn">{r.unsaved}</Alert></div>}

      <div className="grid gap-6 xl:grid-cols-[260px_1fr]">
        <aside className="space-y-4">
          <div className="card p-4">
            <h2 className="mb-2 text-sm font-semibold">{r.versions}</h2>
            <ul className="max-h-[340px] space-y-1 overflow-y-auto">
              {versions.map((v) => (
                <li key={v.id}>
                  <button
                    onClick={() => {
                      if (dirty && !window.confirm(r.unsaved)) return;
                      setSelectedId(v.id);
                    }}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm ${v.id === selected.id ? "bg-brand-50 text-brand-800" : "hover:bg-slate-50"}`}
                  >
                    <span className="font-medium">{r.version(v.number)}</span>
                    <span className="block text-xs text-ink-muted">{r.origin[v.origin] ?? v.origin} · {formatDate(v.createdAt, locale)}</span>
                    {v.label && <span className="block truncate text-xs text-ink-soft">{v.label}</span>}
                  </button>
                </li>
              ))}
            </ul>
            {versions.length > 1 && (
              <div className="mt-3 border-t border-slate-100 pt-3">
                <DeleteButton url={`/api/versions/${selected.id}`} label={r.deleteVersion} />
              </div>
            )}
          </div>

          <div className="card space-y-3 p-4">
            <h2 className="text-sm font-semibold">{r.settings}</h2>
            <div>
              <label className="label" htmlFor="rs-title">{t.wizard.cvTitle}</label>
              <input id="rs-title" className="input" value={settings.title} maxLength={200} onChange={(e) => setSettings({ ...settings, title: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="rs-lang">{t.common.language}</label>
              <select id="rs-lang" className="input" value={settings.language} onChange={(e) => setSettings({ ...settings, language: e.target.value as CvLanguage })}>
                {(["pt", "es", "en"] as const).map((l) => <option key={l} value={l}>{t.cvLanguage[l]}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="rs-tpl">{t.common.template}</label>
              <select id="rs-tpl" className="input" value={settings.template} onChange={(e) => setSettings({ ...settings, template: e.target.value as "classic" | "modern" })}>
                <option value="modern">{t.templates.modern}</option>
                <option value="classic">{t.templates.classic}</option>
              </select>
            </div>
            <button className="btn-secondary btn-sm w-full" onClick={saveSettings} disabled={busy !== null}>{busy === "settings" ? t.common.saving : t.common.save}</button>
          </div>

          <DeleteButton url={`/api/resumes/${resume.id}`} label={r.deleteCv} redirectTo="/resumes" />
        </aside>

        <section className="min-w-0">
          <div className="mb-4 flex gap-1 border-b border-slate-200" role="tablist">
            {(["editor", "preview", "compare"] as const).map((v) => (
              <button key={v} role="tab" aria-selected={view === v} onClick={() => setView(v)} className={`border-b-2 px-4 py-2 text-sm font-medium ${view === v ? "border-brand-600 text-brand-700" : "border-transparent text-ink-muted hover:text-ink"}`}>
                {v === "editor" ? r.editor : v === "preview" ? r.preview : <span className="inline-flex items-center gap-1"><GitCompare className="h-3.5 w-3.5" /> {r.compare}</span>}
              </button>
            ))}
          </div>

          {view === "editor" && (
            <div className="grid gap-6 2xl:grid-cols-2">
              <div className="card p-6">
                <CvForm value={draft} onChange={setDraft} formKey={selected.id} />
                <div className="sticky bottom-0 mt-6 flex flex-wrap items-end gap-3 border-t border-slate-200 bg-white py-4">
                  <div className="min-w-[200px] flex-1">
                    <label className="label" htmlFor="v-label">{r.versionLabel}</label>
                    <input id="v-label" className="input" value={label} maxLength={200} onChange={(e) => setLabel(e.target.value)} />
                  </div>
                  <button className="btn-primary" disabled={!dirty || busy !== null} onClick={saveVersion}>
                    {busy === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {r.saveVersion}
                  </button>
                </div>
              </div>
              <div className="hidden 2xl:block">
                <div className="sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto rounded-xl bg-slate-200 p-4">
                  <CvPreview cv={draft} language={settings.language} template={settings.template} />
                </div>
              </div>
            </div>
          )}

          {view === "preview" && (
            <div className="overflow-x-auto rounded-xl bg-slate-200 p-4">
              <CvPreview cv={draft} language={settings.language} template={settings.template} />
            </div>
          )}

          {view === "compare" && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span>{r.compareWith}</span>
                <select className="input w-auto" value={compareId} onChange={(e) => setCompareId(e.target.value)} aria-label={r.compareWith}>
                  {versions.map((v) => <option key={v.id} value={v.id}>{r.version(v.number)} — {r.origin[v.origin] ?? v.origin}</option>)}
                </select>
                <span className="text-ink-muted">→ {r.version(selected.number)}{dirty ? " *" : ""}</span>
              </div>
              <VersionDiff before={compareTo.cv} after={draft} />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

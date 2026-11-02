"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Check, FileUp, Loader2 } from "lucide-react";
import { CvForm } from "@/components/cv/CvForm";
import { Alert } from "@/components/ui";
import { api, errorMessage } from "@/lib/client/api";
import { emptyCv, type CvData, type CvLanguage } from "@/lib/cv/schema";
import { useI18n } from "@/lib/i18n/client";

export type ExistingResume = { id: string; title: string; language: string; versionId: string; versionNumber: number };
export type SavedJob = { id: string; title: string; company: string; language: string };

type Extraction = { documentId: string; status: "ok" | "low_text" | "needs_ocr" | "failed"; warnings: string[]; text: string; injectionSuspected: boolean; cv: CvData };

const LANGS: CvLanguage[] = ["pt", "es", "en"];

export function NewAnalysisWizard({
  existing,
  savedJobs,
  defaultLanguage,
  maxUploadMb,
  maxUploadBytes,
  available,
  preselectResumeId,
  aiEnabled = false,
}: {
  existing: ExistingResume[];
  savedJobs: SavedJob[];
  defaultLanguage: CvLanguage;
  maxUploadMb: number;
  /** Exact server limit; maxUploadMb is only the rounded figure shown to the user. */
  maxUploadBytes?: number;
  available: number;
  preselectResumeId: string | null;
  /** False when only the rule-based engine is available (it cannot translate CV content). */
  aiEnabled?: boolean;
}) {
  const { t } = useI18n();
  const w = t.wizard;
  const router = useRouter();
  const pre = existing.find((r) => r.id === preselectResumeId);

  const [step, setStep] = useState(pre ? 2 : 0);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Step 0/1
  const fileRef = useRef<HTMLInputElement>(null);
  const [pasted, setPasted] = useState("");
  const [extraction, setExtraction] = useState<Extraction | null>(null);
  const [cv, setCv] = useState<CvData>(emptyCv());
  const [cvTitle, setCvTitle] = useState("");
  const [cvLanguage, setCvLanguage] = useState<CvLanguage>(defaultLanguage);
  const [formKey, setFormKey] = useState("initial");

  // Step 2
  const [versionId, setVersionId] = useState<string | null>(pre?.versionId ?? null);
  const [chosenTitle, setChosenTitle] = useState(pre ? `${pre.title} · v${pre.versionNumber}` : "");
  const [jobMode, setJobMode] = useState<"new" | "saved">("new");
  const [savedJobId, setSavedJobId] = useState(savedJobs[0]?.id ?? "");
  const [job, setJob] = useState({ title: "", company: "", location: "", language: defaultLanguage, url: "", rawText: "" });
  // The job created by the last attempt: a retry (e.g. after buying credits) reuses it instead of saving a duplicate.
  const [createdJob, setCreatedJob] = useState<{ key: string; id: string } | null>(null);
  const [outputLanguage, setOutputLanguage] = useState<CvLanguage>(pre ? (pre.language as CvLanguage) : defaultLanguage);

  function handleExtraction(data: Extraction) {
    setExtraction(data);
    setCv(data.cv);
    setFormKey(data.documentId);
    setCvTitle(data.cv.contact.headline || data.cv.contact.fullName || "CV");
    setStep(1);
  }

  async function upload(file: File) {
    setError(null);
    if (file.size > (maxUploadBytes ?? maxUploadMb * 1024 * 1024)) return setError(t.errors.too_large);
    setBusy("upload");
    const form = new FormData();
    form.append("file", file);
    const res = await api<Extraction>("/api/documents", { method: "POST", body: form });
    setBusy(null);
    if (!res.ok) return setError(errorMessage(t, res.error, res.detail));
    handleExtraction(res.data);
  }

  async function usePasted() {
    setError(null);
    setBusy("paste");
    const res = await api<Extraction>("/api/documents", { method: "POST", json: { text: pasted } });
    setBusy(null);
    if (!res.ok) return setError(errorMessage(t, res.error, res.detail));
    handleExtraction(res.data);
  }

  async function saveCv() {
    setError(null);
    setBusy("save");
    const res = await api<{ resumeId: string; versionId: string }>("/api/resumes", {
      method: "POST",
      json: { title: cvTitle || "CV", language: cvLanguage, documentId: extraction?.documentId ?? null, cv },
    });
    setBusy(null);
    if (!res.ok) return setError(errorMessage(t, res.error, res.detail));
    setVersionId(res.data.versionId);
    setChosenTitle(`${cvTitle || "CV"} · v1`);
    setOutputLanguage(cvLanguage);
    setStep(2);
  }

  function chooseExisting(r: ExistingResume) {
    setVersionId(r.versionId);
    setChosenTitle(`${r.title} · v${r.versionNumber}`);
    setOutputLanguage(r.language as CvLanguage);
    setStep(2);
  }

  async function analyze() {
    if (!versionId) return;
    setError(null);
    setBusy("analyze");
    let jobId = savedJobId;
    if (jobMode === "new") {
      const key = JSON.stringify(job);
      if (createdJob?.key === key) {
        jobId = createdJob.id;
      } else {
        const created = await api<{ jobId: string }>("/api/jobs", { method: "POST", json: job });
        if (!created.ok) {
          setBusy(null);
          return setError(errorMessage(t, created.error, created.detail));
        }
        jobId = created.data.jobId;
        setCreatedJob({ key, id: jobId });
      }
    }
    const res = await api<{ analysisId: string }>("/api/analyses", { method: "POST", json: { resumeVersionId: versionId, jobId, language: outputLanguage } });
    if (!res.ok) {
      setBusy(null);
      return setError(errorMessage(t, res.error, res.detail));
    }
    router.push(`/analyses/${res.data.analysisId}`);
  }

  const stepper = (
    <ol className="mb-6 flex flex-wrap gap-2 text-sm">
      {w.steps.map((label, i) => (
        <li key={label} className={`flex items-center gap-2 rounded-full px-3 py-1 ${i === step ? "bg-brand-600 text-white" : i < step ? "bg-brand-50 text-brand-700" : "bg-slate-100 text-ink-muted"}`}>
          {i < step ? <Check className="h-3.5 w-3.5" /> : <span className="text-xs font-semibold">{i + 1}</span>}
          {label}
        </li>
      ))}
    </ol>
  );

  return (
    <div>
      {stepper}
      {error && (
        <div className="mb-4">
          <Alert tone="error">
            {error}{" "}
            {error === t.errors.payment_required && (
              <Link href="/billing" className="link">
                {w.buy}
              </Link>
            )}
          </Alert>
        </div>
      )}

      {step === 0 && (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="card p-6">
            <h2 className="text-lg font-semibold">{w.importTitle}</h2>
            <p className="mt-1 text-sm text-ink-muted">{w.importText}</p>
            <div
              className="mt-5 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files?.[0];
                if (f) void upload(f);
              }}
            >
              {busy === "upload" ? <Loader2 className="h-8 w-8 animate-spin text-brand-600" /> : <FileUp className="h-8 w-8 text-brand-600" />}
              <p className="mt-3 text-sm font-medium">{busy === "upload" ? w.uploading : w.upload}</p>
              <p className="mt-1 text-xs text-ink-muted">{w.uploadHint(maxUploadMb)}</p>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void upload(f);
                  e.target.value = "";
                }}
              />
              <button type="button" className="btn-primary mt-4" disabled={busy !== null} onClick={() => fileRef.current?.click()}>
                {w.chooseFile}
              </button>
            </div>
            {existing.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold">{w.orExisting}</h3>
                <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200">
                  {existing.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                      <span className="truncate">{r.title} <span className="text-ink-muted">· v{r.versionNumber} · {r.language.toUpperCase()}</span></span>
                      <button className="btn-secondary btn-sm shrink-0" onClick={() => chooseExisting(r)}>{w.useVersion}</button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
          <section className="card p-6">
            <h2 className="text-lg font-semibold">{w.orPaste}</h2>
            <textarea className="input mt-4 min-h-[280px] font-mono text-xs" placeholder={w.pastePlaceholder} value={pasted} onChange={(e) => setPasted(e.target.value)} maxLength={60000} />
            <button className="btn-secondary mt-3" disabled={pasted.trim().length < 30 || busy !== null} onClick={usePasted}>
              {busy === "paste" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {w.useText}
            </button>
          </section>
        </div>
      )}

      {step === 1 && extraction && (
        <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
          <section className="card p-6">
            <h2 className="text-lg font-semibold">{w.reviewTitle}</h2>
            <p className="mt-1 text-sm text-ink-muted">{w.reviewText}</p>
            <div className="mt-4 space-y-2">
              <Alert tone={extraction.status === "ok" ? "success" : extraction.status === "low_text" ? "warn" : "error"}>{w.status[extraction.status]}</Alert>
              {extraction.warnings.filter((x) => x !== "very_short_text" || extraction.status === "ok").map((x) => (
                <Alert key={x} tone="warn">{w.warnings[x] ?? x}</Alert>
              ))}
              {extraction.injectionSuspected && <Alert tone="warn">{w.injection}</Alert>}
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="cv-title">{w.cvTitle}</label>
                <input id="cv-title" className="input" value={cvTitle} maxLength={200} onChange={(e) => setCvTitle(e.target.value)} />
              </div>
              <div>
                <label className="label" htmlFor="cv-lang">{w.cvLanguage}</label>
                <select id="cv-lang" className="input" value={cvLanguage} onChange={(e) => setCvLanguage(e.target.value as CvLanguage)}>
                  {LANGS.map((l) => <option key={l} value={l}>{t.cvLanguage[l]}</option>)}
                </select>
              </div>
            </div>
            <div className="mt-6">
              <CvForm value={cv} onChange={setCv} formKey={formKey} />
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <button className="btn-secondary" onClick={() => setStep(0)}>{t.common.back}</button>
              <button className="btn-primary" onClick={saveCv} disabled={busy !== null}>
                {busy === "save" && <Loader2 className="h-4 w-4 animate-spin" />}
                {w.saveAndContinue}
              </button>
            </div>
          </section>
          <aside className="card h-fit p-4 xl:sticky xl:top-6">
            <h3 className="text-sm font-semibold">{w.extracted}</h3>
            <pre className="mt-2 max-h-[70vh] overflow-auto whitespace-pre-wrap rounded bg-slate-50 p-3 text-xs text-ink-soft">{extraction.text || "—"}</pre>
          </aside>
        </div>
      )}

      {step === 2 && (
        <section className="card p-6">
          <h2 className="text-lg font-semibold">{w.jobTitle}</h2>
          <p className="mt-1 text-sm text-ink-muted">{w.jobText}</p>
          <p className="mt-3 text-sm"><span className="badge bg-brand-50 text-brand-700">{chosenTitle}</span></p>

          {savedJobs.length > 0 && (
            <div className="mt-4 flex gap-2 text-sm">
              <button className={jobMode === "new" ? "btn-primary btn-sm" : "btn-secondary btn-sm"} onClick={() => setJobMode("new")}>{w.jobDescription}</button>
              <button className={jobMode === "saved" ? "btn-primary btn-sm" : "btn-secondary btn-sm"} onClick={() => setJobMode("saved")}>{w.useSavedJob}</button>
            </div>
          )}

          {jobMode === "new" ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="j-title">{w.jobRole}</label>
                <input id="j-title" className="input" value={job.title} maxLength={200} onChange={(e) => setJob({ ...job, title: e.target.value })} />
              </div>
              <div>
                <label className="label" htmlFor="j-company">{w.company} <span className="text-ink-muted">({t.common.optional})</span></label>
                <input id="j-company" className="input" value={job.company} maxLength={200} onChange={(e) => setJob({ ...job, company: e.target.value })} />
              </div>
              <div>
                <label className="label" htmlFor="j-location">{w.location} <span className="text-ink-muted">({t.common.optional})</span></label>
                <input id="j-location" className="input" value={job.location} maxLength={200} onChange={(e) => setJob({ ...job, location: e.target.value })} />
              </div>
              <div>
                <label className="label" htmlFor="j-url">{w.url} <span className="text-ink-muted">({t.common.optional})</span></label>
                <input id="j-url" type="url" className="input" value={job.url} maxLength={1000} placeholder="https://" onChange={(e) => setJob({ ...job, url: e.target.value })} />
              </div>
              <div>
                <label className="label" htmlFor="j-lang">{w.jobLanguage}</label>
                <select id="j-lang" className="input" value={job.language} onChange={(e) => setJob({ ...job, language: e.target.value as CvLanguage })}>
                  {LANGS.map((l) => <option key={l} value={l}>{t.cvLanguage[l]}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="label" htmlFor="j-text">{w.jobDescription}</label>
                <textarea id="j-text" className="input min-h-[260px] text-sm" placeholder={w.jobPlaceholder} value={job.rawText} maxLength={30000} onChange={(e) => setJob({ ...job, rawText: e.target.value })} />
              </div>
            </div>
          ) : (
            <div className="mt-4">
              <select className="input" value={savedJobId} onChange={(e) => setSavedJobId(e.target.value)} aria-label={w.useSavedJob}>
                {savedJobs.map((j) => (
                  <option key={j.id} value={j.id}>{[j.title || "—", j.company].filter(Boolean).join(" · ")}</option>
                ))}
              </select>
            </div>
          )}

          <div className="mt-4 max-w-xs">
            <label className="label" htmlFor="out-lang">{w.outputLanguage}</label>
            <select id="out-lang" className="input" value={outputLanguage} onChange={(e) => setOutputLanguage(e.target.value as CvLanguage)}>
              {LANGS.map((l) => <option key={l} value={l}>{t.cvLanguage[l]}</option>)}
            </select>
          </div>
          {!aiEnabled && <p className="mt-2 max-w-xl text-xs text-ink-muted">{w.heuristicLanguageNote}</p>}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button className="btn-secondary" onClick={() => setStep(extraction ? 1 : 0)} disabled={busy !== null}>{t.common.back}</button>
            <button
              className="btn-primary"
              disabled={busy !== null || !versionId || (jobMode === "new" ? job.rawText.trim().length < 30 : !savedJobId)}
              onClick={analyze}
            >
              {busy === "analyze" && <Loader2 className="h-4 w-4 animate-spin" />}
              {busy === "analyze" ? w.analyzing : w.analyze}
            </button>
            <span className="text-xs text-ink-muted">
              {available > 0 ? w.creditsInfo : (
                <>
                  {w.noCredits} <Link href="/billing" className="link">{w.buy}</Link>
                </>
              )}
            </span>
          </div>
        </section>
      )}
    </div>
  );
}

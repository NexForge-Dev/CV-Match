"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Check, FileText, FileUp, Loader2 } from "lucide-react";
import { CvForm } from "@/components/cv/CvForm";
import { Alert } from "@/components/ui";
import { api, errorMessage } from "@/lib/client/api";
import { emptyCv, type CvData, type CvLanguage } from "@/lib/cv/schema";
import { useI18n } from "@/lib/i18n/client";
import { clearDraft, loadDraft, saveDraft, stepFromUrl } from "@/lib/client/wizardDraft";

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
  const [dragging, setDragging] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);
  // Errors are shown above the steps: bring them into view (on phones the buttons are far below).
  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [error]);

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

  // Phones often reload the tab when coming back from copying the job ad: bring the wizard back as it was.
  const [restored, setRestored] = useState(false);
  const preselected = pre !== undefined;
  useEffect(() => {
    const draft = preselected ? null : loadDraft();
    if (draft) {
      setPasted(draft.pasted);
      setExtraction(draft.extraction);
      setCv(draft.cv);
      setCvTitle(draft.cvTitle);
      setCvLanguage(draft.cvLanguage);
      setFormKey(draft.formKey);
      setVersionId(draft.versionId);
      setChosenTitle(draft.chosenTitle);
      setJobMode(draft.jobMode);
      setSavedJobId(draft.savedJobId);
      setJob(draft.job);
      setCreatedJob(draft.createdJob);
      setOutputLanguage(draft.outputLanguage);
      setStep(draft.step);
    }
    setRestored(true);
  }, [preselected]);

  useEffect(() => {
    if (!restored) return;
    const timer = setTimeout(() => saveDraft({ step, pasted, extraction, cv, cvTitle, cvLanguage, formKey, versionId, chosenTitle, jobMode, savedJobId, job, createdJob, outputLanguage }), 300);
    return () => clearTimeout(timer);
  }, [restored, step, pasted, extraction, cv, cvTitle, cvLanguage, formKey, versionId, chosenTitle, jobMode, savedJobId, job, createdJob, outputLanguage]);

  // Each step is a history entry, so the phone's back button goes to the previous step instead of leaving.
  useEffect(() => {
    if (!restored) return;
    const url = new URL(window.location.href);
    if (Number(url.searchParams.get("step") ?? 0) === step) return;
    url.searchParams.set("step", String(step));
    window.history.pushState(null, "", url);
  }, [restored, step]);

  useEffect(() => {
    const onPop = () => setStep(stepFromUrl(window.location.search, { review: extraction !== null, job: versionId !== null }));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [extraction, versionId]);

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
    clearDraft();
    router.push(`/analyses/${res.data.analysisId}`);
  }

  // The stepper reaches its last step while the analysis runs.
  const current = busy === "analyze" ? 3 : step;
  const stepper = (
    <ol className="mb-6 flex flex-wrap items-center gap-y-2" aria-label={w.stepOf(current + 1, w.steps.length)}>
      {w.steps.map((label, i) => (
        <li key={label} aria-current={i === current ? "step" : undefined} className="flex flex-1 items-center gap-2 last:flex-none">
          <span className={`readout grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-semibold ${i === current ? "bg-brand-600 text-white" : i < current ? "bg-brand-50 text-brand-700" : "bg-slate-200 text-ink-muted"}`}>
            {i < current ? <Check aria-hidden className="h-3.5 w-3.5" /> : i + 1}
          </span>
          <span className={`text-sm font-medium ${i === current ? "text-ink" : "hidden text-ink-muted sm:inline"}`}>{label}</span>
          {i < w.steps.length - 1 && <span aria-hidden className={`mx-1 h-px min-w-3 flex-1 sm:mx-2 ${i < current ? "bg-brand-300" : "bg-line-strong"}`} />}
        </li>
      ))}
    </ol>
  );

  return (
    <div>
      {stepper}
      {available <= 0 && (
        <div className="mb-4">
          <Alert tone="warn">
            {w.noCredits} <Link href="/billing" className="link">{w.buy}</Link>
          </Alert>
        </div>
      )}
      {error && (
        <div className="mb-4" ref={errorRef} role="alert">
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
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="card p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-ink">{w.importTitle}</h2>
            <p className="mt-1 text-sm text-ink-muted">{w.importText}</p>
            <div
              className={`mt-5 flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-10 text-center transition-colors ${dragging ? "border-brand-500 bg-brand-50" : "border-line-strong bg-slate-50"}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const f = e.dataTransfer.files?.[0];
                if (f) void upload(f);
              }}
            >
              <span className="grid h-12 w-12 place-items-center rounded-full bg-white text-brand-600 shadow-card">
                {busy === "upload" ? <Loader2 aria-hidden className="h-6 w-6 animate-spin" /> : <FileUp aria-hidden className="h-6 w-6" />}
              </span>
              <p className="mt-3 text-sm font-medium text-ink">{busy === "upload" ? w.uploading : dragging ? w.dropHere : w.upload}</p>
              <p className="mt-1 max-w-xs text-xs text-ink-muted">{w.uploadHint(maxUploadMb)}</p>
              <input
                ref={fileRef}
                type="file"
                aria-label={w.upload}
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
                <h3 className="text-sm font-semibold text-ink">{w.orExisting}</h3>
                <ul className="divider-list mt-2 rounded-lg border border-line">
                  {existing.map((r) => (
                    <li key={r.id} className="flex flex-col gap-2 px-3 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                      <span className="min-w-0 truncate text-ink">{r.title} <span className="text-ink-muted">· v{r.versionNumber} · {r.language.toUpperCase()}</span></span>
                      <button className="btn-secondary btn-sm shrink-0 self-start sm:self-auto" onClick={() => chooseExisting(r)}>{w.useVersion}</button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
          <section className="card flex flex-col p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-ink">{w.orPaste}</h2>
            <textarea className="input mt-4 min-h-[280px] flex-1 sm:text-sm" aria-label={w.orPaste} placeholder={w.pastePlaceholder} value={pasted} onChange={(e) => setPasted(e.target.value)} maxLength={60000} />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button className="btn-secondary" disabled={pasted.trim().length < 30 || busy !== null} onClick={usePasted}>
                {busy === "paste" ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}
                {w.useText}
              </button>
              {pasted.trim().length > 0 && pasted.trim().length < 30 && <span className="text-xs text-ink-muted">{w.minChars(30)}</span>}
            </div>
          </section>
        </div>
      )}

      {step === 1 && extraction && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <section className="card min-w-0 p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-ink">{w.reviewTitle}</h2>
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
            <div className="mt-6 flex flex-wrap gap-2 border-t border-slate-100 pt-5">
              <button className="btn-secondary" onClick={() => setStep(0)}>{t.common.back}</button>
              <button className="btn-primary" onClick={saveCv} disabled={busy !== null}>
                {busy === "save" && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />}
                {w.saveAndContinue}
              </button>
            </div>
          </section>
          <aside className="card h-fit min-w-0 p-4 xl:sticky xl:top-6">
            <h3 className="text-sm font-semibold text-ink">{w.extracted}</h3>
            <pre className="well mt-2 max-h-[40vh] overflow-auto whitespace-pre-wrap break-words font-mono text-xs text-ink-soft xl:max-h-[70vh]">{extraction.text || "—"}</pre>
          </aside>
        </div>
      )}

      {step === 2 && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="card min-w-0 p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-ink">{w.jobTitle}</h2>
            <p className="mt-1 text-sm text-ink-muted">{w.jobText}</p>

            {savedJobs.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                <button aria-pressed={jobMode === "new"} className="chip" onClick={() => setJobMode("new")}>{w.jobDescription}</button>
                <button aria-pressed={jobMode === "saved"} className="chip" onClick={() => setJobMode("saved")}>{w.useSavedJob}</button>
              </div>
            )}

            {jobMode === "new" ? (
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="label" htmlFor="j-text">{w.jobDescription}</label>
                  <textarea id="j-text" className="input min-h-[260px] sm:text-sm" placeholder={w.jobPlaceholder} value={job.rawText} maxLength={30000} onChange={(e) => setJob({ ...job, rawText: e.target.value })} />
                  {job.rawText.trim().length > 0 && job.rawText.trim().length < 30 && <p className="hint">{w.minChars(30)}</p>}
                </div>
                <div>
                  <label className="label" htmlFor="j-title">{w.jobRole}</label>
                  <input id="j-title" className="input" value={job.title} maxLength={200} onChange={(e) => setJob({ ...job, title: e.target.value })} />
                </div>
                <div>
                  <label className="label" htmlFor="j-company">{w.company} <span className="font-normal text-ink-muted">({t.common.optional})</span></label>
                  <input id="j-company" className="input" value={job.company} maxLength={200} onChange={(e) => setJob({ ...job, company: e.target.value })} />
                </div>
                <div>
                  <label className="label" htmlFor="j-location">{w.location} <span className="font-normal text-ink-muted">({t.common.optional})</span></label>
                  <input id="j-location" className="input" value={job.location} maxLength={200} onChange={(e) => setJob({ ...job, location: e.target.value })} />
                </div>
                <div>
                  <label className="label" htmlFor="j-url">{w.url} <span className="font-normal text-ink-muted">({t.common.optional})</span></label>
                  <input id="j-url" type="url" className="input" value={job.url} maxLength={1000} placeholder="https://" onChange={(e) => setJob({ ...job, url: e.target.value })} />
                </div>
                <div>
                  <label className="label" htmlFor="j-lang">{w.jobLanguage}</label>
                  <select id="j-lang" className="input" value={job.language} onChange={(e) => setJob({ ...job, language: e.target.value as CvLanguage })}>
                    {LANGS.map((l) => <option key={l} value={l}>{t.cvLanguage[l]}</option>)}
                  </select>
                </div>
              </div>
            ) : (
              <div className="mt-5">
                <select className="input" value={savedJobId} onChange={(e) => setSavedJobId(e.target.value)} aria-label={w.useSavedJob}>
                  {savedJobs.map((j) => (
                    <option key={j.id} value={j.id}>{[j.title || "—", j.company].filter(Boolean).join(" · ")}</option>
                  ))}
                </select>
              </div>
            )}
          </section>

          <aside className="card h-fit min-w-0 p-5 lg:sticky lg:top-6">
            <h3 className="eyebrow">{w.summaryTitle}</h3>
            <div className="mt-3 flex items-start gap-2.5 rounded-lg bg-brand-50 px-3 py-2.5">
              <FileText aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
              <div className="min-w-0">
                <p className="text-xs text-ink-muted">{w.summaryCv}</p>
                <p className="break-words text-sm font-medium text-ink">{chosenTitle}</p>
              </div>
            </div>
            <div className="mt-4">
              <label className="label" htmlFor="out-lang">{w.outputLanguage}</label>
              <select id="out-lang" className="input" value={outputLanguage} onChange={(e) => setOutputLanguage(e.target.value as CvLanguage)}>
                {LANGS.map((l) => <option key={l} value={l}>{t.cvLanguage[l]}</option>)}
              </select>
              {!aiEnabled && <p className="hint">{w.heuristicLanguageNote}</p>}
            </div>
            <button
              className="btn-primary mt-5 w-full"
              disabled={busy !== null || !versionId || (jobMode === "new" ? job.rawText.trim().length < 30 : !savedJobId)}
              onClick={analyze}
            >
              {busy === "analyze" && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />}
              {busy === "analyze" ? w.analyzing : w.analyze}
            </button>
            <p className="hint text-center">
              {available > 0 ? w.creditsInfo : (
                <>
                  {w.noCredits} <Link href="/billing" className="link">{w.buy}</Link>
                </>
              )}
            </p>
            <button className="btn-ghost mt-2 w-full" onClick={() => setStep(extraction ? 1 : 0)} disabled={busy !== null}>{t.common.back}</button>
          </aside>
        </div>
      )}
    </div>
  );
}

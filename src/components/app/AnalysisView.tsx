"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, ArrowRight, CheckCircle2, ChevronDown, Copy, ExternalLink, FileText, Info, Loader2, Lock, SearchX, ShieldCheck } from "lucide-react";
import type { MatchResult, MatchStatus, ScoreBreakdown } from "@/lib/analysis/match";
import type { Requirement } from "@/lib/analysis/requirements";
import { localizeSkillLabel } from "@/lib/analysis/skillLabels";
import { scoreBand } from "@/lib/analysis/scoreBand";
import type { PlanFeatures } from "@/lib/billing/plans";
import { api, errorMessage } from "@/lib/client/api";
import { tabPanelProps, tabProps } from "@/lib/client/tabs";
import { formatDate } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/client";
import { Alert, CardHeader, ScoreRing, ScoreScale } from "@/components/ui";
import { DeleteButton } from "@/components/DeleteButton";
import { STATUS_STYLE, StatusBadge } from "@/components/StatusBadge";

export type SuggestionRow = {
  id: string;
  kind: string;
  section: string;
  target_ref: { skill?: string; experienceId?: string; bulletIndex?: number } | null;
  original_text: string;
  suggested_text: string;
  edited_text: string | null;
  rationale: string;
  status: "pending" | "accepted" | "rejected";
  requires_confirmation: boolean;
  confirmed_by_user: boolean;
  flags: string[];
};

type InterviewItem = { requirement: string; question: string; evidence: string[]; tip: string };

type Props = {
  initialTab: "requirements" | "suggestions";
  analysis: {
    id: string;
    createdAt: string;
    language: string;
    score: number | null;
    breakdown: ScoreBreakdown;
    requirements: Requirement[];
    results: MatchResult[];
    provider: string;
    tier: "free" | "full";
    features: PlanFeatures;
    dropped: number;
    resumeId: string;
    resumeTitle: string;
    versionNumber: number;
    job: { id: string; title: string; company: string; location: string; url: string };
  };
  suggestions: SuggestionRow[];
  letter: string | null;
  interview: InterviewItem[] | null;
  /** Which extras were produced by the rule-based fallback because the AI failed. */
  extrasFallback?: { letter?: boolean; interview?: boolean };
};

const STATUS_ORDER: MatchStatus[] = ["found", "partial", "not_found", "ambiguous"];
const TABS = ["requirements", "suggestions", "letter", "interview"] as const;
const OVERVIEW_ITEMS = 5;

export function AnalysisView({ initialTab, analysis, suggestions: initialSuggestions, letter: initialLetter, interview: initialInterview, extrasFallback = {} }: Props) {
  const { t, locale } = useI18n();
  const a = t.analysis;
  const router = useRouter();
  const [tab, setTab] = useState<"requirements" | "suggestions" | "letter" | "interview">(initialTab);
  const [filter, setFilter] = useState<MatchStatus | "all">("all");
  const [suggestions, setSuggestions] = useState(initialSuggestions);
  const [letter, setLetter] = useState(initialLetter);
  const [interview, setInterview] = useState(initialInterview);
  const [fallback, setFallback] = useState(extrasFallback);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ text: string; resumeId: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const resultById = useMemo(() => new Map(analysis.results.map((r) => [r.requirementId, r])), [analysis.results]);
  const evaluated = analysis.requirements
    .map((req) => ({ req, res: resultById.get(req.id) }))
    .filter((r): r is { req: Requirement; res: MatchResult } => Boolean(r.res));
  const rows = evaluated.filter((r) => filter === "all" || r.res.status === filter);
  const mustFirst = (x: { req: Requirement }, y: { req: Requirement }) => Number(y.req.importance === "must") - Number(x.req.importance === "must");
  const strengths = evaluated.filter((r) => r.res.status === "found").sort(mustFirst);
  const gaps = evaluated
    .filter((r) => r.res.status === "not_found" || r.res.status === "partial")
    .sort((x, y) => mustFirst(x, y) || Number(y.res.status === "not_found") - Number(x.res.status === "not_found"));
  const b = analysis.breakdown;
  const band = scoreBand(analysis.score);
  const reviewable = suggestions.filter((s) => s.kind !== "gap_answer");
  const pendingCount = reviewable.filter((s) => s.status === "pending").length;
  const acceptedCount = suggestions.filter((s) => s.status === "accepted" && s.kind !== "gap_answer").length;
  const tabsRef = useRef<HTMLDivElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  // The buttons that cause these messages sit far below them on phones.
  useEffect(() => {
    if (error || notice) feedbackRef.current?.scrollIntoView({ block: "center" });
  }, [error, notice]);

  function showRequirements(status: MatchStatus | "all") {
    setFilter(status);
    setTab("requirements");
    tabsRef.current?.scrollIntoView({ block: "start" });
  }

  function showSuggestions() {
    setTab("suggestions");
    tabsRef.current?.scrollIntoView({ block: "start" });
  }

  async function patch(id: string, body: Record<string, unknown>) {
    const prev = suggestions;
    setSuggestions((list) =>
      list.map((s) =>
        s.id === id
          ? {
              ...s,
              ...(body.status ? { status: body.status as SuggestionRow["status"] } : {}),
              ...("editedText" in body ? { edited_text: body.editedText as string | null } : {}),
              ...("confirmedByUser" in body ? { confirmed_by_user: Boolean(body.confirmedByUser) } : {}),
            }
          : s,
      ),
    );
    const res = await api(`/api/suggestions/${id}`, { method: "PATCH", json: body });
    if (!res.ok) {
      setSuggestions(prev);
      setError(errorMessage(t, res.error, res.detail));
    }
  }

  async function applyAccepted() {
    setError(null);
    setBusy("apply");
    const res = await api<{ versionId: string; versionNumber: number; resumeId: string }>(`/api/analyses/${analysis.id}/apply`, { method: "POST" });
    setBusy(null);
    if (!res.ok) return setError(errorMessage(t, res.error, res.detail));
    setNotice({ text: `${a.applied} (v${res.data.versionNumber})`, resumeId: res.data.resumeId });
    router.refresh();
  }

  async function generate(kind: "cover_letter" | "interview_prep") {
    setError(null);
    setBusy(kind);
    const res = await api<{ content: { text?: string; items?: InterviewItem[]; fallback?: boolean } }>(`/api/analyses/${analysis.id}/extras`, { method: "POST", json: { kind } });
    setBusy(null);
    if (!res.ok) return setError(errorMessage(t, res.error, res.detail));
    const usedFallback = Boolean(res.data.content.fallback);
    if (kind === "cover_letter") {
      setLetter(res.data.content.text ?? "");
      setFallback((f) => ({ ...f, letter: usedFallback }));
    } else {
      setInterview(res.data.content.items ?? []);
      setFallback((f) => ({ ...f, interview: usedFallback }));
    }
  }

  const tabs = [
    { id: "requirements", label: a.tabs.requirements },
    { id: "suggestions", label: `${a.tabs.suggestions} (${suggestions.length})` },
    { id: "letter", label: a.tabs.letter },
    { id: "interview", label: a.tabs.interview },
  ] as const;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <Link href="/analyses" className="inline-flex min-h-11 items-center text-sm text-ink-muted hover:text-ink sm:min-h-0">← {t.nav.analyses}</Link>
          <h1 className="mt-1 break-words text-2xl font-bold tracking-tight text-ink">{analysis.job.title || analysis.job.company || "—"}</h1>
          <p className="mt-1 break-words text-sm text-ink-soft">
            {[analysis.job.company, analysis.job.location].filter(Boolean).join(" · ")}
            {analysis.job.url && (
              <a href={analysis.job.url} target="_blank" rel="noopener noreferrer nofollow" aria-label={t.jobs.viewAd} className="link ml-2 inline-flex min-h-11 min-w-11 items-center justify-center align-middle sm:min-h-0 sm:min-w-0">
                <ExternalLink aria-hidden className="h-3.5 w-3.5" />
              </a>
            )}
          </p>
          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-muted">
            <span className="tag">{formatDate(analysis.createdAt, locale)}</span>
            <Link className="link-solo min-w-0 max-w-full gap-1 [overflow-wrap:anywhere]" href={`/resumes/${analysis.resumeId}`}>
              <FileText aria-hidden className="h-3.5 w-3.5" /> {analysis.resumeTitle} · v{analysis.versionNumber}
            </Link>
            <span>{a.provider[analysis.provider] ?? analysis.provider}</span>
          </p>
        </div>
        <div className="shrink-0">
          <DeleteButton url={`/api/analyses/${analysis.id}`} label={a.deleteAnalysis} redirectTo="/analyses" />
        </div>
      </div>

      {analysis.provider === "heuristic_fallback" && <div className="mb-4"><Alert tone="warn">{a.fallbackNotice}</Alert></div>}

      {/* Result overview: what the index says, then how the requirements add up to it. */}
      <section className="card mb-4 grid grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]" aria-label={a.title}>
        <div className="border-b border-slate-100 p-5 sm:p-6 lg:border-b-0 lg:border-r">
          <p className="eyebrow">{a.scoreLabel}</p>
          <div className="mt-3 flex items-center gap-5">
            <ScoreRing score={analysis.score} size={112} label={a.scoreLabel} />
            <div className="min-w-0">
              <p className="text-lg font-semibold text-ink">{a.bands[band].label}</p>
              <p className="mt-1 text-sm text-ink-soft">{a.bands[band].text}</p>
            </div>
          </div>
          <div className="mt-5"><ScoreScale score={analysis.score} /></div>
        </div>

        <div className="p-5 sm:p-6">
          <p className="eyebrow">{a.coverage}</p>
          <div className="mt-3 flex h-3 gap-0.5" role="img" aria-label={a.counts(b.counts.found, b.counts.partial, b.counts.not_found, b.counts.ambiguous)}>
            {STATUS_ORDER.flatMap((status) =>
              Array.from({ length: b.counts[status] }, (_, i) => <span key={`${status}-${i}`} className={`min-w-0 flex-1 first:rounded-l-full last:rounded-r-full ${STATUS_STYLE[status].solid}`} />),
            )}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 xl:grid-cols-4">
            {STATUS_ORDER.map((status) => {
              const { Icon, text } = STATUS_STYLE[status];
              return (
                <button key={status} onClick={() => showRequirements(status)} className="rounded-lg border border-line px-3 py-2 text-left transition-colors hover:border-line-strong hover:bg-slate-50">
                  <span className="flex items-center gap-1.5">
                    <Icon aria-hidden className={`h-3.5 w-3.5 ${text}`} />
                    <span className="readout text-lg font-semibold text-ink">{b.counts[status]}</span>
                  </span>
                  <span className="mt-0.5 block text-xs leading-snug text-ink-muted">{a.status[status]}</span>
                </button>
              );
            })}
          </div>
          {b.mustTotal > 0 && (
            <div className="mt-4">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <p className="font-medium text-ink">{a.mustCoverage}</p>
                <p className="readout shrink-0 font-semibold text-ink">{b.mustFound}/{b.mustTotal}</p>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-brand-600" style={{ width: `${Math.round((b.mustFound / b.mustTotal) * 100)}%` }} />
              </div>
              <p className="mt-1.5 text-xs text-ink-muted">{a.mustSummary(b.mustFound, b.mustTotal)}</p>
            </div>
          )}
        </div>

        <div className="border-t border-slate-100 bg-slate-50 px-5 py-3 text-sm text-ink-soft sm:px-6 lg:col-span-2 lg:rounded-b-xl">
          <p className="flex gap-2"><Info aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" /> {a.scoreDisclaimer}</p>
          <details className="group mt-1 pl-6">
            <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1 font-medium text-brand-700 sm:min-h-0">
              {a.howCalculated}
              <ChevronDown aria-hidden className="h-4 w-4 transition-transform group-open:rotate-180" />
            </summary>
            <p className="mt-1 max-w-3xl">{a.formula}</p>
          </details>
        </div>
      </section>

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2">
        <section className="card flex min-w-0 flex-col">
          <CardHeader icon={ShieldCheck} title={a.strengths} action={strengths.length > OVERVIEW_ITEMS ? <button className="link-solo" onClick={() => showRequirements("found")}>{a.seeAll}</button> : undefined} />
          {strengths.length ? (
            <ul className="divider-list flex-1">
              {strengths.slice(0, OVERVIEW_ITEMS).map(({ req }) => <OverviewRow key={req.id} req={req} status="found" language={analysis.language} />)}
            </ul>
          ) : (
            <p className="flex-1 px-5 py-6 text-sm text-ink-muted">{a.noStrengths}</p>
          )}
        </section>
        <section className="card flex min-w-0 flex-col">
          <CardHeader icon={SearchX} title={a.gaps} action={gaps.length > OVERVIEW_ITEMS ? <button className="link-solo" onClick={() => showRequirements("not_found")}>{a.seeAll}</button> : undefined} />
          {gaps.length ? (
            <ul className="divider-list flex-1">
              {gaps.slice(0, OVERVIEW_ITEMS).map(({ req, res }) => <OverviewRow key={req.id} req={req} status={res.status} language={analysis.language} />)}
            </ul>
          ) : (
            <p className="flex-1 px-5 py-6 text-sm text-ink-muted">{a.noGaps}</p>
          )}
          {pendingCount > 0 && (
            <div className="border-t border-slate-100 p-3">
              <button className="btn-primary w-full" onClick={showSuggestions}>
                {a.reviewImprovements(pendingCount)} <ArrowRight aria-hidden className="h-4 w-4" />
              </button>
            </div>
          )}
        </section>
      </div>

      <div ref={tabsRef} className="tabs mb-5 scroll-mt-16 lg:scroll-mt-4" role="tablist">
        {tabs.map((x) => (
          <button key={x.id} {...tabProps("analysis", TABS, tab, x.id, setTab)} className="tab">
            {x.label}
          </button>
        ))}
      </div>

      <div ref={feedbackRef} role="status">
        {error && <div className="mb-4"><Alert tone="error">{error}</Alert></div>}
        {notice && (
          <div className="mb-4">
            <Alert tone="success">
              {notice.text} <Link className="link" href={`/resumes/${notice.resumeId}`}>{a.openEditor}</Link>
            </Alert>
          </div>
        )}
      </div>

      <div {...tabPanelProps("analysis", tab)}>
      {tab === "requirements" && (
        <section>
          <div className="mb-3 flex flex-wrap gap-2">
            {(["all", ...STATUS_ORDER] as const).map((s) => (
              <button key={s} aria-pressed={filter === s} className="chip" onClick={() => setFilter(s)}>
                {s === "all" ? t.common.all : a.status[s]}
                <span className="readout">{s === "all" ? analysis.requirements.length : b.counts[s]}</span>
              </button>
            ))}
          </div>
          <p className="mb-4 max-w-3xl text-xs text-ink-muted">{a.absenceNote}</p>
          <ul className="card divider-list">
            {rows.map(({ req, res }) => {
              const style = STATUS_STYLE[res.status];
              return (
                <li key={req.id} className="flex gap-3 p-4 sm:p-5">
                  <style.Icon aria-hidden className={`mt-0.5 h-5 w-5 shrink-0 ${style.text}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="break-words font-medium text-ink">{localizeSkillLabel(req.label, analysis.language)}</p>
                        {req.sourceText !== req.label && <p className="mt-0.5 text-xs text-ink-muted">“{req.sourceText}”</p>}
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-1">
                        <span className={`badge border ${req.importance === "must" ? "border-line-strong bg-white text-ink" : "border-line bg-white text-ink-muted"}`}>{req.importance === "must" ? a.must : a.nice}</span>
                        <StatusBadge status={res.status} label={a.status[res.status]} />
                      </div>
                    </div>
                    {res.notes.length > 0 && (
                      <ul className="mt-2 space-y-0.5 text-xs text-ink-soft">
                        {res.notes.map((n) => (
                          <li key={n} className="flex gap-1"><AlertCircle aria-hidden className="mt-px h-3 w-3 shrink-0" /> {a.notes[n] ?? n}</li>
                        ))}
                      </ul>
                    )}
                    {res.relatedSkills.length > 0 && <p className="mt-1 text-xs text-ink-soft">{a.related}: {res.relatedSkills.join(", ")}</p>}
                    {res.evidence.length > 0 && (
                      <div className="mt-3">
                        <p className="eyebrow mb-1.5">
                          {res.notes.includes("negated_context") || res.notes.includes("learning_context") ? a.mentionInCv : a.evidence}
                        </p>
                        <div className="space-y-1.5">
                          {res.evidence.map((ev, i) => (
                            <blockquote key={i} className="well flex flex-col items-start gap-1 py-2 text-sm text-ink-soft sm:flex-row sm:gap-2">
                              <span className="tag shrink-0 bg-white">{a.sections[ev.section] ?? ev.section}</span>
                              <span className="min-w-0 max-w-full break-words">{ev.quote}</span>
                            </blockquote>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {tab === "suggestions" && (
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-ink">{a.suggestionsTitle}</h2>
            <p className="mt-0.5 max-w-3xl text-sm text-ink-muted">{a.suggestionsText}</p>
          </div>
          <div className="mb-4 space-y-2 empty:hidden">
            {analysis.tier === "free" && (
              <Alert tone="info">
                {a.freeLimit} <Link href="/billing" className="link">{t.nav.billing}</Link>
              </Alert>
            )}
            {analysis.dropped > 0 && <Alert tone="warn">{a.droppedNotice(analysis.dropped)}</Alert>}
          </div>
          {suggestions.length === 0 ? (
            <p className="card px-5 py-8 text-center text-sm text-ink-muted">{a.noSuggestions}</p>
          ) : (
            <ul className="space-y-3">
              {suggestions.map((s) => (
                <SuggestionCard key={s.id} s={s} onPatch={(body) => patch(s.id, body)} />
              ))}
            </ul>
          )}
          <div className="safe-bottom sticky bottom-0 z-10 mt-4 flex flex-col gap-2 border-t border-line bg-slate-50 pt-3 sm:flex-row sm:items-center sm:justify-between">
            {reviewable.length > 0 && <p className="readout text-xs text-ink-muted">{a.reviewed(reviewable.length - pendingCount, reviewable.length)}</p>}
            <button className="btn-primary w-full sm:ml-auto sm:w-auto" disabled={acceptedCount === 0 || busy !== null} onClick={applyAccepted}>
              {busy === "apply" && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />}
              {busy === "apply" ? a.applying : a.apply(acceptedCount)}
            </button>
          </div>
        </section>
      )}

      {tab === "letter" && (
        <ExtraPanel
          locked={!analysis.features.cover_letter}
          text={a.letterText}
          hasContent={letter !== null}
          busy={busy === "cover_letter"}
          onGenerate={() => generate("cover_letter")}
        >
          {letter !== null && fallback.letter && <Alert tone="warn">{a.fallbackNotice}</Alert>}
          {letter !== null && (
            <div className="card p-4 sm:p-6">
              <div className="mb-3 flex justify-end">
                <button
                  className="btn-secondary btn-sm"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(letter);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1500);
                    } catch {
                      // Clipboard blocked (permissions / insecure context): the text stays selectable in the box.
                      setError(t.errors.generic);
                    }
                  }}
                >
                  <Copy className="h-3.5 w-3.5" /> {copied ? a.copied : a.copy}
                </button>
              </div>
              <textarea className="input min-h-[420px] leading-relaxed sm:text-sm" aria-label={a.tabs.letter} value={letter} onChange={(e) => setLetter(e.target.value)} />
            </div>
          )}
        </ExtraPanel>
      )}

      {tab === "interview" && (
        <ExtraPanel
          locked={!analysis.features.interview_prep}
          text={a.interviewText}
          hasContent={interview !== null}
          busy={busy === "interview_prep"}
          onGenerate={() => generate("interview_prep")}
        >
          {interview && fallback.interview && <Alert tone="warn">{a.fallbackNotice}</Alert>}
          {interview && (
            <ol className="space-y-3">
              {interview.map((item, i) => (
                <li key={i} className="card flex gap-3 p-4 sm:p-5">
                  <span className="readout grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="eyebrow text-brand-700">{item.requirement}</p>
                    <p className="mt-1 font-medium text-ink">{item.question}</p>
                    {item.evidence.length > 0 && (
                      <div className="mt-3">
                        <p className="eyebrow mb-1.5">{a.yourEvidence}</p>
                        <div className="space-y-1.5">
                          {item.evidence.map((e, j) => (
                            <blockquote key={j} className="well py-2 text-sm text-ink-soft">{e}</blockquote>
                          ))}
                        </div>
                      </div>
                    )}
                    <p className="mt-3 text-sm text-ink-soft"><strong className="font-semibold text-ink">{a.tip}:</strong> {item.tip}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </ExtraPanel>
      )}
      </div>
    </div>
  );
}

function ExtraPanel({ locked, text, hasContent, busy, onGenerate, children }: { locked: boolean; text: string; hasContent: boolean; busy: boolean; onGenerate: () => void; children: React.ReactNode }) {
  const { t } = useI18n();
  const a = t.analysis;
  if (locked) {
    return (
      <div className="card flex flex-col items-center px-6 py-12 text-center">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-slate-100 text-ink-muted">
          <Lock aria-hidden className="h-5 w-5" />
        </span>
        <p className="mt-3 font-semibold text-ink">{a.locked}</p>
        <p className="mt-1 max-w-md text-sm text-ink-muted">{text}</p>
        <Link href="/billing" className="btn-primary mt-4">{t.nav.billing}</Link>
      </div>
    );
  }
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-ink-muted">{text}</p>
        <button className={hasContent ? "btn-secondary" : "btn-primary"} disabled={busy} onClick={onGenerate}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {busy ? a.generating : hasContent ? a.regenerate : a.generate}
        </button>
      </div>
      {children}
    </section>
  );
}

function OverviewRow({ req, status, language }: { req: Requirement; status: MatchStatus; language: string }) {
  const { t } = useI18n();
  const { Icon, text } = STATUS_STYLE[status];
  return (
    <li className="flex items-center gap-2.5 px-5 py-2.5 text-sm">
      <Icon aria-hidden className={`h-4 w-4 shrink-0 ${text}`} />
      <span className="sr-only">{t.analysis.status[status]}:</span>
      <span className="min-w-0 flex-1 break-words text-ink">{localizeSkillLabel(req.label, language)}</span>
      <span className="shrink-0 text-xs text-ink-muted">{req.importance === "must" ? t.analysis.must : t.analysis.nice}</span>
    </li>
  );
}

function SuggestionCard({ s, onPatch }: { s: SuggestionRow; onPatch: (body: Record<string, unknown>) => void }) {
  const { t } = useI18n();
  const a = t.analysis;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(s.edited_text ?? s.suggested_text);
  const advisory = s.kind === "gap_answer";
  const isConfirm = s.kind === "confirm";
  const finalText = s.edited_text ?? s.suggested_text;
  const skill = s.target_ref?.skill ?? "";

  return (
    <li className={`card p-4 sm:p-5 ${s.status === "accepted" ? "border-found-line" : s.status === "rejected" ? "opacity-60" : ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="badge bg-brand-50 text-brand-700">{a.kinds[s.kind] ?? s.kind}</span>
        {s.status === "accepted" && <span className="badge text-found-ink"><CheckCircle2 aria-hidden className="h-3.5 w-3.5" /> {a.accepted}</span>}
        {s.status === "rejected" && <span className="text-xs font-medium text-ink-muted">{a.rejected}</span>}
      </div>

      {s.rationale && <p className="mt-2 text-sm text-ink-soft">{s.rationale}</p>}
      {s.flags.includes("check_names") && <p className="mt-1 text-xs font-medium text-partial-ink">{a.checkNames}</p>}
      {s.flags.includes("years_computed_from_dates") && <p className="mt-1 text-xs text-ink-muted">{a.yearsComputed}</p>}

      {advisory ? (
        <p className="well mt-3 text-sm text-ink">{s.suggested_text}</p>
      ) : isConfirm ? (
        <div className="mt-3 space-y-2">
          <label className="flex items-start gap-2.5 text-sm text-ink">
            <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0" checked={s.confirmed_by_user} onChange={(e) => onPatch({ confirmedByUser: e.target.checked, ...(e.target.checked ? {} : { status: "pending" }) })} />
            <span>{a.confirmLabel(skill)}</span>
          </label>
          {s.confirmed_by_user && (
            <textarea
              className="input sm:text-sm"
              rows={2}
              placeholder={a.confirmPlaceholder}
              aria-label={a.confirmPlaceholder}
              defaultValue={s.edited_text ?? ""}
              onBlur={(e) => onPatch({ editedText: e.target.value.trim() || null })}
              maxLength={600}
            />
          )}
        </div>
      ) : (
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="min-w-0">
            <p className="eyebrow">{a.original}</p>
            <p className="well mt-1.5 whitespace-pre-wrap break-words text-sm text-ink-soft">{s.original_text || "—"}</p>
          </div>
          <div className="min-w-0">
            <p className="eyebrow text-found-ink">{a.suggested}</p>
            {editing ? (
              <div className="mt-1.5 space-y-2">
                <textarea className="input sm:text-sm" aria-label={a.suggested} rows={Math.min(10, Math.max(3, draft.split("\n").length + 1))} value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={4000} />
                <div className="flex gap-2">
                  <button className="btn-primary btn-sm" onClick={() => { onPatch({ editedText: draft === s.suggested_text ? null : draft }); setEditing(false); }}>{t.common.save}</button>
                  <button className="btn-ghost btn-sm" onClick={() => { setDraft(finalText); setEditing(false); }}>{t.common.cancel}</button>
                </div>
              </div>
            ) : (
              <p className="mt-1.5 whitespace-pre-wrap break-words rounded-lg bg-found-soft p-3 text-sm text-ink">{finalText}</p>
            )}
          </div>
        </div>
      )}

      {!advisory && (
        <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
          {s.status === "pending" ? (
            <>
              <button className="btn-primary btn-sm" disabled={isConfirm && !s.confirmed_by_user} onClick={() => onPatch({ status: "accepted" })}>{a.accept}</button>
              <button className="btn-secondary btn-sm" onClick={() => onPatch({ status: "rejected" })}>{a.reject}</button>
              {!isConfirm && !editing && <button className="btn-ghost btn-sm" onClick={() => setEditing(true)}>{a.editSuggestion}</button>}
            </>
          ) : (
            <button className="btn-ghost btn-sm" onClick={() => onPatch({ status: "pending" })}>{a.undo}</button>
          )}
        </div>
      )}
    </li>
  );
}

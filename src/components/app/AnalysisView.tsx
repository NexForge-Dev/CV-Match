"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, CircleDashed, Copy, ExternalLink, HelpCircle, Loader2, Lock, MinusCircle } from "lucide-react";
import type { MatchResult, MatchStatus, ScoreBreakdown } from "@/lib/analysis/match";
import type { Requirement } from "@/lib/analysis/requirements";
import type { PlanFeatures } from "@/lib/billing/plans";
import { api, errorMessage } from "@/lib/client/api";
import { formatDate } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/client";
import { Alert, ScoreRing } from "@/components/ui";
import { DeleteButton } from "@/components/DeleteButton";

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

const STATUS_STYLE: Record<MatchStatus, { cls: string; Icon: typeof CheckCircle2 }> = {
  found: { cls: "bg-emerald-50 text-emerald-800 border-emerald-200", Icon: CheckCircle2 },
  partial: { cls: "bg-amber-50 text-amber-800 border-amber-200", Icon: CircleDashed },
  not_found: { cls: "bg-red-50 text-red-800 border-red-200", Icon: MinusCircle },
  ambiguous: { cls: "bg-slate-100 text-slate-700 border-slate-200", Icon: HelpCircle },
};

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
  const rows = analysis.requirements
    .map((req) => ({ req, res: resultById.get(req.id) }))
    .filter((r): r is { req: Requirement; res: MatchResult } => Boolean(r.res))
    .filter((r) => filter === "all" || r.res.status === filter);
  const b = analysis.breakdown;
  const acceptedCount = suggestions.filter((s) => s.status === "accepted" && s.kind !== "gap_answer").length;

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
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm text-ink-muted">{a.title} · {formatDate(analysis.createdAt, locale)}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">{analysis.job.title || analysis.job.company || "—"}</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {[analysis.job.company, analysis.job.location].filter(Boolean).join(" · ")}
            {analysis.job.url && (
              <a href={analysis.job.url} target="_blank" rel="noopener noreferrer nofollow" className="link ml-2 inline-flex items-center gap-1">
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            {a.cv}: <Link className="link" href={`/resumes/${analysis.resumeId}`}>{analysis.resumeTitle} · v{analysis.versionNumber}</Link> · {a.provider[analysis.provider] ?? analysis.provider}
          </p>
        </div>
        <DeleteButton url={`/api/analyses/${analysis.id}`} label={a.deleteAnalysis} redirectTo="/analyses" />
      </div>

      {analysis.provider === "heuristic_fallback" && <div className="mb-4"><Alert tone="warn">{a.fallbackNotice}</Alert></div>}
      <section className="card mb-6 grid gap-6 p-4 sm:p-6 md:grid-cols-[auto_1fr]">
        <div className="flex flex-col items-center">
          <ScoreRing score={analysis.score} size={120} />
          <p className="mt-2 text-sm font-semibold">{a.scoreLabel}</p>
        </div>
        <div className="space-y-3 text-sm">
          <p className="text-ink-soft">{a.counts(b.counts.found, b.counts.partial, b.counts.not_found, b.counts.ambiguous)}</p>
          {b.mustTotal > 0 && <p className="font-medium">{a.mustSummary(b.mustFound, b.mustTotal)}</p>}
          <Alert tone="info">{a.scoreDisclaimer}</Alert>
          <details className="text-ink-soft">
            <summary className="cursor-pointer font-medium text-brand-700">{a.howCalculated}</summary>
            <p className="mt-2">{a.formula}</p>
          </details>
        </div>
      </section>

      <div className="mb-4 flex gap-1 overflow-x-auto border-b border-slate-200" role="tablist">
        {tabs.map((x) => (
          <button
            key={x.id}
            role="tab"
            aria-selected={tab === x.id}
            onClick={() => setTab(x.id)}
            className={`whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium ${tab === x.id ? "border-brand-600 text-brand-700" : "border-transparent text-ink-muted hover:text-ink"}`}
          >
            {x.label}
          </button>
        ))}
      </div>

      {error && <div className="mb-4"><Alert tone="error">{error}</Alert></div>}
      {notice && (
        <div className="mb-4">
          <Alert tone="success">
            {notice.text} <Link className="link" href={`/resumes/${notice.resumeId}`}>{a.openEditor}</Link>
          </Alert>
        </div>
      )}

      {tab === "requirements" && (
        <section>
          <div className="mb-3 flex flex-wrap gap-2">
            {(["all", "found", "partial", "not_found", "ambiguous"] as const).map((s) => (
              <button key={s} className={filter === s ? "btn-primary btn-sm" : "btn-secondary btn-sm"} onClick={() => setFilter(s)}>
                {s === "all" ? a.requirements : a.status[s]}
              </button>
            ))}
          </div>
          <p className="mb-4 text-xs text-ink-muted">{a.absenceNote}</p>
          <ul className="space-y-3">
            {rows.map(({ req, res }) => {
              const style = STATUS_STYLE[res.status];
              return (
                <li key={req.id} className="card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium">{req.label}</p>
                      {req.sourceText !== req.label && <p className="mt-0.5 text-xs text-ink-muted">“{req.sourceText}”</p>}
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-1">
                      <span className={`badge border ${req.importance === "must" ? "border-ink/20 bg-white text-ink" : "border-slate-200 bg-white text-ink-muted"}`}>{req.importance === "must" ? a.must : a.nice}</span>
                      <span className={`badge border ${style.cls}`}>
                        <style.Icon className="h-3.5 w-3.5" /> {a.status[res.status]}
                      </span>
                    </div>
                  </div>
                  {res.notes.length > 0 && (
                    <ul className="mt-2 space-y-0.5 text-xs text-ink-soft">
                      {res.notes.map((n) => (
                        <li key={n} className="flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {a.notes[n] ?? n}</li>
                      ))}
                    </ul>
                  )}
                  {res.relatedSkills.length > 0 && <p className="mt-1 text-xs text-ink-soft">{a.related}: {res.relatedSkills.join(", ")}</p>}
                  {res.evidence.length > 0 && (
                    <div className="mt-3 space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                        {res.notes.includes("negated_context") || res.notes.includes("learning_context") ? a.mentionInCv : a.evidence}
                      </p>
                      {res.evidence.map((ev, i) => (
                        <blockquote key={i} className="border-l-2 border-brand-200 pl-3 text-sm text-ink-soft">
                          <span className="mr-1 text-xs text-ink-muted">[{a.sections[ev.section] ?? ev.section}]</span>
                          {ev.quote}
                        </blockquote>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {tab === "suggestions" && (
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-semibold">{a.suggestionsTitle}</h2>
            <p className="text-sm text-ink-muted">{a.suggestionsText}</p>
          </div>
          <div className="mb-4 space-y-2">
            {analysis.tier === "free" && (
              <Alert tone="info">
                {a.freeLimit} <Link href="/billing" className="link">{t.nav.billing}</Link>
              </Alert>
            )}
            {analysis.dropped > 0 && <Alert tone="warn">{a.droppedNotice(analysis.dropped)}</Alert>}
          </div>
          {suggestions.length === 0 ? (
            <p className="text-sm text-ink-muted">{a.noSuggestions}</p>
          ) : (
            <ul className="space-y-3">
              {suggestions.map((s) => (
                <SuggestionCard key={s.id} s={s} onPatch={(body) => patch(s.id, body)} />
              ))}
            </ul>
          )}
          <div className="safe-bottom sticky bottom-0 mt-6 flex flex-wrap items-center gap-3 border-t border-slate-200 bg-slate-50/95 pt-4 backdrop-blur">
            <button className="btn-primary" disabled={acceptedCount === 0 || busy !== null} onClick={applyAccepted}>
              {busy === "apply" && <Loader2 className="h-4 w-4 animate-spin" />}
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
              <textarea className="input min-h-[420px] font-serif leading-relaxed sm:text-sm" value={letter} onChange={(e) => setLetter(e.target.value)} />
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
                <li key={i} className="card p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">{item.requirement}</p>
                  <p className="mt-1 font-medium">{item.question}</p>
                  {item.evidence.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-ink-muted">{a.yourEvidence}</p>
                      {item.evidence.map((e, j) => (
                        <blockquote key={j} className="border-l-2 border-brand-200 pl-3 text-sm text-ink-soft">{e}</blockquote>
                      ))}
                    </div>
                  )}
                  <p className="mt-2 text-sm text-ink-soft"><strong>{a.tip}:</strong> {item.tip}</p>
                </li>
              ))}
            </ol>
          )}
        </ExtraPanel>
      )}
    </div>
  );
}

function ExtraPanel({ locked, text, hasContent, busy, onGenerate, children }: { locked: boolean; text: string; hasContent: boolean; busy: boolean; onGenerate: () => void; children: React.ReactNode }) {
  const { t } = useI18n();
  const a = t.analysis;
  if (locked) {
    return (
      <div className="card flex flex-col items-center p-10 text-center">
        <Lock className="h-8 w-8 text-ink-muted" />
        <p className="mt-3 font-medium">{a.locked}</p>
        <p className="mt-1 max-w-md text-sm text-ink-muted">{text}</p>
        <Link href="/billing" className="btn-primary mt-4">{t.nav.billing}</Link>
      </div>
    );
  }
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-muted">{text}</p>
        <button className={hasContent ? "btn-secondary" : "btn-primary"} disabled={busy} onClick={onGenerate}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {busy ? a.generating : hasContent ? a.regenerate : a.generate}
        </button>
      </div>
      {children}
    </section>
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
    <li className={`card p-4 ${s.status === "accepted" ? "ring-2 ring-emerald-300" : s.status === "rejected" ? "opacity-60" : ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="badge bg-brand-50 text-brand-700">{a.kinds[s.kind] ?? s.kind}</span>
        {s.status !== "pending" && <span className="text-xs font-medium text-ink-muted">{s.status === "accepted" ? a.accepted : a.rejected}</span>}
      </div>

      {s.rationale && <p className="mt-2 text-sm text-ink-soft">{s.rationale}</p>}
      {s.flags.includes("check_names") && <p className="mt-1 text-xs text-amber-700">{a.checkNames}</p>}
      {s.flags.includes("years_computed_from_dates") && <p className="mt-1 text-xs text-ink-muted">{a.yearsComputed}</p>}

      {advisory ? (
        <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm">{s.suggested_text}</p>
      ) : isConfirm ? (
        <div className="mt-3 space-y-2">
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-0.5" checked={s.confirmed_by_user} onChange={(e) => onPatch({ confirmedByUser: e.target.checked, ...(e.target.checked ? {} : { status: "pending" }) })} />
            <span>{a.confirmLabel(skill)}</span>
          </label>
          {s.confirmed_by_user && (
            <textarea
              className="input sm:text-sm"
              rows={2}
              placeholder={a.confirmPlaceholder}
              defaultValue={s.edited_text ?? ""}
              onBlur={(e) => onPatch({ editedText: e.target.value.trim() || null })}
              maxLength={600}
            />
          )}
        </div>
      ) : (
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{a.original}</p>
            <p className="mt-1 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-ink-soft">{s.original_text || "—"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{a.suggested}</p>
            {editing ? (
              <div className="mt-1 space-y-2">
                <textarea className="input sm:text-sm" rows={Math.min(10, Math.max(3, draft.split("\n").length + 1))} value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={4000} />
                <div className="flex gap-2">
                  <button className="btn-primary btn-sm" onClick={() => { onPatch({ editedText: draft === s.suggested_text ? null : draft }); setEditing(false); }}>{t.common.save}</button>
                  <button className="btn-ghost btn-sm" onClick={() => { setDraft(finalText); setEditing(false); }}>{t.common.cancel}</button>
                </div>
              </div>
            ) : (
              <p className="mt-1 whitespace-pre-wrap rounded-lg bg-emerald-50 p-3 text-sm text-emerald-950">{finalText}</p>
            )}
          </div>
        </div>
      )}

      {!advisory && (
        <div className="mt-3 flex flex-wrap gap-2">
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

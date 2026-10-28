"use client";

import { useMemo } from "react";
import { cvToPlainText, type CvData } from "@/lib/cv/schema";
import { diffLines } from "@/lib/cv/diff";
import { useI18n } from "@/lib/i18n/client";

export function VersionDiff({ before, after }: { before: CvData; after: CvData }) {
  const { t } = useI18n();
  const diff = useMemo(() => diffLines(cvToPlainText(before).split("\n"), cvToPlainText(after).split("\n")), [before, after]);
  if (diff.every((d) => d.type === "same")) return <p className="text-sm text-ink-muted">{t.resumes.noDiff}</p>;
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white font-mono text-xs">
      {diff.map((d, i) => (
        <div
          key={i}
          className={`whitespace-pre-wrap px-3 py-0.5 ${d.type === "added" ? "bg-emerald-50 text-emerald-900" : d.type === "removed" ? "bg-red-50 text-red-800 line-through decoration-red-300" : "text-ink-soft"}`}
        >
          <span className="mr-2 select-none" aria-label={d.type === "added" ? t.resumes.added : d.type === "removed" ? t.resumes.removed : undefined}>
            {d.type === "added" ? "+" : d.type === "removed" ? "−" : " "}
          </span>
          {d.text}
        </div>
      ))}
    </div>
  );
}

import type { CvData, CvLanguage } from "@/lib/cv/schema";
import { SECTION_LABELS, dateRange, type CvTemplate } from "@/lib/export/labels";

/** On-screen rendering that mirrors the PDF/DOCX layout. Content is rendered as text (React escapes it). */
export function CvPreview({ cv, language, template }: { cv: CvData; language: CvLanguage; template: CvTemplate }) {
  const labels = SECTION_LABELS[language];
  const modern = template === "modern";
  const heading = (label: string) => (
    <h3 className={`mb-2 mt-5 border-b pb-1 text-sm font-bold ${modern ? "border-brand-600 text-brand-700" : "border-ink uppercase tracking-wide text-ink"}`}>{label}</h3>
  );
  const c = cv.contact;
  return (
    <article className={`mx-auto max-w-[760px] break-words bg-white p-5 text-[13px] sm:p-8 leading-relaxed text-ink shadow-card ${modern ? "font-sans" : "font-serif"}`}>
      <header className={modern ? "" : "text-center"}>
        <h2 className={`text-2xl font-bold ${modern ? "text-brand-700" : ""}`}>{c.fullName || "—"}</h2>
        {c.headline && <p className="text-ink-soft">{c.headline}</p>}
        <p className="mt-1 text-xs text-ink-muted">{[c.email, c.phone, c.location, ...c.links].filter(Boolean).join("  |  ")}</p>
      </header>
      {cv.summary && (
        <>
          {heading(labels.summary)}
          <p>{cv.summary}</p>
        </>
      )}
      {cv.experiences.length > 0 && (
        <>
          {heading(labels.experience)}
          {cv.experiences.map((e) => (
            <div key={e.id} className="mb-3">
              <div className="flex flex-wrap justify-between gap-2">
                <strong>{[e.title, e.company].filter(Boolean).join(" — ")}</strong>
                <span className="text-xs text-ink-muted">{dateRange(e.start, e.end)}</span>
              </div>
              {e.location && <p className="text-xs text-ink-muted">{e.location}</p>}
              <ul className="ml-4 list-disc">
                {e.bullets.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </div>
          ))}
        </>
      )}
      {cv.skills.length > 0 && (
        <>
          {heading(labels.skills)}
          <p>{cv.skills.join(" · ")}</p>
        </>
      )}
      {cv.projects.length > 0 && (
        <>
          {heading(labels.projects)}
          {cv.projects.map((p) => (
            <div key={p.id} className="mb-2">
              <div className="flex flex-wrap justify-between gap-2">
                <strong>{p.name}</strong>
                <span className="text-xs text-ink-muted">{p.link}</span>
              </div>
              <p>{p.description}</p>
              {p.technologies.length > 0 && <p className="text-xs text-ink-muted">{p.technologies.join(", ")}</p>}
            </div>
          ))}
        </>
      )}
      {cv.education.length > 0 && (
        <>
          {heading(labels.education)}
          {cv.education.map((ed) => (
            <div key={ed.id} className="mb-2">
              <div className="flex flex-wrap justify-between gap-2">
                <strong>{[ed.degree, ed.institution].filter(Boolean).join(" — ")}</strong>
                <span className="text-xs text-ink-muted">{dateRange(ed.start, ed.end)}</span>
              </div>
              {ed.details && <p className="text-xs text-ink-muted">{ed.details}</p>}
            </div>
          ))}
        </>
      )}
      {cv.languages.length > 0 && (
        <>
          {heading(labels.languages)}
          <p>{cv.languages.map((l) => (l.level ? `${l.name} (${l.level})` : l.name)).join(" · ")}</p>
        </>
      )}
      {cv.certifications.length > 0 && (
        <>
          {heading(labels.certifications)}
          <ul className="ml-4 list-disc">
            {cv.certifications.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </>
      )}
    </article>
  );
}

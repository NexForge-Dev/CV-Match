"use client";

import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { newId, type CvData } from "@/lib/cv/schema";
import { useI18n } from "@/lib/i18n/client";

const lines = (s: string) => s.split("\n").map((l) => l.trim()).filter(Boolean);
const csv = (s: string) => s.split(",").map((l) => l.trim()).filter(Boolean);

function move<T>(arr: T[], from: number, to: number): T[] {
  if (to < 0 || to >= arr.length) return arr;
  const copy = [...arr];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

function Field({ label, value, onChange, textarea = false, rows = 3, id }: { label: string; value: string; onChange: (v: string) => void; textarea?: boolean; rows?: number; id: string }) {
  return (
    <div>
      <label className="label" htmlFor={id}>{label}</label>
      {textarea ? (
        <textarea id={id} className="input" rows={rows} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input id={id} className="input" value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}

/**
 * Lists stored as text keep the raw string while editing so users can type
 * separators freely; the parsed value is written back on every change.
 */
function ListField({ label, value, onChange, sep, rows = 3, id }: { label: string; value: string[]; onChange: (v: string[]) => void; sep: "line" | "comma"; rows?: number; id: string }) {
  const joined = value.join(sep === "line" ? "\n" : ", ");
  return (
    <div>
      <label className="label" htmlFor={id}>{label}</label>
      <textarea
        id={id}
        className="input"
        rows={rows}
        defaultValue={joined}
        onBlur={(e) => onChange(sep === "line" ? lines(e.target.value) : csv(e.target.value))}
      />
    </div>
  );
}

function ItemControls({ index, total, onMove, onRemove }: { index: number; total: number; onMove: (to: number) => void; onRemove: () => void }) {
  const { t } = useI18n();
  return (
    <div className="flex gap-1">
      <button type="button" className="btn-ghost btn-sm" disabled={index === 0} onClick={() => onMove(index - 1)} aria-label={t.cvForm.moveUp}>
        <ArrowUp className="h-3.5 w-3.5" />
      </button>
      <button type="button" className="btn-ghost btn-sm" disabled={index === total - 1} onClick={() => onMove(index + 1)} aria-label={t.cvForm.moveDown}>
        <ArrowDown className="h-3.5 w-3.5" />
      </button>
      <button type="button" className="btn-ghost btn-sm text-red-700" onClick={onRemove} aria-label={t.common.remove}>
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/** Structured CV editor. Controlled: every change is passed to `onChange`. `formKey` remounts list fields when data is replaced externally. */
export function CvForm({ value, onChange, formKey = "cv" }: { value: CvData; onChange: (cv: CvData) => void; formKey?: string }) {
  const { t } = useI18n();
  const f = t.cvForm;
  const set = <K extends keyof CvData>(key: K, v: CvData[K]) => onChange({ ...value, [key]: v });
  const setContact = (key: keyof CvData["contact"], v: string | string[]) => onChange({ ...value, contact: { ...value.contact, [key]: v } });

  return (
    <div className="space-y-8" key={formKey}>
      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-muted">{f.contact}</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field id="c-name" label={f.fullName} value={value.contact.fullName} onChange={(v) => setContact("fullName", v)} />
          <Field id="c-headline" label={f.headline} value={value.contact.headline} onChange={(v) => setContact("headline", v)} />
          <Field id="c-email" label={f.email} value={value.contact.email} onChange={(v) => setContact("email", v)} />
          <Field id="c-phone" label={f.phone} value={value.contact.phone} onChange={(v) => setContact("phone", v)} />
          <Field id="c-location" label={f.location} value={value.contact.location} onChange={(v) => setContact("location", v)} />
          <ListField id="c-links" label={f.links} value={value.contact.links} onChange={(v) => setContact("links", v)} sep="line" rows={2} />
        </div>
      </section>

      <section>
        <Field id="summary" label={f.summary} value={value.summary} onChange={(v) => set("summary", v)} textarea rows={4} />
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-muted">{f.experience}</h3>
        <div className="space-y-4">
          {value.experiences.map((e, i) => {
            const update = (patch: Partial<typeof e>) => set("experiences", value.experiences.map((x, j) => (j === i ? { ...x, ...patch } : x)));
            return (
              <div key={e.id} className="rounded-lg border border-slate-200 p-4">
                <div className="mb-2 flex justify-end">
                  <ItemControls index={i} total={value.experiences.length} onMove={(to) => set("experiences", move(value.experiences, i, to))} onRemove={() => set("experiences", value.experiences.filter((_, j) => j !== i))} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field id={`${e.id}-t`} label={f.jobTitle} value={e.title} onChange={(v) => update({ title: v })} />
                  <Field id={`${e.id}-c`} label={f.company} value={e.company} onChange={(v) => update({ company: v })} />
                  <Field id={`${e.id}-s`} label={f.start} value={e.start} onChange={(v) => update({ start: v })} />
                  <Field id={`${e.id}-e`} label={f.end} value={e.end} onChange={(v) => update({ end: v })} />
                  <Field id={`${e.id}-l`} label={f.location} value={e.location} onChange={(v) => update({ location: v })} />
                </div>
                <div className="mt-3">
                  <ListField id={`${e.id}-b`} label={f.bullets} value={e.bullets} onChange={(v) => update({ bullets: v })} sep="line" rows={Math.max(3, e.bullets.length + 1)} />
                </div>
              </div>
            );
          })}
          <button type="button" className="btn-secondary btn-sm" onClick={() => set("experiences", [...value.experiences, { id: newId("exp"), title: "", company: "", location: "", start: "", end: "", bullets: [] }])}>
            <Plus className="h-3.5 w-3.5" /> {f.addExperience}
          </button>
        </div>
      </section>

      <section>
        <ListField id="skills" label={f.skills} value={value.skills} onChange={(v) => set("skills", v)} sep="comma" rows={3} />
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-muted">{f.projects}</h3>
        <div className="space-y-4">
          {value.projects.map((p, i) => {
            const update = (patch: Partial<typeof p>) => set("projects", value.projects.map((x, j) => (j === i ? { ...x, ...patch } : x)));
            return (
              <div key={p.id} className="rounded-lg border border-slate-200 p-4">
                <div className="mb-2 flex justify-end">
                  <ItemControls index={i} total={value.projects.length} onMove={(to) => set("projects", move(value.projects, i, to))} onRemove={() => set("projects", value.projects.filter((_, j) => j !== i))} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field id={`${p.id}-n`} label={f.projectName} value={p.name} onChange={(v) => update({ name: v })} />
                  <Field id={`${p.id}-l`} label={f.link} value={p.link} onChange={(v) => update({ link: v })} />
                </div>
                <div className="mt-3 grid gap-3">
                  <Field id={`${p.id}-d`} label={f.description} value={p.description} onChange={(v) => update({ description: v })} textarea />
                  <ListField id={`${p.id}-t`} label={f.technologies} value={p.technologies} onChange={(v) => update({ technologies: v })} sep="comma" rows={1} />
                </div>
              </div>
            );
          })}
          <button type="button" className="btn-secondary btn-sm" onClick={() => set("projects", [...value.projects, { id: newId("prj"), name: "", description: "", technologies: [], link: "" }])}>
            <Plus className="h-3.5 w-3.5" /> {f.addProject}
          </button>
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-muted">{f.education}</h3>
        <div className="space-y-4">
          {value.education.map((ed, i) => {
            const update = (patch: Partial<typeof ed>) => set("education", value.education.map((x, j) => (j === i ? { ...x, ...patch } : x)));
            return (
              <div key={ed.id} className="rounded-lg border border-slate-200 p-4">
                <div className="mb-2 flex justify-end">
                  <ItemControls index={i} total={value.education.length} onMove={(to) => set("education", move(value.education, i, to))} onRemove={() => set("education", value.education.filter((_, j) => j !== i))} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field id={`${ed.id}-d`} label={f.degree} value={ed.degree} onChange={(v) => update({ degree: v })} />
                  <Field id={`${ed.id}-i`} label={f.institution} value={ed.institution} onChange={(v) => update({ institution: v })} />
                  <Field id={`${ed.id}-s`} label={f.start} value={ed.start} onChange={(v) => update({ start: v })} />
                  <Field id={`${ed.id}-e`} label={f.end} value={ed.end} onChange={(v) => update({ end: v })} />
                </div>
                <div className="mt-3">
                  <Field id={`${ed.id}-x`} label={f.details} value={ed.details} onChange={(v) => update({ details: v })} textarea rows={2} />
                </div>
              </div>
            );
          })}
          <button type="button" className="btn-secondary btn-sm" onClick={() => set("education", [...value.education, { id: newId("edu"), degree: "", institution: "", start: "", end: "", details: "" }])}>
            <Plus className="h-3.5 w-3.5" /> {f.addEducation}
          </button>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <ListField
          id="languages"
          label={f.languages}
          value={value.languages.map((l) => (l.level ? `${l.name} - ${l.level}` : l.name))}
          onChange={(v) =>
            set(
              "languages",
              v.map((line) => {
                const [name, ...rest] = line.split(/\s[-–:]\s|[-–:]/);
                return { name: name.trim(), level: rest.join(" ").trim() };
              }),
            )
          }
          sep="line"
        />
        <ListField id="certs" label={f.certifications} value={value.certifications} onChange={(v) => set("certifications", v)} sep="line" />
      </section>
    </div>
  );
}

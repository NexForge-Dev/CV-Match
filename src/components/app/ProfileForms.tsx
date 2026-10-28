"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Alert } from "@/components/ui";
import { api, errorMessage } from "@/lib/client/api";
import { LOCALES, LOCALE_NAMES } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/client";

export type ProfileData = {
  full_name: string;
  headline: string;
  location: string;
  target_locations: string[];
  ui_locale: "pt" | "es" | "en";
  cv_language: "pt" | "es" | "en";
  cv_template: "classic" | "modern";
};

export function ProfileForm({ initial }: { initial: ProfileData }) {
  const { t } = useI18n();
  const p = t.profile;
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [targets, setTargets] = useState(initial.target_locations.join(", "));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await api("/api/profile", {
      method: "PATCH",
      json: { ...form, target_locations: targets.split(",").map((s) => s.trim()).filter(Boolean) },
    });
    setBusy(false);
    setMsg(res.ok ? { tone: "success", text: t.common.saved } : { tone: "error", text: errorMessage(t, res.error, res.detail) });
    if (res.ok) router.refresh();
  }

  return (
    <form onSubmit={save} className="card space-y-4 p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="p-name">{p.fullName}</label>
          <input id="p-name" className="input" value={form.full_name} maxLength={200} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="p-headline">{p.headline}</label>
          <input id="p-headline" className="input" value={form.headline} maxLength={200} onChange={(e) => setForm({ ...form, headline: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="p-location">{p.location}</label>
          <input id="p-location" className="input" value={form.location} maxLength={200} onChange={(e) => setForm({ ...form, location: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="p-targets">{p.targetLocations}</label>
          <input id="p-targets" className="input" value={targets} onChange={(e) => setTargets(e.target.value)} placeholder="Madrid, Barcelona, Remote" />
        </div>
        <div>
          <label className="label" htmlFor="p-ui">{p.uiLanguage}</label>
          <select id="p-ui" className="input" value={form.ui_locale} onChange={(e) => setForm({ ...form, ui_locale: e.target.value as ProfileData["ui_locale"] })}>
            {LOCALES.map((l) => <option key={l} value={l}>{LOCALE_NAMES[l]}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="p-cvlang">{p.cvLanguage}</label>
          <select id="p-cvlang" className="input" value={form.cv_language} onChange={(e) => setForm({ ...form, cv_language: e.target.value as ProfileData["cv_language"] })}>
            {LOCALES.map((l) => <option key={l} value={l}>{t.cvLanguage[l]}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="p-tpl">{p.cvTemplate}</label>
          <select id="p-tpl" className="input" value={form.cv_template} onChange={(e) => setForm({ ...form, cv_template: e.target.value as ProfileData["cv_template"] })}>
            <option value="modern">{t.templates.modern}</option>
            <option value="classic">{t.templates.classic}</option>
          </select>
        </div>
      </div>
      {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
      <button className="btn-primary" disabled={busy}>{busy ? t.common.saving : t.common.save}</button>
    </form>
  );
}

export function SkillBank({ initial }: { initial: { id: string; name: string; level: string }[] }) {
  const { t } = useI18n();
  const p = t.profile;
  const [skills, setSkills] = useState(initial);
  const [name, setName] = useState("");
  const [level, setLevel] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await api<{ id: string; name: string; level: string }>("/api/skills", { method: "POST", json: { name, level } });
    if (!res.ok) return setError(errorMessage(t, res.error, res.detail));
    setSkills((s) => [...s, res.data].sort((a, b) => a.name.localeCompare(b.name)));
    setName("");
    setLevel("");
  }

  async function remove(id: string) {
    const res = await api(`/api/skills/${id}`, { method: "DELETE" });
    if (res.ok) setSkills((s) => s.filter((x) => x.id !== id));
    else setError(errorMessage(t, res.error, res.detail));
  }

  return (
    <section className="card p-6">
      <h2 className="font-semibold">{p.skillBank}</h2>
      <p className="mt-1 text-sm text-ink-muted">{p.skillBankText}</p>
      <ul className="mt-4 flex flex-wrap gap-2">
        {skills.map((s) => (
          <li key={s.id} className="badge bg-slate-100 py-1 text-ink-soft">
            {s.name}{s.level ? ` · ${s.level}` : ""}
            <button onClick={() => remove(s.id)} aria-label={`${t.common.remove} ${s.name}`} className="ml-1 text-ink-muted hover:text-red-700">
              <X className="h-3 w-3" />
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={add} className="mt-4 flex flex-wrap items-end gap-2">
        <div className="min-w-[160px] flex-1">
          <label className="label" htmlFor="sk-name">{p.skillName}</label>
          <input id="sk-name" className="input" value={name} maxLength={80} required onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="w-40">
          <label className="label" htmlFor="sk-level">{p.skillLevel}</label>
          <input id="sk-level" className="input" value={level} maxLength={40} onChange={(e) => setLevel(e.target.value)} />
        </div>
        <button className="btn-secondary"><Plus className="h-4 w-4" /> {p.addSkill}</button>
      </form>
      {error && <div className="mt-3"><Alert tone="error">{error}</Alert></div>}
    </section>
  );
}

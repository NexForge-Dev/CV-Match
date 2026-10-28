#!/usr/bin/env node
/**
 * Visual check: screenshots of every page at phone and desktop widths, logged in
 * as a throwaway user with real data (CV, job, analysis). Uses a local headless
 * Chrome/Edge through the DevTools protocol — no extra dependencies.
 *
 *   npm run build && npm start            # app on BASE_URL (default http://localhost:3000)
 *   npm run screenshots                   # PNGs in ./screenshots (git-ignored)
 *
 * Env: BASE_URL, OUT_DIR, CHROME_PATH, ONLY (comma-separated page names).
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

for (const file of [".env.local", ".env"]) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
  }
}
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = process.env.OUT_DIR ?? "screenshots";
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ONLY = process.env.ONLY?.split(",");
const CHROME =
  process.env.CHROME_PATH ??
  [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
  ].find((p) => existsSync(p));
if (!SB_URL || !ANON || !SERVICE) throw new Error("Missing Supabase env vars (.env.local)");
if (!CHROME) throw new Error("No Chrome/Edge found; set CHROME_PATH");
mkdirSync(OUT, { recursive: true });

const CV = `Ana Souza
Full Stack Developer
ana.souza@example.com | +34 600 123 456 | linkedin.com/in/anasouza
Madrid, Spain

Summary
Developer focused on web applications and APIs.

Experience
Full Stack Developer - Acme Tech
Jan 2021 - Present
- Responsible for the development of a reactjs dashboard used by internal teams.
- Built REST APIs with Node.js and PostgreSQL.
- Wrote unit tests with Jest, etc.
Frontend Developer | Beta Labs
Mar 2019 - Dec 2020
- Developed Vue.js components for an e-commerce site.

Education
BSc Computer Science - Universidade de Sao Paulo
2014 - 2018

Skills
JavaScript, TypeScript, Node.js, PostgreSQL, Git

Languages
English - C1
Spanish - B2`;
const JOB = `Desarrollador/a Full Stack
Requisitos
- 3+ años de experiencia con React
- Node.js y PostgreSQL
- Experiencia con Docker
- Inglés C1
Valorable
- Kubernetes
Ofrecemos
- Salario competitivo`;

// ---------- data ----------
const email = `shots-${Date.now()}@example.com`;
const password = `Pw-${Math.random().toString(36).slice(2)}-x9`;
await createClient(SB_URL, ANON).auth.signUp({ email, password, options: { data: { full_name: "Ana Souza" } } });
let jar = [];
const ssr = createServerClient(SB_URL, ANON, {
  cookies: { getAll: () => jar, setAll: (l) => l.forEach((c) => (jar = [...jar.filter((x) => x.name !== c.name), { name: c.name, value: c.value }])) },
});
const { data: auth, error } = await ssr.auth.signInWithPassword({ email, password });
if (error) throw error;
const cookieHeader = jar.map((c) => `${c.name}=${c.value}`).join("; ");
const api = async (method, p, body) => {
  const res = await fetch(`${BASE}${p}`, { method, headers: { cookie: cookieHeader, "content-type": "application/json" }, body: body && JSON.stringify(body) });
  if (!res.ok) throw new Error(`${method} ${p} → ${res.status} ${await res.text()}`);
  return res.json();
};
const doc = await api("POST", "/api/documents", { text: CV });
const resume = await api("POST", "/api/resumes", { title: "Ana CV", language: "en", documentId: doc.documentId, cv: doc.cv });
const job = await api("POST", "/api/jobs", { title: "Full Stack Developer", company: "LogiCo", language: "es", rawText: JOB });
const analysis = await api("POST", "/api/analyses", { resumeVersionId: resume.versionId, jobId: job.jobId, language: "en" });

const pages = {
  landing: "/",
  login: "/login",
  signup: "/signup",
  dashboard: "/dashboard",
  new: "/new",
  resumes: "/resumes",
  resume: `/resumes/${resume.resumeId}`,
  analyses: "/analyses",
  analysis: `/analyses/${analysis.analysisId}`,
  suggestions: `/analyses/${analysis.analysisId}?tab=suggestions`,
  jobs: "/jobs",
  documents: "/documents",
  profile: "/profile",
  billing: "/billing",
  account: "/account",
};

// ---------- browser ----------
const profileDir = mkdtempSync(path.join(tmpdir(), "cvm-shots-"));
const port = 9333 + Math.floor(Math.random() * 500);
const chrome = spawn(CHROME, [`--remote-debugging-port=${port}`, `--user-data-dir=${profileDir}`, "--headless=new", "--no-first-run", "--disable-gpu", "--hide-scrollbars", "about:blank"], { stdio: "ignore" });
let target;
for (let i = 0; i < 50 && !target; i++) {
  await new Promise((r) => setTimeout(r, 200));
  target = await fetch(`http://127.0.0.1:${port}/json/list`).then((r) => r.json()).then((l) => l.find((t) => t.type === "page")).catch(() => undefined);
}
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
let seq = 0;
const pending = new Map();
const listeners = [];
ws.addEventListener("message", (e) => {
  const msg = JSON.parse(e.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  } else listeners.forEach((fn) => fn(msg));
});
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = ++seq;
    pending.set(id, (m) => (m.error ? reject(new Error(`${method}: ${m.error.message}`)) : resolve(m.result)));
    ws.send(JSON.stringify({ id, method, params }));
  });
const once = (method) => new Promise((r) => listeners.push((m) => m.method === method && r(m)));

await send("Page.enable");
await send("Network.enable");
const host = new URL(BASE).hostname;
for (const c of jar) await send("Network.setCookie", { name: c.name, value: c.value, domain: host, path: "/" });

const viewports = { mobile: { width: 390, height: 844, deviceScaleFactor: 2, mobile: true }, desktop: { width: 1366, height: 900, deviceScaleFactor: 1, mobile: false } };
const saved = [];
try {
  for (const [vp, metrics] of Object.entries(viewports)) {
    await send("Emulation.setDeviceMetricsOverride", metrics);
    for (const [name, p] of Object.entries(pages)) {
      if (ONLY && !ONLY.includes(name)) continue;
      const loaded = once("Page.loadEventFired");
      await send("Page.navigate", { url: `${BASE}${p}` });
      await loaded;
      await new Promise((r) => setTimeout(r, 700));
      const { cssContentSize } = await send("Page.getLayoutMetrics");
      const height = Math.min(Math.ceil(cssContentSize.height), 6000);
      const { data } = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { x: 0, y: 0, width: metrics.width, height, scale: 1 } });
      const file = path.join(OUT, `${vp}-${name}.png`);
      writeFileSync(file, Buffer.from(data, "base64"));
      saved.push(file);
    }
  }
} finally {
  ws.close();
  chrome.kill();
  await createClient(SB_URL, SERVICE, { auth: { persistSession: false } }).auth.admin.deleteUser(auth.user.id);
  setTimeout(() => {
    try {
      rmSync(profileDir, { recursive: true, force: true });
    } catch {
      // Windows may still lock Chrome's crash files; the temp dir is harmless.
    }
  }, 1000);
}
console.log(`Saved ${saved.length} screenshots to ${OUT}/`);

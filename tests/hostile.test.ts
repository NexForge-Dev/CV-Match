import { fork, spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import JSZip from "jszip";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { validateUpload } from "@/lib/documents/validate";
import { extractText, scannedResult, MAX_EXTRACTED_CHARS } from "@/lib/documents/extract";
import { MAX_PDF_PAGES, PARSER_PATH, parseIsolated, parserBudget, parserForkOptions } from "@/lib/documents/isolate";
import { noOcr } from "@/lib/documents/ocr";
import { parseCvText } from "@/lib/cv/parse";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { extractRequirements } from "@/lib/analysis/requirements";

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const HEAD = '<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>';
const CONTENT_TYPES = '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/></Types>';
const RELS = (target: string) =>
  `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="${target}"/></Relationships>`;

/** The audit's hostile shape: tens of KB on disk, one million objects once parsed. */
function hostileXml(megabytes: number) {
  const para = "<w:p><w:r><w:t>a</w:t></w:r></w:p>";
  return HEAD + para.repeat(Math.floor((megabytes * 1e6) / para.length)) + "</w:body></w:document>";
}

async function zip(entries: Record<string, string | Uint8Array>) {
  const z = new JSZip();
  z.file("[Content_Types].xml", CONTENT_TYPES);
  z.file("_rels/.rels", RELS("word/document.xml"));
  for (const [name, content] of Object.entries(entries)) z.file(name, content);
  return new Uint8Array(await z.generateAsync({ type: "uint8array", compression: "DEFLATE", compressionOptions: { level: 9 } }));
}

async function longPdf(pages: number) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < pages; i++) {
    const page = doc.addPage([595, 842]);
    for (let line = 0; line < 50; line++) page.drawText("Artigo publicado em anais de congresso, Lattes ".repeat(2), { x: 30, y: 800 - line * 14, size: 9, font });
  }
  return doc.save();
}

async function blankPdf(pages: number) {
  const doc = await PDFDocument.create();
  await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < pages; i++) doc.addPage([200, 200]);
  return doc.save();
}

/** Longest gap between ticks of a 10 ms timer while `run` is going: how long the event loop was blocked. */
async function maxEventLoopStall(run: () => Promise<unknown>) {
  let last = performance.now();
  let worst = 0;
  const timer = setInterval(() => {
    const now = performance.now();
    worst = Math.max(worst, now - last);
    last = now;
  }, 10);
  await run();
  // Without this a loop blocked from start to finish never ticks, and would report no stall at all.
  await new Promise((resolve) => setTimeout(resolve, 30));
  clearInterval(timer);
  return worst;
}

describe("hostile DOCX", () => {
  it("rejects markup a real CV never has, before any parser runs", async () => {
    const bytes = await zip({ "word/document.xml": hostileXml(6) });
    expect(bytes.byteLength).toBeLessThan(40_000);
    expect(validateUpload(bytes, "cv.docx", DOCX_MIME, 4_000_000)).toEqual({ ok: false, code: "unsafe_archive" });
  });

  it("counts the part the package really uses, whatever it is called", async () => {
    // mammoth follows _rels/.rels, so a tiny word/document.xml must not vouch for a huge "word/a.bin".
    const bytes = await zip({ "_rels/.rels": RELS("word/a.bin"), "word/document.xml": `${HEAD}</w:body></w:document>`, "word/a.bin": hostileXml(6) });
    expect(validateUpload(bytes, "cv.docx", DOCX_MIME, 4_000_000)).toEqual({ ok: false, code: "unsafe_archive" });
  });

  it("rejects an archive with more entries than a document has", async () => {
    const parts = Object.fromEntries(Array.from({ length: 300 }, (_, i) => [`word/p${i}.xml`, "<a/>"]));
    expect(validateUpload(await zip({ "word/document.xml": `${HEAD}</w:body></w:document>`, ...parts }), "cv.docx", DOCX_MIME, 4_000_000)).toEqual({ ok: false, code: "unsafe_archive" });
  });

  it("parses a long real-world document within the limits", async () => {
    const para = '<w:p w:rsidR="00A12B"><w:pPr><w:spacing w:after="120"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Calibri"/></w:rPr><w:t>Desenvolvi APIs em Node.js para pagamentos, com testes e monitoramento em produção.</w:t></w:r></w:p>';
    const xml = HEAD + para.repeat(Math.floor(2_000_000 / para.length)) + "</w:body></w:document>";
    const r = await parseIsolated("docx", await zip({ "word/document.xml": xml }));
    expect(r.ok).toBe(true);
  });

  it("still accepts a CV with a large photo", async () => {
    const bytes = await zip({ "word/document.xml": hostileXml(0.1), "word/media/foto.jpg": randomBytes(3_500_000) });
    expect(validateUpload(bytes, "cv.docx", DOCX_MIME, 4_000_000).ok).toBe(true);
  });

  it("does not block the event loop while parsing the largest DOCX the validator lets through", async () => {
    const bytes = await zip({ "word/document.xml": hostileXml(4.5) });
    expect(validateUpload(bytes, "cv.docx", DOCX_MIME, 4_000_000).ok).toBe(true);
    const stall = await maxEventLoopStall(() => extractText(bytes, "docx", noOcr));
    expect(stall).toBeLessThan(400);
  });
});

describe("hostile PDF", () => {
  it("refuses a PDF with more pages than a CV, without reading them", async () => {
    const r = await extractText(await blankPdf(MAX_PDF_PAGES + 1), "pdf", noOcr);
    expect(r).toMatchObject({ status: "failed", method: "pdf", text: "" });
    expect(r.warnings).toEqual(["too_many_pages"]);
  });

  it("still reads a PDF at the page limit", async () => {
    expect((await extractText(await blankPdf(MAX_PDF_PAGES), "pdf", noOcr)).status).toBe("needs_ocr");
  });

  it("does not block the event loop while a parser works", async () => {
    const bytes = await longPdf(MAX_PDF_PAGES);
    let result: Awaited<ReturnType<typeof extractText>> | undefined;
    const stall = await maxEventLoopStall(async () => {
      result = await extractText(bytes, "pdf", noOcr);
    });
    expect(result?.status).toBe("ok");
    expect(stall).toBeLessThan(400);
  });
});

describe("the isolated parser is killed from outside", () => {
  const heavy = zip({ "word/document.xml": hostileXml(4.5) });

  it("stops at the deadline, even in the middle of synchronous parsing", async () => {
    const started = Date.now();
    const r = await parseIsolated("docx", await heavy, { timeoutMs: 150 });
    expect(r).toEqual({ ok: false, reason: "timeout" });
    expect(Date.now() - started).toBeLessThan(5000);
  });

  it("dies at the heap limit without taking the process down", async () => {
    expect(await parseIsolated("docx", await heavy, { heapMb: 24 })).toEqual({ ok: false, reason: "crashed" });
  });

  it("is stopped by the RSS watchdog for memory outside the JS heap", async () => {
    expect(await parseIsolated("docx", await heavy, { rssMb: 1 })).toEqual({ ok: false, reason: "crashed" });
  });

  it("keeps working after a parser was killed", async () => {
    await parseIsolated("docx", await heavy, { timeoutMs: 50 });
    const r = await parseIsolated("pdf", await blankPdf(1));
    expect(r).toMatchObject({ ok: true, pages: 1 });
  });

  it("answers busy instead of queueing without end", async () => {
    const bytes = await blankPdf(1);
    const all = await Promise.all(Array.from({ length: 7 }, () => parseIsolated("pdf", bytes)));
    expect(all.filter((r) => r.ok).length).toBe(5); // one running, four waiting
    expect(all.filter((r) => !r.ok && r.reason === "busy").length).toBe(2);
    expect((await parseIsolated("pdf", bytes)).ok).toBe(true);
  });

  it("gives up waiting well before the function timeout", async () => {
    const running = parseIsolated("docx", await heavy);
    const started = Date.now();
    expect(await parseIsolated("pdf", await blankPdf(1), { queueWaitMs: 50 })).toEqual({ ok: false, reason: "busy" });
    expect(Date.now() - started).toBeLessThan(1000);
    await running;
  });

  it("dies with its parent, even in the middle of synchronous parsing", async () => {
    const script = path.join(os.tmpdir(), `cvm-orphan-${process.pid}.cjs`);
    fs.writeFileSync(script, `
      const { fork } = require("child_process");
      const bytes = new Uint8Array(require("fs").readFileSync(process.argv[2]));
      const child = fork(${JSON.stringify(PARSER_PATH)}, ["512", String(process.pid)], { execArgv: ["--max-old-space-size=4096"], serialization: "advanced", stdio: ["ignore", "ignore", "ignore", "ipc"] });
      child.send({ kind: "docx", bytes, maxPages: 1, maxChars: 10 }, () => { console.log(child.pid); setTimeout(() => process.kill(process.pid, "SIGKILL"), 200); });
    `);
    const input = `${script}.docx`;
    fs.writeFileSync(input, await heavy);
    const parent = spawn(process.execPath, [script, input], { stdio: ["ignore", "pipe", "ignore"] });
    const pid = await new Promise<number>((resolve) => parent.stdout.once("data", (d) => resolve(Number(String(d).trim()))));
    await new Promise((resolve) => parent.once("exit", resolve));
    const gone = async () => {
      for (let i = 0; i < 40; i++) {
        try {
          process.kill(pid, 0);
        } catch {
          return true;
        }
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      return false;
    };
    expect(await gone()).toBe(true);
    fs.rmSync(script);
    fs.rmSync(input);
  });
});

describe("the parser's environment (D2)", () => {
  // os.homedir() as libuv behaves for a uid with no passwd entry, the way some sandboxes run.
  const noPasswd = `data:text/javascript,import os from "node:os"; os.homedir = () => { if (process.env.HOME) return process.env.HOME; throw Object.assign(new Error("uv_os_homedir"), { code: "ENOENT" }); };`;
  const run = (env: NodeJS.ProcessEnv, bytes: Uint8Array) =>
    new Promise<Record<string, unknown>>((resolve) => {
      const options = parserForkOptions(256);
      const child = fork(PARSER_PATH, ["512", String(process.pid)], { ...options, env, execArgv: [...(options.execArgv ?? []), `--import=${noPasswd}`] });
      child.once("message", (message) => {
        child.kill("SIGKILL");
        resolve(message as Record<string, unknown>);
      });
      child.send({ kind: "pdf", bytes, maxPages: 5, maxChars: 1000 });
    });

  it("reads a PDF without a passwd entry, because it gets a HOME", async () => {
    expect(parserForkOptions(256).env).toEqual({ NODE_ENV: "production", HOME: os.tmpdir() });
    expect(await run(parserForkOptions(256).env!, await blankPdf(1))).toMatchObject({ ok: true, pages: 1 });
  });

  it("reports a broken environment as a server fault, not as a bad file", async () => {
    const r = await run({ NODE_ENV: "production" }, await blankPdf(1));
    expect(r).toMatchObject({ ok: false, reason: "unavailable" });
    expect(JSON.stringify(r)).not.toContain("uv_os_homedir");
  });

  it("still calls a file that is not a PDF corrupt, and says so in those words", async () => {
    expect(await parseIsolated("pdf", new TextEncoder().encode("%PDF-1.7\nnot really a pdf"))).toEqual({ ok: false, reason: "corrupt" });
  });
});

describe("memory budget", () => {
  it.each([[1024, 1], [1769, 2], [2048, 2], [3009, 2]])("keeps server plus children inside a %i MB function", (functionMb, slots) => {
    const budget = parserBudget(functionMb);
    expect(budget.slots).toBe(slots);
    expect(300 + budget.slots * budget.rssMb).toBeLessThanOrEqual(functionMb);
  });
});

describe("what the user is told", () => {
  it("blames the file only when the file is the problem", async () => {
    const heavy = await zip({ "word/document.xml": hostileXml(4.5) });
    const killed = await parseIsolated("docx", heavy, { heapMb: 24 });
    expect(killed).toEqual({ ok: false, reason: "crashed" });
    expect((await extractText(new TextEncoder().encode("%PDF-1.7\nbad"), "pdf", noOcr)).warnings).toEqual(["parse_error"]);
  });

  it("has every warning in every language", () => {
    for (const locale of ["pt", "en", "es"] as const) for (const key of ["too_many_pages", "too_heavy", "temporarily_unavailable"]) expect(dictionaries[locale].wizard.warnings[key]).toBeTruthy();
  });
});

describe("zip structure (D7)", () => {
  it("refuses an archive whose directory does not end at the end record", async () => {
    const good = await zip({ "word/document.xml": hostileXml(0.01) });
    expect(validateUpload(good, "cv.docx", DOCX_MIME, 4_000_000).ok).toBe(true);
    const eocd = good.byteLength - 22;
    const shifted = new Uint8Array(good.byteLength + 64);
    shifted.set(good.subarray(0, eocd));
    shifted.set(good.subarray(eocd), eocd + 64); // a gap where a second directory could hide
    expect(validateUpload(shifted, "cv.docx", DOCX_MIME, 4_000_000)).toEqual({ ok: false, code: "content_mismatch" });
  });

  it("accepts a compressible vector picture, but not markup dressed by name as one", async () => {
    const emf = new Uint8Array(7_000_000);
    emf.set(new TextEncoder().encode(" EMF"), 40);
    expect(validateUpload(await zip({ "word/document.xml": hostileXml(0.01), "word/media/image1.emf": emf }), "cv.docx", DOCX_MIME, 4_000_000).ok).toBe(true);
    expect(validateUpload(await zip({ "word/document.xml": hostileXml(0.01), "word/media/image1.emf": hostileXml(6) }), "cv.docx", DOCX_MIME, 4_000_000)).toEqual({ ok: false, code: "unsafe_archive" });
  });
});

describe("needs_ocr (CVM-021)", () => {
  it("keeps the text under the limit the database enforces", () => {
    const r = scannedResult("x\n ".repeat(40_000), 3);
    expect(r.status).toBe("needs_ocr");
    expect(r.text.length).toBeLessThanOrEqual(MAX_EXTRACTED_CHARS);
    expect(r.warnings).toContain("truncated");
  });
});

describe("text pasted into the parsers (CVM-004)", () => {
  const hostile = {
    "letters": "a".repeat(60_000),
    "dotted": "a.".repeat(30_000),
    "digits": "1".repeat(60_000),
    "spaced digits": "1 ".repeat(30_000),
    "at signs": "a@".repeat(30_000),
    "dashes": "- ".repeat(30_000),
  };

  for (const [name, text] of Object.entries(hostile)) {
    it(`parses a line of ${name} in linear time`, () => {
      const started = performance.now();
      parseCvText(text);
      expect(performance.now() - started).toBeLessThan(500);
    });
  }

  it("still finds contact data on normal lines", () => {
    const cv = parseCvText("Ana Souza\nana.souza@example.com | +55 11 91234-5678\n");
    expect(cv.contact.email).toBe("ana.souza@example.com");
    expect(cv.contact.phone).toBe("+55 11 91234-5678");
  });
});

describe("job text pasted into the parsers (CVM-004)", () => {
  for (const [name, text] of Object.entries({ letters: "a".repeat(30_000), digits: "1".repeat(30_000), dotted: "a.".repeat(15_000), "at signs": "a@".repeat(15_000) })) {
    it(`extracts requirements from a line of ${name} in linear time`, () => {
      const started = performance.now();
      extractRequirements(text);
      expect(performance.now() - started).toBeLessThan(500);
    });
  }
});

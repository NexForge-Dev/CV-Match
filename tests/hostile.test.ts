import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { validateUpload } from "@/lib/documents/validate";
import { extractText, scannedResult, MAX_EXTRACTED_CHARS } from "@/lib/documents/extract";
import { parseIsolated, MAX_PDF_PAGES } from "@/lib/documents/isolate";
import { noOcr } from "@/lib/documents/ocr";

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
    expect(stall).toBeLessThan(1000);
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
    const bytes = await blankPdf(MAX_PDF_PAGES);
    expect(await maxEventLoopStall(() => extractText(bytes, "pdf", noOcr))).toBeLessThan(1000);
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

  it("runs a bounded number of parsers at once", async () => {
    const bytes = await blankPdf(1);
    const all = await Promise.all(Array.from({ length: 6 }, () => parseIsolated("pdf", bytes)));
    expect(all.every((r) => r.ok)).toBe(true);
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

// Child process that parses one PDF or DOCX and is then killed. See isolate.ts.
import { Worker } from "node:worker_threads";

// A thread, because the parsers can hold the main thread for minutes. It covers memory outside the
// V8 heap (pdf.js decodes streams into ArrayBuffers), which --max-old-space-size does not limit.
new Worker(
  `const { workerData } = require("node:worker_threads");
   setInterval(() => { if (process.memoryUsage.rss() > workerData.limit) process.kill(process.pid, "SIGKILL"); }, 100);`,
  { eval: true, workerData: { limit: Number(process.argv[2]) * 1024 * 1024 } },
).unref();

async function parsePdf(bytes, maxPages) {
  const { PDFParse } = await import("pdf-parse");
  const { CanvasFactory, getData } = await import("pdf-parse/worker");
  PDFParse.setWorker(getData());
  const parser = new PDFParse({ data: bytes, isEvalSupported: false, CanvasFactory });
  const doc = await parser.load();
  // Checked on the page tree, before any page content is read.
  if (doc.numPages > maxPages) return { ok: false, reason: "too_many_pages" };
  const result = await parser.getText();
  return { ok: true, text: result.text ?? "", pages: result.total ?? 0 };
}

async function parseDocx(bytes) {
  const { default: mammoth } = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
  return { ok: true, text: result.value ?? "", pages: 0 };
}

process.once("message", async ({ kind, bytes, maxPages, maxChars }) => {
  let outcome;
  try {
    outcome = kind === "pdf" ? await parsePdf(bytes, maxPages) : await parseDocx(bytes);
  } catch {
    outcome = { ok: false, reason: "corrupt" };
  }
  if (outcome.ok) outcome.text = outcome.text.slice(0, maxChars);
  process.send(outcome);
});

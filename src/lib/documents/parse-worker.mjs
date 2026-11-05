// Child process that parses one PDF or DOCX and is then killed. See isolate.ts.
import os from "node:os";
import { Worker } from "node:worker_threads";

// First, so the watchdog thread inherits it. On one vCPU the server that answers everyone else must win.
try {
  os.setPriority(0, os.constants.priority.PRIORITY_LOW);
} catch {
  // Only a loss of priority, the parse can still run.
}

// A thread, because the parsers can hold the main thread for minutes. It covers memory outside the V8 heap
// (pdf.js decodes streams into ArrayBuffers), which --max-old-space-size does not limit, and a parent that was
// killed: a child stuck in synchronous parsing would never see its IPC channel close.
new Worker(
  `const { workerData } = require("node:worker_threads");
   const alive = (pid) => { try { process.kill(pid, 0); return true; } catch (err) { return err.code === "EPERM"; } };
   setInterval(() => {
     if (process.memoryUsage.rss() > workerData.limit || !alive(workerData.parent)) process.kill(process.pid, "SIGKILL");
   }, 100);`,
  { eval: true, workerData: { limit: Number(process.argv[2]) * 1024 * 1024, parent: Number(process.argv[3]) } },
).unref();

async function loadPdfParser() {
  const { PDFParse } = await import("pdf-parse");
  const { CanvasFactory, getData } = await import("pdf-parse/worker");
  // pdf.js only reports its absence later, as a parse failure that looks like a bad file.
  if (typeof globalThis.DOMMatrix !== "function") throw Object.assign(new Error("canvas polyfills missing"), { code: "CANVAS_UNAVAILABLE" });
  PDFParse.setWorker(getData());
  return { PDFParse, CanvasFactory };
}

async function parsePdf({ PDFParse, CanvasFactory }, bytes, maxPages) {
  const parser = new PDFParse({ data: bytes, isEvalSupported: false, CanvasFactory });
  const doc = await parser.load();
  // Checked on the page tree, before any page content is read.
  if (doc.numPages > maxPages) return { ok: false, reason: "too_many_pages" };
  const result = await parser.getText();
  return { ok: true, text: result.text ?? "", pages: result.total ?? 0 };
}

async function parseDocx(mammoth, bytes) {
  const result = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
  return { ok: true, text: result.value ?? "", pages: 0 };
}

// Never the message: it can quote the file. These two kinds mean the code broke, not that the file is bad.
const describe = (err) => ({ errorName: String(err?.name ?? "unknown").slice(0, 40), errorCode: typeof err?.code === "string" ? err.code.slice(0, 40) : undefined });
const isServerFault = (err) => err instanceof ReferenceError || err instanceof SyntaxError;

// on, not once: the listener keeps the IPC channel open until the parent, having read the answer, kills this
// process. Exiting right after send() could reach the parent before the message does.
process.on("message", async ({ kind, bytes, maxPages, maxChars }) => {
  let outcome;
  try {
    const parser = kind === "pdf" ? await loadPdfParser() : (await import("mammoth")).default;
    try {
      outcome = kind === "pdf" ? await parsePdf(parser, bytes, maxPages) : await parseDocx(parser, bytes);
    } catch (err) {
      outcome = { ok: false, reason: isServerFault(err) ? "unavailable" : "corrupt", ...describe(err) };
    }
  } catch (err) {
    outcome = { ok: false, reason: "unavailable", ...describe(err) };
  }
  if (outcome.ok) outcome.text = outcome.text.slice(0, maxChars);
  process.send(outcome);
});

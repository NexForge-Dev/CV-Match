import { fork, type ChildProcess } from "node:child_process";
import path from "node:path";
import { log } from "@/lib/log";
import type { FileKind } from "./validate";

export type ParseFailure = "timeout" | "crashed" | "spawn" | "too_many_pages" | "corrupt";
export type ParseOutcome = { ok: true; text: string; pages: number } | { ok: false; reason: ParseFailure };

/** A CV is a few pages. The cost of a PDF grows with its pages, so anything longer is refused unread. */
export const MAX_PDF_PAGES = 30;
/** More than the longest text we keep (MAX_EXTRACTED_CHARS) leaves room for what normalizing removes. */
const MAX_RAW_CHARS = 300_000;
const TIMEOUT_MS = 20_000;
const HEAP_MB = 256;
const RSS_MB = 512;
/** Each parser can use RSS_MB and a CPU core: on one small function instance, extra uploads wait their turn. */
const MAX_CONCURRENT = 2;

export interface ParseLimits {
  timeoutMs: number;
  heapMb: number;
  rssMb: number;
}

/**
 * Read at run time, so the bundler leaves it alone. next.config.ts adds this file to the /api/documents
 * trace (outputFileTracingIncludes).
 */
const WORKER = path.join(process.cwd(), "src", "lib", "documents", "parse-worker.mjs");

let running = 0;
const waiting: (() => void)[] = [];

async function acquire() {
  if (running < MAX_CONCURRENT) running++;
  else await new Promise<void>((resolve) => waiting.push(resolve));
}

function release() {
  const next = waiting.shift();
  if (next) next();
  else running--;
}

function runChild(kind: FileKind, bytes: Uint8Array, limits: ParseLimits): Promise<ParseOutcome> {
  return new Promise((resolve) => {
    let child: ChildProcess;
    try {
      child = fork(WORKER, [String(limits.rssMb)], {
        // Hostile input never shares an environment with the app's secrets.
        env: { NODE_ENV: "production" },
        execArgv: [`--max-old-space-size=${limits.heapMb}`],
        serialization: "advanced",
        stdio: ["ignore", "ignore", "ignore", "ipc"],
      });
    } catch {
      resolve({ ok: false, reason: "spawn" });
      return;
    }

    let settled = false;
    const finish = (outcome: ParseOutcome) => {
      if (settled) return;
      settled = true;
      clearTimeout(deadline);
      child.kill("SIGKILL");
      resolve(outcome);
    };
    const deadline = setTimeout(() => finish({ ok: false, reason: "timeout" }), limits.timeoutMs);

    child.once("message", (outcome) => finish(outcome as ParseOutcome));
    child.once("error", () => finish({ ok: false, reason: "spawn" }));
    // No answer: the heap limit or the RSS watchdog stopped it, or a parser took the process down.
    child.once("exit", (code, signal) => {
      if (!settled) log.warn("documents.parse_crashed", { kind, code, signal });
      finish({ ok: false, reason: "crashed" });
    });
    child.send({ kind, bytes, maxPages: MAX_PDF_PAGES, maxChars: MAX_RAW_CHARS }, () => undefined);
  });
}

/**
 * Parses an upload in a child process with a hard deadline and memory limits. The parsers run synchronously
 * for long stretches, so no timer in the same process can stop them, and a worker thread is no alternative:
 * @napi-rs/canvas (loaded by pdf-parse/worker) crashes the whole process when a thread that loaded it ends.
 */
export async function parseIsolated(kind: FileKind, bytes: Uint8Array, limits: Partial<ParseLimits> = {}): Promise<ParseOutcome> {
  await acquire();
  try {
    return await runChild(kind, bytes, { timeoutMs: TIMEOUT_MS, heapMb: HEAP_MB, rssMb: RSS_MB, ...limits });
  } finally {
    release();
  }
}

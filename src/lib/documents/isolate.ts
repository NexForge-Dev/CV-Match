import { fork, type ChildProcess, type ForkOptions } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { log } from "@/lib/log";
import type { FileKind } from "./validate";

export type ParseFailure = "timeout" | "crashed" | "unavailable" | "busy" | "too_many_pages" | "corrupt";
export type ParseOutcome = { ok: true; text: string; pages: number } | { ok: false; reason: ParseFailure };

/** The cost of a PDF grows with its pages. Lattes CVs run to 60 pages; 100 printed pages parse in about 2 s on 1 vCPU. */
export const MAX_PDF_PAGES = 100;
/** More than the longest text we keep (MAX_EXTRACTED_CHARS) leaves room for what normalizing removes. */
const MAX_RAW_CHARS = 300_000;
const TIMEOUT_MS = 20_000;
const HEAP_MB = 256;
const RSS_MB = 512;
/** Hard ceiling on parsers per instance: each one also wants a CPU core. */
const MAX_PARSERS = 2;
/** What the server itself needs: measured 230 to 260 MB with uploads in flight. */
const SERVER_RESERVE_MB = 300;
/** Used when the platform does not say: the smallest memory setting Vercel offers. */
const DEFAULT_FUNCTION_MB = 1024;
/** Waiting plus the parse deadline stay well inside the route's maxDuration of 60 s. */
const MAX_WAITING = 4;
const QUEUE_WAIT_MS = 15_000;

export interface ParseLimits {
  timeoutMs: number;
  heapMb: number;
  rssMb: number;
  queueWaitMs: number;
}

/**
 * How many parsers fit next to the server. The RSS watchdog stops each child at `rssMb`, so server plus children
 * stays under the function's memory and the platform never OOM-kills the whole instance.
 */
export function parserBudget(functionMb: number): { slots: number; rssMb: number } {
  const free = Math.max(functionMb - SERVER_RESERVE_MB, HEAP_MB);
  return { slots: Math.min(MAX_PARSERS, Math.max(1, Math.floor(free / RSS_MB))), rssMb: Math.min(RSS_MB, free) };
}

const budget = parserBudget(Number(process.env.AWS_LAMBDA_FUNCTION_MEMORY_SIZE) || DEFAULT_FUNCTION_MB);

/**
 * Read at run time, so the bundler leaves it alone. next.config.ts adds this file to the /api/documents
 * trace (outputFileTracingIncludes).
 */
export const PARSER_PATH = path.join(process.cwd(), "src", "lib", "documents", "parse-worker.mjs");

export function parserForkOptions(heapMb: number): ForkOptions {
  return {
    // Hostile input never shares an environment with the app's secrets. HOME is required: @napi-rs/canvas calls
    // os.homedir(), which throws for a uid with no passwd entry unless HOME is set, and every PDF would then fail.
    env: { NODE_ENV: "production", HOME: os.tmpdir() },
    execArgv: [`--max-old-space-size=${heapMb}`],
    serialization: "advanced",
    stdio: ["ignore", "ignore", "pipe", "ipc"],
  };
}

let running = 0;
const waiting: { grant: () => void }[] = [];

/** False when the queue is full or the wait ran out: the caller answers "try again" instead of hanging. */
function acquire(waitMs: number): Promise<boolean> {
  if (running < budget.slots) {
    running++;
    return Promise.resolve(true);
  }
  if (waiting.length >= MAX_WAITING) return Promise.resolve(false);
  return new Promise((resolve) => {
    const entry = {
      grant: () => {
        clearTimeout(timer);
        resolve(true);
      },
    };
    const timer = setTimeout(() => {
      waiting.splice(waiting.indexOf(entry), 1);
      resolve(false);
    }, waitMs);
    waiting.push(entry);
  });
}

function release() {
  const next = waiting.shift();
  if (next) next.grant();
  else running--;
}

/** Error codes only: stderr can quote what was being parsed, and CVs never reach the logs. */
function errorCodes(stderr: string) {
  return Array.from(new Set(stderr.match(/\b(?:ERR_[A-Z0-9_]+|E(?:NOENT|ACCES|PERM|MFILE|NOMEM|AGAIN))\b/g) ?? [])).slice(0, 3).join(",");
}

function runChild(kind: FileKind, bytes: Uint8Array, limits: ParseLimits): Promise<ParseOutcome> {
  return new Promise((resolve) => {
    let child: ChildProcess;
    try {
      child = fork(PARSER_PATH, [String(limits.rssMb)], parserForkOptions(limits.heapMb));
    } catch {
      log.error("documents.parser_unavailable", { kind, stage: "spawn" });
      resolve({ ok: false, reason: "unavailable" });
      return;
    }

    let settled = false;
    let stderr = "";
    child.stderr?.on("data", (chunk: Buffer) => {
      if (stderr.length < 8192) stderr += chunk.toString("latin1");
    });
    const finish = (outcome: ParseOutcome) => {
      if (settled) return;
      settled = true;
      clearTimeout(deadline);
      child.kill("SIGKILL");
      resolve(outcome);
    };
    const deadline = setTimeout(() => finish({ ok: false, reason: "timeout" }), limits.timeoutMs);

    child.once("message", (message) => {
      const { errorName, errorCode, ...outcome } = message as ParseOutcome & { errorName?: string; errorCode?: string };
      if (outcome.ok === false && outcome.reason === "unavailable") log.error("documents.parser_unavailable", { kind, stage: "load", errorName, errorCode });
      else if (outcome.ok === false && outcome.reason === "corrupt") log.info("documents.parse_rejected", { kind, errorName });
      finish(outcome);
    });
    child.once("error", () => {
      log.error("documents.parser_unavailable", { kind, stage: "spawn" });
      finish({ ok: false, reason: "unavailable" });
    });
    // No answer. "close", not "exit": stderr has been read by then.
    child.once("close", (code, signal) => {
      if (settled) return;
      // An uncaught error at startup, such as a missing file, exits 1 and prints it. The heap limit aborts and the
      // RSS watchdog kills in silence (exit 1 on Windows): those are the parser being stopped, not a broken server.
      const startup = code === 1 && stderr.length > 0;
      const fields = { kind, code, signal, codes: errorCodes(stderr) };
      if (startup) log.error("documents.parser_unavailable", { ...fields, stage: "startup" });
      else log.warn("documents.parse_crashed", fields);
      finish({ ok: false, reason: startup ? "unavailable" : "crashed" });
    });
    child.send({ kind, bytes, maxPages: MAX_PDF_PAGES, maxChars: MAX_RAW_CHARS }, () => undefined);
  });
}

/**
 * Parses an upload in a child process with a hard deadline and memory limits. The parsers run synchronously
 * for long stretches, so no timer in the same process can stop them, and a worker thread is no alternative:
 * @napi-rs/canvas (loaded by pdf-parse/worker) crashes the whole process when a thread that loaded it ends.
 * There is deliberately no in-process fallback: a clean failure is better than a server a small file can freeze.
 */
export async function parseIsolated(kind: FileKind, bytes: Uint8Array, limits: Partial<ParseLimits> = {}): Promise<ParseOutcome> {
  const resolved = { timeoutMs: TIMEOUT_MS, heapMb: HEAP_MB, rssMb: budget.rssMb, queueWaitMs: QUEUE_WAIT_MS, ...limits };
  if (!(await acquire(resolved.queueWaitMs))) {
    log.warn("documents.parser_busy", { kind, waiting: waiting.length });
    return { ok: false, reason: "busy" };
  }
  try {
    return await runChild(kind, bytes, resolved);
  } finally {
    release();
  }
}

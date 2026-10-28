import type { FileKind } from "./validate";
import { getOcrProvider, type OcrProvider } from "./ocr";

export type ExtractionStatus = "ok" | "low_text" | "needs_ocr" | "failed";
export type ExtractionWarning =
  | "scanned_pdf_no_ocr"
  | "ocr_used"
  | "ocr_failed"
  | "garbled_text"
  | "very_short_text"
  | "parse_error"
  | "not_a_word_document"
  | "truncated";

export interface ExtractionResult {
  text: string;
  status: ExtractionStatus;
  method: "pdf" | "docx" | "ocr" | "none";
  pages?: number;
  warnings: ExtractionWarning[];
}

/** Minimum average characters per page below which a PDF is treated as scanned. */
const MIN_CHARS_PER_PAGE = 40;
const MIN_USEFUL_CHARS = 200;
export const MAX_EXTRACTED_CHARS = 60000;

export function normalizeExtractedText(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(/\u0000/g, "")
    .replace(/[\t\f\v]+/g, " ")
    .replace(/[  ]{2,}/g, " ")
    .replace(/^-- \d+ of \d+ --$/gm, "") // pdf-parse page separators
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Ratio of characters that suggest a broken text layer (replacement chars, private-use glyphs, control chars). */
export function garbageRatio(text: string): number {
  if (!text) return 0;
  let bad = 0;
  for (const ch of text) {
    const code = ch.codePointAt(0)!;
    if (code === 0xfffd || (code >= 0xe000 && code <= 0xf8ff) || (code < 32 && ch !== "\n")) bad++;
  }
  return bad / text.length;
}

function finalize(text: string, method: ExtractionResult["method"], pages: number | undefined, warnings: ExtractionWarning[]): ExtractionResult {
  let normalized = normalizeExtractedText(text);
  if (normalized.length > MAX_EXTRACTED_CHARS) {
    normalized = normalized.slice(0, MAX_EXTRACTED_CHARS);
    warnings.push("truncated");
  }
  let status: ExtractionStatus = "ok";
  if (garbageRatio(normalized) > 0.1) {
    warnings.push("garbled_text");
    status = "low_text";
  }
  if (normalized.length < MIN_USEFUL_CHARS) {
    warnings.push("very_short_text");
    status = "low_text";
  }
  return { text: normalized, status, method, pages, warnings };
}

async function extractPdf(bytes: Uint8Array, ocr: OcrProvider): Promise<ExtractionResult> {
  const { PDFParse } = await import("pdf-parse");
  // Copy: pdf.js may transfer/detach the buffer it receives.
  const parser = new PDFParse({ data: new Uint8Array(bytes), isEvalSupported: false });
  let text = "";
  let pages = 0;
  try {
    const result = await parser.getText();
    text = result.text ?? "";
    pages = result.total ?? 0;
  } catch {
    return { text: "", status: "failed", method: "pdf", warnings: ["parse_error"] };
  } finally {
    await parser.destroy().catch(() => undefined);
  }

  const compactLength = text.replace(/\s+/g, "").replace(/--\d+of\d+--/g, "").length;
  const looksScanned = compactLength < MIN_CHARS_PER_PAGE * Math.max(1, pages);
  if (!looksScanned) return finalize(text, "pdf", pages, []);

  if (!ocr.enabled) {
    return { text: normalizeExtractedText(text), status: "needs_ocr", method: "pdf", pages, warnings: ["scanned_pdf_no_ocr"] };
  }
  try {
    const ocrText = await ocr.recognize(bytes, "application/pdf");
    return finalize(ocrText, "ocr", pages, ["ocr_used"]);
  } catch {
    return { text: "", status: "failed", method: "ocr", pages, warnings: ["ocr_failed"] };
  }
}

async function extractDocx(bytes: Uint8Array): Promise<ExtractionResult> {
  const mammoth = await import("mammoth");
  try {
    const result = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
    return finalize(result.value ?? "", "docx", undefined, []);
  } catch {
    // A ZIP that is not a Word document (or a corrupted one).
    return { text: "", status: "failed", method: "docx", warnings: ["not_a_word_document"] };
  }
}

export async function extractText(bytes: Uint8Array, kind: FileKind, ocr: OcrProvider = getOcrProvider()): Promise<ExtractionResult> {
  return kind === "pdf" ? extractPdf(bytes, ocr) : extractDocx(bytes);
}

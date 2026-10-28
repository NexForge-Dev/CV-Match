export type FileKind = "pdf" | "docx";

export type ValidationResult =
  | { ok: true; kind: FileKind; safeName: string }
  | { ok: false; code: "empty" | "too_large" | "unsupported_type" | "content_mismatch" };

const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46, 0x2d]; // %PDF-
const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04]; // PK\x03\x04

const ALLOWED_MIME: Record<FileKind, string[]> = {
  pdf: ["application/pdf"],
  docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
};

function startsWith(bytes: Uint8Array, magic: number[]) {
  return magic.every((b, i) => bytes[i] === b);
}

export function sanitizeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "document";
  const cleaned = base.normalize("NFKD").replace(/[^\w.\- ]+/g, "").replace(/\s+/g, " ").trim();
  return (cleaned || "document").slice(0, 120);
}

/**
 * Validates an upload by size, declared type, extension AND file signature.
 * Uploaded files are only ever parsed as data — never executed or rendered as HTML.
 */
export function validateUpload(
  bytes: Uint8Array,
  fileName: string,
  mimeType: string,
  maxBytes: number,
): ValidationResult {
  if (bytes.byteLength === 0) return { ok: false, code: "empty" };
  if (bytes.byteLength > maxBytes) return { ok: false, code: "too_large" };

  const ext = fileName.toLowerCase().split(".").pop();
  let kind: FileKind | null = null;
  if (ext === "pdf") kind = "pdf";
  else if (ext === "docx") kind = "docx";
  if (!kind) return { ok: false, code: "unsupported_type" };

  // Browsers sometimes send an empty or generic mime type; accept those, reject contradicting ones.
  const generic = mimeType === "" || mimeType === "application/octet-stream";
  if (!generic && !ALLOWED_MIME[kind].includes(mimeType)) return { ok: false, code: "unsupported_type" };

  const signatureOk = kind === "pdf" ? startsWith(bytes, PDF_MAGIC) : startsWith(bytes, ZIP_MAGIC);
  if (!signatureOk) return { ok: false, code: "content_mismatch" };

  return { ok: true, kind, safeName: sanitizeFileName(fileName) };
}

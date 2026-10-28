export type FileKind = "pdf" | "docx";

export type ValidationResult =
  | { ok: true; kind: FileKind; safeName: string }
  | { ok: false; code: "empty" | "too_large" | "unsupported_type" | "content_mismatch" | "unsafe_archive" };

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

  if (kind === "docx") {
    const zip = inspectZip(bytes);
    if (!zip) return { ok: false, code: "content_mismatch" };
    if (!zip.hasWordDocument) return { ok: false, code: "content_mismatch" };
    if (zip.entries > MAX_ZIP_ENTRIES || zip.uncompressedBytes > MAX_ZIP_UNCOMPRESSED || zip.zip64) return { ok: false, code: "unsafe_archive" };
  }

  return { ok: true, kind, safeName: sanitizeFileName(fileName) };
}

/** A real CV is a few hundred KB uncompressed; anything near these limits is a decompression bomb. */
const MAX_ZIP_ENTRIES = 1000;
const MAX_ZIP_UNCOMPRESSED = 60 * 1024 * 1024;

export interface ZipInfo {
  entries: number;
  uncompressedBytes: number;
  hasWordDocument: boolean;
  zip64: boolean;
}

/**
 * Reads the ZIP central directory (without decompressing anything) so a DOCX
 * is checked for its declared uncompressed size and for word/document.xml
 * before it reaches the parser. Returns null for a malformed archive.
 */
export function inspectZip(bytes: Uint8Array): ZipInfo | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const minEocd = 22;
  if (bytes.byteLength < minEocd) return null;
  let eocd = -1;
  for (let i = bytes.byteLength - minEocd; i >= Math.max(0, bytes.byteLength - minEocd - 0xffff); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) return null;
  const total = view.getUint16(eocd + 10, true);
  const cdOffset = view.getUint32(eocd + 16, true);
  if (total === 0xffff || cdOffset === 0xffffffff) return { entries: total, uncompressedBytes: 0, hasWordDocument: false, zip64: true };
  if (cdOffset >= bytes.byteLength) return null;

  let pos = cdOffset;
  let uncompressed = 0;
  let hasWordDocument = false;
  let zip64 = false;
  const decoder = new TextDecoder();
  for (let n = 0; n < total; n++) {
    if (pos + 46 > bytes.byteLength || view.getUint32(pos, true) !== 0x02014b50) return null;
    const size = view.getUint32(pos + 24, true);
    if (size === 0xffffffff) zip64 = true;
    uncompressed += size;
    const nameLen = view.getUint16(pos + 28, true);
    const extraLen = view.getUint16(pos + 30, true);
    const commentLen = view.getUint16(pos + 32, true);
    if (pos + 46 + nameLen > bytes.byteLength) return null;
    const name = decoder.decode(bytes.subarray(pos + 46, pos + 46 + nameLen));
    if (name === "word/document.xml") hasWordDocument = true;
    pos += 46 + nameLen + extraLen + commentLen;
  }
  return { entries: total, uncompressedBytes: uncompressed, hasWordDocument, zip64 };
}

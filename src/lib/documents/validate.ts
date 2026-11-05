import { inflateRawSync } from "node:zlib";

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
    // The declared sizes can lie: inflate for real, with a hard output cap, before the parser does.
    if (!inflatesWithin(bytes, MAX_ZIP_UNCOMPRESSED, MAX_ZIP_MARKUP)) return { ok: false, code: "unsafe_archive" };
  }

  return { ok: true, kind, safeName: sanitizeFileName(fileName) };
}

/**
 * A real CV is a few hundred KB of XML plus photos, and a few dozen entries. Parsing cost follows the markup:
 * 30 KB of DOCX that inflate to 10 MB of minimal paragraphs took 1.7 GB in the parser. Photos do not compress,
 * so anything that shrinks to under half is counted as markup, whatever its name: mammoth reads the part that
 * _rels/.rels points to, not necessarily word/document.xml.
 */
const MAX_ZIP_ENTRIES = 256;
const MAX_ZIP_UNCOMPRESSED = 15 * 1024 * 1024;
const MAX_ZIP_MARKUP = 5 * 1024 * 1024;

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
  const cdSize = view.getUint32(eocd + 12, true);
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
  // The directory must end where the end record says and touch it: otherwise another reader can find another one.
  if (pos !== cdOffset + cdSize || pos !== eocd) return null;
  return { entries: total, uncompressedBytes: uncompressed, hasWordDocument, zip64 };
}

/** Windows metafiles are the one kind of picture that compresses well, and no XML parser gets past these headers. */
function isVectorImage(bytes: Uint8Array) {
  const emf = bytes[40] === 0x20 && bytes[41] === 0x45 && bytes[42] === 0x4d && bytes[43] === 0x46; // " EMF" at offset 40
  const placeableWmf = bytes[0] === 0xd7 && bytes[1] === 0xcd && bytes[2] === 0xc6 && bytes[3] === 0x9a;
  return emf || placeableWmf;
}

/**
 * Inflates every entry of the archive (from the central directory's local header offsets) with a
 * running output cap. Returns false when the real uncompressed total exceeds `limit`, an entry uses an
 * unsupported compression method, the data is corrupt, or compressible entries add up to more than `markupLimit`.
 */
export function inflatesWithin(bytes: Uint8Array, limit: number, markupLimit = limit): boolean {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let eocd = -1;
  for (let i = bytes.byteLength - 22; i >= Math.max(0, bytes.byteLength - 22 - 0xffff); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) return false;
  const total = view.getUint16(eocd + 10, true);
  let pos = view.getUint32(eocd + 16, true);
  let remaining = limit;
  let markup = 0;
  try {
    for (let n = 0; n < total; n++) {
      if (pos + 46 > bytes.byteLength || view.getUint32(pos, true) !== 0x02014b50) return false;
      const method = view.getUint16(pos + 10, true);
      const compressed = view.getUint32(pos + 20, true);
      const local = view.getUint32(pos + 42, true);
      if (local + 30 > bytes.byteLength || view.getUint32(local, true) !== 0x04034b50) return false;
      const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
      if (start + compressed > bytes.byteLength) return false;
      const data = bytes.subarray(start, start + compressed);
      const inflated = method === 0 ? data : method === 8 ? inflateRawSync(data, { maxOutputLength: remaining + 1 }) : null;
      if (!inflated) return false;
      const size = inflated.byteLength;
      remaining -= size;
      if (size >= compressed * 2 && !isVectorImage(inflated)) markup += size;
      if (remaining < 0 || markup > markupLimit) return false;
      pos += 46 + view.getUint16(pos + 28, true) + view.getUint16(pos + 30, true) + view.getUint16(pos + 32, true);
    }
  } catch {
    // RangeError from maxOutputLength (bomb) or a zlib error (corrupt data).
    return false;
  }
  return true;
}

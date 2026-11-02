import { NextResponse } from "next/server";
import { z } from "zod";
import { HttpError, parseJson, withUser } from "@/lib/api";
import { env } from "@/lib/env";
import { log } from "@/lib/log";
import { validateUpload } from "@/lib/documents/validate";
import { extractText, normalizeExtractedText, MAX_EXTRACTED_CHARS, type ExtractionResult } from "@/lib/documents/extract";
import { detectInjection } from "@/lib/ai/safety";
import { parseCv } from "@/lib/ai/pipeline";
import { emptyCv } from "@/lib/cv/schema";
import { createAdminClient } from "@/lib/supabase/admin";
import { completeUsage, reserveUsage } from "@/lib/server/usage";
import { analytics } from "@/lib/analytics";

export const runtime = "nodejs";
export const maxDuration = 60;

const pastedSchema = z.object({ text: z.string().min(30).max(MAX_EXTRACTED_CHARS) });

/**
 * Upload a CV (multipart "file") or paste its text (JSON {text}).
 * The file is validated by size, extension, mime type and signature, parsed
 * in memory, and only stored when STORE_ORIGINAL_FILES=true.
 */
export const POST = withUser(async (req, _ctx, { user }) => {
  const admin = createAdminClient();
  const e = env();
  let usageId: number;

  let extraction: ExtractionResult;
  let fileMeta: { name: string; mime: string; kind: "pdf" | "docx" | "text"; size: number };
  let storagePath: string | null = null;

  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const declared = Number(req.headers.get("content-length") ?? 0);
    if (declared > e.UPLOAD_MAX_BYTES + 64 * 1024) throw new HttpError("upload_invalid", "too_large");
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new HttpError("invalid_input", "file");
    const bytes = new Uint8Array(await file.arrayBuffer());
    const validation = validateUpload(bytes, file.name, file.type, e.UPLOAD_MAX_BYTES);
    if (!validation.ok) throw new HttpError("upload_invalid", validation.code);

    // Reserved before parsing so every accepted upload counts against the caps, also when no AI runs.
    usageId = await reserveUsage(admin, user.id, "parse_cv");
    extraction = await extractText(bytes, validation.kind);
    fileMeta = { name: validation.safeName, mime: validation.kind === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document", kind: validation.kind, size: bytes.byteLength };

    if (e.STORE_ORIGINAL_FILES === "true") {
      storagePath = `${user.id}/${crypto.randomUUID()}.${validation.kind}`;
      const { error } = await admin.storage.from("cv-originals").upload(storagePath, bytes, { contentType: fileMeta.mime, upsert: false });
      if (error) {
        log.warn("documents.store_failed", { userId: user.id });
        storagePath = null;
      }
    }
  } else {
    const { text } = await parseJson(req, pastedSchema);
    usageId = await reserveUsage(admin, user.id, "parse_cv");
    const normalized = normalizeExtractedText(text);
    extraction = { text: normalized, status: normalized.length >= 200 ? "ok" : "low_text", method: "none", warnings: normalized.length >= 200 ? [] : ["very_short_text"] };
    fileMeta = { name: "pasted-text.txt", mime: "text/plain", kind: "text", size: Buffer.byteLength(text) };
  }

  const injection = detectInjection(extraction.text);
  let cv = emptyCv();
  let provider = "none";
  if (extraction.text.length >= 50 && extraction.status !== "failed") {
    const parsed = await parseCv(extraction.text);
    cv = parsed.value;
    provider = parsed.usage.provider;
    await completeUsage(admin, usageId, parsed.usage);
  }

  const { data: doc, error } = await admin
    .from("documents")
    .insert({
      user_id: user.id,
      file_name: fileMeta.name,
      mime_type: fileMeta.mime,
      kind: fileMeta.kind,
      size_bytes: fileMeta.size,
      storage_path: storagePath,
      extracted_text: extraction.text || null,
      extraction_status: extraction.status,
      extraction_method: extraction.method,
      extraction_warnings: extraction.warnings,
      injection_suspected: injection.suspicious,
    })
    .select("id")
    .single();
  if (error) {
    // No row points at the stored original any more: remove it so it cannot linger outside retention.
    if (storagePath) await admin.storage.from("cv-originals").remove([storagePath]);
    throw error;
  }

  log.info("documents.created", { userId: user.id, documentId: doc.id, status: extraction.status, kind: fileMeta.kind, provider });
  analytics.feature(user.id, "cv_importado");
  analytics.step(user.id, "cv_importado");
  if (extraction.method === "ocr") analytics.feature(user.id, "ocr_usado");
  return NextResponse.json({
    documentId: doc.id,
    status: extraction.status,
    warnings: extraction.warnings,
    text: extraction.text,
    injectionSuspected: injection.suspicious,
    cv,
  });
});

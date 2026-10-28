import { describe, expect, it } from "vitest";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { Document, Packer, Paragraph } from "docx";
import JSZip from "jszip";
import { validateUpload } from "@/lib/documents/validate";
import { extractText } from "@/lib/documents/extract";
import { httpOcr, noOcr } from "@/lib/documents/ocr";
import { renderCvPdf } from "@/lib/export/pdf";
import { renderCvDocx } from "@/lib/export/docx";
import { parseCvText } from "@/lib/cv/parse";
import { CV_EN } from "./fixtures";

async function makePdf(lines: string[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([595, 842]);
  lines.forEach((line, i) => page.drawText(line, { x: 40, y: 800 - i * 14, size: 10, font }));
  return doc.save();
}

async function makeBlankPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.addPage([595, 842]); // like a scanned page: no text layer
  return doc.save();
}

async function makeDocx(lines: string[]): Promise<Uint8Array> {
  const doc = new Document({ sections: [{ children: lines.map((l) => new Paragraph(l)) }] });
  return new Uint8Array(await Packer.toBuffer(doc));
}

const cvLines = CV_EN.split("\n").map((l) => l.replace(/[•]/g, "-"));

describe("upload validation", () => {
  it("accepts real PDF and DOCX files", async () => {
    expect(validateUpload(await makePdf(["hello"]), "cv.pdf", "application/pdf", 5_000_000).ok).toBe(true);
    expect(validateUpload(await makeDocx(["hello"]), "cv.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", 5_000_000).ok).toBe(true);
  });

  it("rejects oversized, empty, wrong-extension and spoofed files", async () => {
    const pdf = await makePdf(["hello"]);
    expect(validateUpload(pdf, "cv.pdf", "application/pdf", 10)).toEqual({ ok: false, code: "too_large" });
    expect(validateUpload(new Uint8Array(), "cv.pdf", "application/pdf", 100)).toEqual({ ok: false, code: "empty" });
    expect(validateUpload(pdf, "cv.exe", "application/octet-stream", 5_000_000)).toEqual({ ok: false, code: "unsupported_type" });
    expect(validateUpload(pdf, "cv.docm", "", 5_000_000)).toEqual({ ok: false, code: "unsupported_type" });
    const html = new TextEncoder().encode("<html><script>alert(1)</script></html>");
    expect(validateUpload(html, "cv.pdf", "application/pdf", 5_000_000)).toEqual({ ok: false, code: "content_mismatch" });
    expect(validateUpload(pdf, "cv.pdf", "text/html", 5_000_000)).toEqual({ ok: false, code: "unsupported_type" });
  });

  it("sanitizes file names", async () => {
    const r = validateUpload(await makePdf(["x"]), "../../etc/<script>cv.pdf", "application/pdf", 5_000_000);
    expect(r.ok && r.safeName).toBe("scriptcv.pdf");
  });
});

describe("text extraction", () => {
  it("extracts text from a PDF", async () => {
    const r = await extractText(await makePdf(cvLines), "pdf", noOcr);
    expect(r.status).toBe("ok");
    expect(r.method).toBe("pdf");
    expect(r.text).toContain("Ana Souza");
    expect(r.text).toContain("Acme Tech");
  });

  it("extracts text from a DOCX", async () => {
    const r = await extractText(await makeDocx(cvLines), "docx", noOcr);
    expect(r.status).toBe("ok");
    expect(r.text).toContain("Universidade de São Paulo");
  });

  it("flags scanned PDFs when OCR is not configured", async () => {
    const r = await extractText(await makeBlankPdf(), "pdf", noOcr);
    expect(r.status).toBe("needs_ocr");
    expect(r.warnings).toContain("scanned_pdf_no_ocr");
  });

  it("uses OCR when configured, and reports OCR failures", async () => {
    const okFetch = (async () => new Response(JSON.stringify({ text: CV_EN }), { status: 200 })) as unknown as typeof fetch;
    const ok = await extractText(await makeBlankPdf(), "pdf", httpOcr("https://ocr.test", "t", okFetch));
    expect(ok.status).toBe("ok");
    expect(ok.method).toBe("ocr");
    expect(ok.warnings).toContain("ocr_used");

    const badFetch = (async () => new Response("boom", { status: 500 })) as unknown as typeof fetch;
    const bad = await extractText(await makeBlankPdf(), "pdf", httpOcr("https://ocr.test", undefined, badFetch));
    expect(bad.status).toBe("failed");
    expect(bad.warnings).toContain("ocr_failed");
  });

  it("detects corrupted documents and too-short text", async () => {
    const corrupted = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a, 0x00, 0x01]);
    expect((await extractText(corrupted, "pdf", noOcr)).status).toBe("failed");
    const notWord = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0]);
    expect((await extractText(notWord, "docx", noOcr)).status).toBe("failed");
    const short = await extractText(await makeDocx(["Only a name"]), "docx", noOcr);
    expect(short.status).toBe("low_text");
    expect(short.warnings).toContain("very_short_text");
  });
});

describe("export", () => {
  const cv = parseCvText(CV_EN);

  for (const template of ["classic", "modern"] as const) {
    it(`renders a ${template} PDF that round-trips through extraction`, async () => {
      const pdf = await renderCvPdf(cv, "pt", template);
      expect(new TextDecoder().decode(pdf.slice(0, 5))).toBe("%PDF-");
      const text = (await extractText(pdf, "pdf", noOcr)).text;
      expect(text).toContain("Ana Souza");
      expect(text.toLowerCase()).toContain("experiência profissional");
      expect(text).toContain("Acme Tech");
    });

    it(`renders a ${template} DOCX that round-trips through extraction`, async () => {
      const docx = await renderCvDocx(cv, "es", template);
      const zip = await JSZip.loadAsync(docx);
      expect(zip.file("word/document.xml")).toBeTruthy();
      const text = (await extractText(docx, "docx", noOcr)).text;
      expect(text).toContain("Ana Souza");
      expect(text).toMatch(/Experiencia profesional/i);
    });
  }

  it("handles characters outside the PDF font encoding", async () => {
    const odd = { ...cv, summary: "Dev 🚀 with emoji → and 中文 characters" };
    const pdf = await renderCvPdf(odd, "en", "modern");
    expect(pdf.byteLength).toBeGreaterThan(1000);
  });
});

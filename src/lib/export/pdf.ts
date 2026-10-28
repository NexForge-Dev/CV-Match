import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
import type { CvData, CvLanguage } from "@/lib/cv/schema";
import { SECTION_LABELS, dateRange, type CvTemplate } from "./labels";

const A4: [number, number] = [595.28, 841.89];
const MARGIN = 50;

/** Standard PDF fonts only support WinAnsi; map common Unicode and drop the rest safely. */
function makeSanitizer(font: PDFFont) {
  const cache = new Map<string, string>();
  const replacements: Record<string, string> = { "•": "•", "–": "–", "—": "—", "‘": "'", "’": "'", "“": '"', "”": '"', "…": "...", " ": " ", "→": "->", "✓": "v" };
  return (text: string) =>
    Array.from(text.replace(/\s+/g, " "))
      .map((ch) => {
        if (cache.has(ch)) return cache.get(ch)!;
        let out = replacements[ch] ?? ch;
        try {
          font.widthOfTextAtSize(out, 10);
        } catch {
          const stripped = out.normalize("NFKD").replace(/[̀-ͯ]/g, "");
          try {
            font.widthOfTextAtSize(stripped, 10);
            out = stripped;
          } catch {
            out = "?";
          }
        }
        cache.set(ch, out);
        return out;
      })
      .join("");
}

interface Theme {
  accent: RGB;
  text: RGB;
  muted: RGB;
  nameSize: number;
  centeredHeader: boolean;
  headingUppercase: boolean;
}

const THEMES: Record<CvTemplate, Theme> = {
  classic: { accent: rgb(0.1, 0.1, 0.1), text: rgb(0.1, 0.1, 0.12), muted: rgb(0.35, 0.37, 0.42), nameSize: 20, centeredHeader: true, headingUppercase: true },
  modern: { accent: rgb(0.12, 0.29, 0.85), text: rgb(0.06, 0.09, 0.16), muted: rgb(0.39, 0.45, 0.55), nameSize: 22, centeredHeader: false, headingUppercase: false },
};

class Writer {
  page: PDFPage;
  y: number;
  constructor(
    private doc: PDFDocument,
    private regular: PDFFont,
    private bold: PDFFont,
    private clean: (s: string) => string,
  ) {
    this.page = doc.addPage(A4);
    this.y = A4[1] - MARGIN;
  }

  ensure(height: number) {
    if (this.y - height < MARGIN) {
      this.page = this.doc.addPage(A4);
      this.y = A4[1] - MARGIN;
    }
  }

  wrap(text: string, font: PDFFont, size: number, width: number): string[] {
    const words = this.clean(text).split(" ");
    const lines: string[] = [];
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= width) line = candidate;
      else {
        if (line) lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  text(text: string, opts: { size?: number; bold?: boolean; color?: RGB; indent?: number; center?: boolean; gap?: number } = {}) {
    if (!text.trim()) return;
    const size = opts.size ?? 10;
    const font = opts.bold ? this.bold : this.regular;
    const indent = opts.indent ?? 0;
    const width = A4[0] - MARGIN * 2 - indent;
    for (const line of this.wrap(text, font, size, width)) {
      this.ensure(size + 4);
      const x = opts.center ? (A4[0] - font.widthOfTextAtSize(line, size)) / 2 : MARGIN + indent;
      this.page.drawText(line, { x, y: this.y - size, size, font, color: opts.color ?? rgb(0, 0, 0) });
      this.y -= size + 3.5;
    }
    this.y -= opts.gap ?? 0;
  }

  bullet(text: string, color: RGB) {
    const size = 10;
    const lines = this.wrap(text, this.regular, size, A4[0] - MARGIN * 2 - 12);
    lines.forEach((line, i) => {
      this.ensure(size + 4);
      if (i === 0) this.page.drawText("•", { x: MARGIN + 2, y: this.y - size, size, font: this.regular, color });
      this.page.drawText(line, { x: MARGIN + 12, y: this.y - size, size, font: this.regular, color });
      this.y -= size + 3.5;
    });
  }

  rule(color: RGB) {
    this.page.drawLine({ start: { x: MARGIN, y: this.y }, end: { x: A4[0] - MARGIN, y: this.y }, thickness: 0.7, color });
    this.y -= 6;
  }

  space(n: number) {
    this.y -= n;
  }

  rowWithRight(left: string, right: string, color: RGB, muted: RGB) {
    const size = 10.5;
    this.ensure(size + 4);
    const r = this.clean(right);
    const rWidth = r ? this.regular.widthOfTextAtSize(r, 9.5) : 0;
    const leftLines = this.wrap(left, this.bold, size, A4[0] - MARGIN * 2 - rWidth - 12);
    leftLines.forEach((line, i) => {
      this.ensure(size + 4);
      this.page.drawText(line, { x: MARGIN, y: this.y - size, size, font: this.bold, color });
      if (i === 0 && r) this.page.drawText(r, { x: A4[0] - MARGIN - rWidth, y: this.y - size, size: 9.5, font: this.regular, color: muted });
      this.y -= size + 3.5;
    });
  }
}

export async function renderCvPdf(cv: CvData, language: CvLanguage, template: CvTemplate): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(cv.contact.fullName ? `${cv.contact.fullName} — CV` : "CV");
  doc.setProducer("CV Match");
  doc.setCreator("CV Match");
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const theme = THEMES[template];
  const labels = SECTION_LABELS[language];
  const w = new Writer(doc, regular, bold, makeSanitizer(regular));

  const c = cv.contact;
  w.text(c.fullName || " ", { size: theme.nameSize, bold: true, color: theme.accent, center: theme.centeredHeader, gap: 2 });
  w.text(c.headline, { size: 11.5, color: theme.muted, center: theme.centeredHeader, gap: 2 });
  w.text([c.email, c.phone, c.location, ...c.links].filter(Boolean).join("  |  "), { size: 9, color: theme.muted, center: theme.centeredHeader, gap: 6 });

  const heading = (label: string) => {
    w.ensure(40);
    w.space(6);
    w.text(theme.headingUppercase ? label.toUpperCase() : label, { size: 11.5, bold: true, color: theme.accent, gap: 1 });
    w.rule(theme.accent);
  };

  if (cv.summary) {
    heading(labels.summary);
    w.text(cv.summary, { color: theme.text, gap: 2 });
  }
  if (cv.experiences.length) {
    heading(labels.experience);
    for (const e of cv.experiences) {
      w.rowWithRight([e.title, e.company].filter(Boolean).join(" — "), dateRange(e.start, e.end), theme.text, theme.muted);
      if (e.location) w.text(e.location, { size: 9, color: theme.muted });
      for (const b of e.bullets) w.bullet(b, theme.text);
      w.space(5);
    }
  }
  if (cv.skills.length) {
    heading(labels.skills);
    w.text(cv.skills.join(" · "), { color: theme.text, gap: 2 });
  }
  if (cv.projects.length) {
    heading(labels.projects);
    for (const p of cv.projects) {
      w.rowWithRight(p.name, p.link, theme.text, theme.muted);
      w.text(p.description, { color: theme.text });
      if (p.technologies.length) w.text(p.technologies.join(", "), { size: 9, color: theme.muted });
      w.space(5);
    }
  }
  if (cv.education.length) {
    heading(labels.education);
    for (const ed of cv.education) {
      w.rowWithRight([ed.degree, ed.institution].filter(Boolean).join(" — "), dateRange(ed.start, ed.end), theme.text, theme.muted);
      w.text(ed.details, { size: 9.5, color: theme.muted });
      w.space(4);
    }
  }
  if (cv.languages.length) {
    heading(labels.languages);
    w.text(cv.languages.map((l) => (l.level ? `${l.name} (${l.level})` : l.name)).join(" · "), { color: theme.text });
  }
  if (cv.certifications.length) {
    heading(labels.certifications);
    for (const cert of cv.certifications) w.bullet(cert, theme.text);
  }
  return doc.save();
}

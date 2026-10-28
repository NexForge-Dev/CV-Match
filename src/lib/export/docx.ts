import { AlignmentType, BorderStyle, Document, Packer, Paragraph, TabStopPosition, TabStopType, TextRun } from "docx";
import type { CvData, CvLanguage } from "@/lib/cv/schema";
import { SECTION_LABELS, dateRange, type CvTemplate } from "./labels";

const STYLE: Record<CvTemplate, { accent: string; font: string; centered: boolean; upper: boolean }> = {
  classic: { accent: "1A1A1A", font: "Georgia", centered: true, upper: true },
  modern: { accent: "1F4AD9", font: "Calibri", centered: false, upper: false },
};

export async function renderCvDocx(cv: CvData, language: CvLanguage, template: CvTemplate): Promise<Uint8Array> {
  const s = STYLE[template];
  const labels = SECTION_LABELS[language];
  const align = s.centered ? AlignmentType.CENTER : AlignmentType.LEFT;
  const children: Paragraph[] = [];

  const heading = (label: string) =>
    children.push(
      new Paragraph({
        spacing: { before: 240, after: 80 },
        border: { bottom: { color: s.accent, style: BorderStyle.SINGLE, size: 6, space: 2 } },
        children: [new TextRun({ text: s.upper ? label.toUpperCase() : label, bold: true, color: s.accent, size: 23 })],
      }),
    );
  const row = (left: string, right: string) =>
    children.push(
      new Paragraph({
        tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
        spacing: { before: 80 },
        children: [new TextRun({ text: left, bold: true, size: 21 }), ...(right ? [new TextRun({ text: `\t${right}`, color: "64748B", size: 19 })] : [])],
      }),
    );
  const plain = (text: string, opts: { muted?: boolean; size?: number } = {}) => {
    if (text.trim()) children.push(new Paragraph({ children: [new TextRun({ text, size: opts.size ?? 20, color: opts.muted ? "64748B" : undefined })] }));
  };
  const bullet = (text: string) => children.push(new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text, size: 20 })] }));

  const c = cv.contact;
  children.push(new Paragraph({ alignment: align, children: [new TextRun({ text: c.fullName, bold: true, size: 40, color: s.accent })] }));
  if (c.headline) children.push(new Paragraph({ alignment: align, children: [new TextRun({ text: c.headline, size: 23, color: "475569" })] }));
  const contactLine = [c.email, c.phone, c.location, ...c.links].filter(Boolean).join("  |  ");
  if (contactLine) children.push(new Paragraph({ alignment: align, children: [new TextRun({ text: contactLine, size: 18, color: "64748B" })] }));

  if (cv.summary) {
    heading(labels.summary);
    plain(cv.summary);
  }
  if (cv.experiences.length) {
    heading(labels.experience);
    for (const e of cv.experiences) {
      row([e.title, e.company].filter(Boolean).join(" — "), dateRange(e.start, e.end));
      if (e.location) plain(e.location, { muted: true, size: 18 });
      e.bullets.forEach(bullet);
    }
  }
  if (cv.skills.length) {
    heading(labels.skills);
    plain(cv.skills.join(" · "));
  }
  if (cv.projects.length) {
    heading(labels.projects);
    for (const p of cv.projects) {
      row(p.name, p.link);
      plain(p.description);
      if (p.technologies.length) plain(p.technologies.join(", "), { muted: true, size: 18 });
    }
  }
  if (cv.education.length) {
    heading(labels.education);
    for (const ed of cv.education) {
      row([ed.degree, ed.institution].filter(Boolean).join(" — "), dateRange(ed.start, ed.end));
      plain(ed.details, { muted: true, size: 19 });
    }
  }
  if (cv.languages.length) {
    heading(labels.languages);
    plain(cv.languages.map((l) => (l.level ? `${l.name} (${l.level})` : l.name)).join(" · "));
  }
  if (cv.certifications.length) {
    heading(labels.certifications);
    cv.certifications.forEach(bullet);
  }

  const doc = new Document({
    creator: "CV Match",
    title: c.fullName ? `${c.fullName} — CV` : "CV",
    styles: { default: { document: { run: { font: s.font } } } },
    sections: [{ properties: { page: { margin: { top: 900, bottom: 900, left: 1000, right: 1000 } } }, children }],
  });
  const buffer = await Packer.toBuffer(doc);
  return new Uint8Array(buffer);
}

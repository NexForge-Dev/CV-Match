import { describe, expect, it } from "vitest";
import { parseCvText } from "@/lib/cv/parse";

describe("CV parsing never rejects a real CV because of its size", () => {
  it("long experiences, long lines and many items are clamped to the schema limits", () => {
    const bullets = Array.from({ length: 45 }, (_, i) => `• Did task number ${i} with care`).join("\n");
    const longCert = `Certificação ${"muito ".repeat(80)}longa`;
    const text = `Ana Souza\nDev\n\nExperiência\nDev - Acme\n2020 - 2021\n${bullets}\n\nCertificações\n${longCert}\n\nProjetos\n${"Projeto X - " + "descrição ".repeat(600)}`;
    const cv = parseCvText(text);
    expect(cv.experiences[0].bullets.length).toBeLessThanOrEqual(30);
    expect(cv.certifications[0].length).toBeLessThanOrEqual(300);
    expect(cv.projects[0].description.length).toBeLessThanOrEqual(4000);
  });
});

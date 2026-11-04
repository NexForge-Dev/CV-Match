import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { FALLBACK_PLANS } from "@/lib/billing/plans";
import { marketing, type LegalSection } from "@/lib/i18n/marketing";
import { fillLegal, LEGAL_CONTACT_EMAIL, legalFeatures, legalOperator, legalParagraphs, taxIdLabel } from "@/lib/legal";

const LOCALES = ["pt", "en", "es"] as const;
const pages = (l: (typeof LOCALES)[number]) => [marketing[l].legalNotice, marketing[l].privacy, marketing[l].terms];

const render = (sections: LegalSection[]) => {
  const op = legalOperator();
  const features = legalFeatures();
  return sections.flatMap((s) => legalParagraphs(s, op, features)).join("\n");
};

afterEach(() => vi.unstubAllEnvs());

function unset(...keys: string[]) {
  for (const k of keys) vi.stubEnv(k, "");
}

describe("legal contact", () => {
  it("is fixed and cannot be overridden by the environment", () => {
    vi.stubEnv("LEGAL_CONTACT_EMAIL", "old@example.com");
    expect(legalOperator().email).toBe("nexforge.d4v29@gmail.com");
    expect(LEGAL_CONTACT_EMAIL).toBe("nexforge.d4v29@gmail.com");
  });

  it.each(LOCALES)("appears on /legal, /privacy and /terms (%s)", (l) => {
    for (const page of pages(l)) expect(render(page.sections)).toContain("nexforge.d4v29@gmail.com");
  });
});

describe("operator identity", () => {
  const FIELDS = ["LEGAL_OPERATOR_NAME", "LEGAL_OPERATOR_TAX_ID", "LEGAL_OPERATOR_ADDRESS"];

  it.each(LOCALES)("blank fields read as pending, with no dash or invented data (%s)", (l) => {
    unset(...FIELDS);
    const supplier = render(marketing[l].legalNotice.sections.slice(0, 1));
    const controller = render(marketing[l].privacy.sections.slice(0, 1));
    for (const text of [supplier, controller]) {
      expect(text).toMatch(/pend/i);
      expect(text).not.toMatch(/—|: *$|\{/m);
      expect(text).toContain("nexforge.d4v29@gmail.com");
    }
    expect(`${supplier}${controller}`).not.toMatch(/nexforge\s*lta/i);
  });

  it("setting the variables is all it takes", () => {
    vi.stubEnv("LEGAL_OPERATOR_NAME", "Fulano de Tal");
    vi.stubEnv("LEGAL_OPERATOR_TAX_ID", "12.345.678/0001-95");
    vi.stubEnv("LEGAL_OPERATOR_ADDRESS", "Rua Exemplo, 1");
    const text = render(marketing.pt.legalNotice.sections);
    expect(text).toContain("Nome: Fulano de Tal");
    expect(text).toContain("CNPJ: 12.345.678/0001-95");
    expect(text).toContain("Endereço físico: Rua Exemplo, 1");
    expect(text).not.toMatch(/pendente/);
  });

  it("publishes what is set and marks the rest as pending", () => {
    unset(...FIELDS);
    vi.stubEnv("LEGAL_OPERATOR_NAME", "Fulano de Tal");
    const text = render(marketing.pt.legalNotice.sections.slice(0, 1));
    expect(text).toContain("Nome: Fulano de Tal");
    expect(text.match(/pendente/g)).toHaveLength(1);
  });

  it("labels the tax id by its format", () => {
    expect(taxIdLabel("123.456.789-09")).toBe("CPF");
    expect(taxIdLabel("12.345.678/0001-95")).toBe("CNPJ");
    expect(taxIdLabel("12.ABC.345/01DE-35")).toBe("CNPJ");
    expect(taxIdLabel("123")).toBe("CPF/CNPJ");
    expect(taxIdLabel(null)).toBe("CPF/CNPJ");
  });
});

describe("conditional disclosures", () => {
  const privacy = () => render(marketing.pt.privacy.sections);

  it("mentions Turnstile only when it is configured", () => {
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "");
    expect(privacy()).not.toMatch(/turnstile|cloudflare/i);
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "0xABC");
    expect(privacy()).toMatch(/Cloudflare Turnstile/);
  });

  it("names the AI provider only when AI runs", () => {
    unset("ANTHROPIC_API_KEY", "AI_PROVIDER");
    expect(privacy()).not.toMatch(/anthropic/i);
    expect(privacy()).toMatch(/motor de regras/);
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-test");
    expect(privacy()).toMatch(/Anthropic/);
    expect(privacy()).not.toMatch(/motor de regras/);
    vi.stubEnv("AI_PROVIDER", "heuristic");
    expect(privacy()).not.toMatch(/anthropic/i);
  });

  it("follows STORE_ORIGINAL_FILES and DOCUMENT_RETENTION_DAYS", () => {
    unset("STORE_ORIGINAL_FILES", "DOCUMENT_RETENTION_DAYS");
    expect(privacy()).toMatch(/não é guardado/);
    vi.stubEnv("STORE_ORIGINAL_FILES", "true");
    vi.stubEnv("DOCUMENT_RETENTION_DAYS", "14");
    expect(privacy()).toMatch(/mais de 14 dias/);
    expect(privacy()).not.toMatch(/não é guardado/);
  });

  it("mentions the NexForge panel only when all its variables are set", () => {
    unset("NEXFORGE_ENDPOINT", "NEXFORGE_INGEST_KEY", "NEXFORGE_PSEUDONYM_SECRET");
    expect(privacy()).not.toMatch(/nexforge painel|Painel interno/);
    vi.stubEnv("NEXFORGE_ENDPOINT", "https://panel.example/api/ingest");
    vi.stubEnv("NEXFORGE_INGEST_KEY", "k");
    expect(privacy()).not.toMatch(/Painel interno/);
    vi.stubEnv("NEXFORGE_PSEUDONYM_SECRET", "s");
    expect(privacy()).toMatch(/Painel interno/);
  });
});

describe("legal texts", () => {
  const allOn = { ai: true, noAi: true, storedFiles: true, noStoredFiles: true, turnstile: true, ocr: true, metrics: true };
  const full = (l: (typeof LOCALES)[number]) => {
    const op = { operator: "x", taxLabel: "CPF", taxId: "x", address: "x", email: LEGAL_CONTACT_EMAIL, retentionDays: "30" };
    return pages(l)
      .flatMap((p) => [fillLegal(p.intro, op), ...p.sections.flatMap((s) => legalParagraphs(s, op, allOn))])
      .join("\n");
  };

  it.each(LOCALES)("leaves no unresolved placeholder (%s)", (l) => {
    expect(full(l)).not.toMatch(/\{\w+\}/);
  });

  it.each(LOCALES)("has no leftovers from other jurisdictions or unconfirmed claims (%s)", (l) => {
    const text = full(l);
    expect(text).not.toMatch(/\b(RGPD|GDPR|AEPD|NIF|IVA|VAT)\b/);
    expect(text).not.toMatch(/ISO 27001|SOC ?2|\bcriptografad[oa]s? em repouso\b|\bbackups? criptografad/i);
    expect(text).not.toMatch(/cláusulas-padrão|standard contractual|cláusulas tipo/i);
  });

  it.each(LOCALES)("covers the sections the LGPD policy needs (%s)", (l) => {
    expect(marketing[l].privacy.sections).toHaveLength(12);
    const text = [full(l), ...marketing[l].privacy.sections.map((s) => s.title)].join(" ");
    for (const ref of ["art. 11", "art. 18", "art. 20", "art. 33", "art. 41", "art. 48"]) expect(text).toContain(ref);
  });

  it.each(LOCALES)("states prices that match the plans (%s)", (l) => {
    const text = render(marketing[l].terms.sections);
    for (const plan of FALLBACK_PLANS.filter((p) => p.price_cents > 0)) {
      expect(text).toContain(`R$ ${(plan.price_cents / 100).toFixed(2).replace(".", ",")}`);
      expect(text).toContain(`${plan.analyses_included} `);
    }
  });

  it("dates this version 04/11/2026", () => {
    expect(marketing.pt.legal.updatedDate).toBe("04/11/2026");
  });
});

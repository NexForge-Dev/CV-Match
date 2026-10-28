import { env } from "@/lib/env";

export interface OcrProvider {
  enabled: boolean;
  recognize(bytes: Uint8Array, mimeType: string): Promise<string>;
}

export const noOcr: OcrProvider = {
  enabled: false,
  async recognize() {
    throw new Error("OCR is not configured");
  },
};

/**
 * Generic HTTP OCR adapter: POSTs the raw file to OCR_HTTP_URL and expects
 * `{ "text": "..." }`. Lets you plug in any OCR service (self-hosted Tesseract,
 * a cloud vision API behind a small proxy, ...) without code changes.
 */
export function httpOcr(url: string, token?: string, fetchImpl: typeof fetch = fetch): OcrProvider {
  return {
    enabled: true,
    async recognize(bytes, mimeType) {
      const res = await fetchImpl(url, {
        method: "POST",
        headers: { "content-type": mimeType, ...(token ? { authorization: `Bearer ${token}` } : {}) },
        body: Buffer.from(bytes),
        signal: AbortSignal.timeout(60000),
      });
      if (!res.ok) throw new Error(`OCR service responded ${res.status}`);
      const json = (await res.json()) as { text?: unknown };
      if (typeof json.text !== "string") throw new Error("OCR service returned no text");
      return json.text;
    },
  };
}

export function getOcrProvider(): OcrProvider {
  const e = env();
  if (e.OCR_PROVIDER === "http" && e.OCR_HTTP_URL) return httpOcr(e.OCR_HTTP_URL, e.OCR_HTTP_TOKEN);
  return noOcr;
}

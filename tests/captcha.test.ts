import { describe, expect, it } from "vitest";
import { captchaOptions, canSubmitWithCaptcha, isCaptchaError, turnstileLanguage, turnstileSiteKey } from "@/lib/captcha";

describe("optional Turnstile captcha", () => {
  it("is disabled when the site key is unset or blank", () => {
    expect(turnstileSiteKey(undefined)).toBeNull();
    expect(turnstileSiteKey("")).toBeNull();
    expect(turnstileSiteKey("   ")).toBeNull();
    expect(turnstileSiteKey(" 0x4AAA ")).toBe("0x4AAA");
  });

  it("adds captchaToken to the Supabase options only when there is a token", () => {
    expect(captchaOptions(null)).toEqual({});
    expect(captchaOptions("tok")).toEqual({ captchaToken: "tok" });
  });

  it("blocks submit until the widget produced a token, but only when enabled", () => {
    expect(canSubmitWithCaptcha(null, null)).toBe(true);
    expect(canSubmitWithCaptcha("0x4AAA", null)).toBe(false);
    expect(canSubmitWithCaptcha("0x4AAA", "tok")).toBe(true);
  });

  it("recognises Supabase captcha rejections", () => {
    expect(isCaptchaError({ message: "captcha protection: request disallowed (timeout-or-duplicate)" })).toBe(true);
    expect(isCaptchaError({ message: "Invalid login credentials" })).toBe(false);
    expect(isCaptchaError(null)).toBe(false);
  });

  it("maps app locales to Turnstile languages", () => {
    expect(turnstileLanguage("pt")).toBe("pt-br");
    expect(turnstileLanguage("es")).toBe("es");
    expect(turnstileLanguage("en")).toBe("en");
  });
});

import { afterEach, describe, expect, it } from "vitest";
import { aiProvider, env, resetEnvCache } from "@/lib/env";

const saved = { ...process.env };
afterEach(() => {
  process.env = { ...saved };
  resetEnvCache();
});

function withEnv(vars: Record<string, string | undefined>) {
  process.env = { ...saved, ...vars };
  resetEnvCache();
  return env();
}

describe("AI provider selection", () => {
  it("uses Claude automatically once a key is set", () => {
    expect(aiProvider(withEnv({ AI_PROVIDER: "", ANTHROPIC_API_KEY: "sk-ant-x" }))).toBe("anthropic");
    expect(aiProvider(withEnv({ AI_PROVIDER: undefined, ANTHROPIC_API_KEY: "sk-ant-x" }))).toBe("anthropic");
  });

  it("falls back to the rule-based engine without a key, even if anthropic is requested", () => {
    expect(aiProvider(withEnv({ AI_PROVIDER: "", ANTHROPIC_API_KEY: "" }))).toBe("heuristic");
    expect(aiProvider(withEnv({ AI_PROVIDER: "anthropic", ANTHROPIC_API_KEY: "" }))).toBe("heuristic");
  });

  it("respects an explicit heuristic choice", () => {
    expect(aiProvider(withEnv({ AI_PROVIDER: "heuristic", ANTHROPIC_API_KEY: "sk-ant-x" }))).toBe("heuristic");
  });
});

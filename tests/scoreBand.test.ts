import { describe, expect, it } from "vitest";
import { computeScore, type MatchResult, type MatchStatus } from "@/lib/analysis/match";
import type { Requirement } from "@/lib/analysis/requirements";
import { scoreBand } from "@/lib/analysis/scoreBand";

describe("scoreBand", () => {
  it("reads the index in three bands", () => {
    expect(scoreBand(null)).toBe("none");
    expect(scoreBand(0)).toBe("low");
    expect(scoreBand(44)).toBe("low");
    expect(scoreBand(45)).toBe("mid");
    expect(scoreBand(69)).toBe("mid");
    expect(scoreBand(70)).toBe("high");
    expect(scoreBand(100)).toBe("high");
  });
});

describe("landing page example", () => {
  it("shows figures the real formula produces", () => {
    const rows: [Requirement["importance"], MatchStatus][] = [
      ["must", "found"],
      ["must", "found"],
      ["must", "partial"],
      ["must", "not_found"],
      ["nice", "found"],
      ["nice", "found"],
      ["nice", "ambiguous"],
    ];
    const requirements = rows.map(([importance], i) => ({ id: `r${i}`, importance }) as Requirement);
    const results = rows.map(([, status], i) => ({ requirementId: `r${i}`, status }) as MatchResult);
    const b = computeScore(requirements, results);
    expect(b.score).toBe(68);
    expect(b.counts).toEqual({ found: 4, partial: 1, not_found: 1, ambiguous: 1 });
    expect([b.mustFound, b.mustTotal]).toEqual([2, 4]);
  });
});

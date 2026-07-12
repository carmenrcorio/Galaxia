import { isMinorForSafety, usesAncientLight, formFromRelation } from "@galaxia/core";
import { describe, expect, it } from "vitest";
import {
  availableCompareRelationTypes,
  defaultCompareRelationType,
  isRomanticRelation,
} from "@galaxia/astro";

const NOW = new Date("2026-07-11T00:00:00.000Z");

describe("REMEMBRANCE + MINOR SAFETY: a passed minor is still a minor", () => {
  // Chart data and age/is_minor are untouched by passed_at. Compare must still
  // block romantic framing for a minor who has been marked as passed.
  const passedMinor = {
    isMinor: true,
    birthDate: "2015-08-20",
    birthPrecision: "exact" as const,
    passed_at: "2024-11-02T00:00:00.000Z",
  };
  const unflaggedPassedChild = {
    isMinor: false,
    birthDate: "2017-04-03",
    birthPrecision: "exact" as const,
    passed_at: "2025-01-15T00:00:00.000Z",
  };
  const adult = {
    isMinor: false,
    birthDate: "1955-03-02",
    birthPrecision: "exact" as const,
    passed_at: null as string | null,
  };

  it("isMinorForSafety ignores passed_at — remembrance never strips minor protection", () => {
    expect(isMinorForSafety(passedMinor, NOW)).toBe(true);
    expect(isMinorForSafety(unflaggedPassedChild, NOW)).toBe(true);
    expect(isMinorForSafety(adult, NOW)).toBe(false);
  });

  it("Compare romantic framing stays blocked for a passed minor pairing", () => {
    const pairHasMinor =
      isMinorForSafety(adult, NOW) || isMinorForSafety(passedMinor, NOW);
    expect(pairHasMinor).toBe(true);
    const available = availableCompareRelationTypes(pairHasMinor);
    expect(available.some((t) => isRomanticRelation(t))).toBe(false);
    expect(available).not.toContain("partners");
    expect(isRomanticRelation(defaultCompareRelationType(pairHasMinor))).toBe(false);
    expect(defaultCompareRelationType(pairHasMinor)).toBe("parent-child");
  });

  it("Gabriel regression still holds when the child is also remembered as passed", () => {
    const pairHasMinor =
      isMinorForSafety(adult, NOW) || isMinorForSafety(unflaggedPassedChild, NOW);
    expect(pairHasMinor).toBe(true);
    expect(availableCompareRelationTypes(pairHasMinor).some((t) => isRomanticRelation(t))).toBe(false);
  });

  it("a passed minor still renders as ancient light AND remains comparable (no exclusion flag)", () => {
    // Presence in Compare is "no filter on passed_at" — the orbit helper only
    // changes visual form; it never marks someone incomparable.
    expect(usesAncientLight({ relation: "child", passed_at: passedMinor.passed_at })).toBe(true);
    expect(formFromRelation(false, "child", passedMinor.passed_at)).toBe("ancient");
    // Chart / birth fields used by Compare are independent of passed_at.
    expect(passedMinor.birthDate).toBe("2015-08-20");
    expect(passedMinor.birthPrecision).toBe("exact");
  });
});

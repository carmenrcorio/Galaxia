import { isMinorForSafety } from "@galaxia/core";
import { describe, expect, it } from "vitest";
import {
  availableCompareRelationTypes,
  defaultCompareRelationType,
  isRomanticRelation,
} from "./compare-guidance";
import {
  elementFromRelation,
  formFromRelation,
  hasPassed,
  ringIndex,
  usesAncientLight,
} from "./galaxy-orbit";

const NOW = new Date("2026-07-11T00:00:00.000Z");

describe("hasPassed / usesAncientLight", () => {
  it("treats null/undefined passed_at as present", () => {
    expect(hasPassed({ passed_at: null })).toBe(false);
    expect(hasPassed({ passed_at: undefined })).toBe(false);
    expect(hasPassed({})).toBe(false);
  });

  it("treats a timestamptz as remembered (reversible by clearing)", () => {
    expect(hasPassed({ passed_at: "2026-07-12T15:00:00.000Z" })).toBe(true);
  });

  it("ancestors use ancient light even when present", () => {
    expect(usesAncientLight({ relation: "ancestor", passed_at: null })).toBe(true);
    expect(usesAncientLight({ relation: "grandparent", passed_at: null })).toBe(true);
  });

  it("a passed parent/friend/child adopts ancient light without inventing a new form", () => {
    const when = "2026-01-01T00:00:00.000Z";
    expect(usesAncientLight({ relation: "parent", passed_at: when })).toBe(true);
    expect(usesAncientLight({ relation: "friend", passed_at: when })).toBe(true);
    expect(usesAncientLight({ relation: "child", passed_at: when })).toBe(true);
    expect(formFromRelation(false, "parent", when)).toBe("ancient");
    expect(formFromRelation(false, "friend", when)).toBe("ancient");
    expect(ringIndex(false, "parent", when)).toBe(7);
    expect(ringIndex(false, "friend", when)).toBe(7);
    expect(elementFromRelation("friend", when)).toBe("water");
  });

  it("self never becomes ancient light even if passed_at were set", () => {
    expect(usesAncientLight({ is_self: true, relation: "self", passed_at: "2026-01-01T00:00:00.000Z" })).toBe(false);
    expect(formFromRelation(true, "self", "2026-01-01T00:00:00.000Z")).toBe("self");
    expect(ringIndex(true, "self", "2026-01-01T00:00:00.000Z")).toBe(0);
  });

  it("living non-ancestors keep their existing forms", () => {
    expect(formFromRelation(false, "partner", null)).toBe("binary");
    expect(formFromRelation(false, "child", null)).toBe("moon");
    expect(formFromRelation(false, "parent", null)).toBe("fixed");
    expect(formFromRelation(false, "friend", null)).toBe("star");
    expect(ringIndex(false, "partner", null)).toBe(1);
    expect(ringIndex(false, "child", null)).toBe(2);
    expect(ringIndex(false, "parent", null)).toBe(3);
  });
});

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

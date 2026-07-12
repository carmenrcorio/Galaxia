import { isMinorForSafety } from "@galaxia/core";
import { describe, expect, it } from "vitest";
import {
  ROMANTIC_RELATION_TYPES,
  availableCompareRelationTypes,
  defaultCompareRelationType,
  isRomanticRelation,
  type RelationType,
} from "./compare-guidance";

// Fixed "now" so the age-aware minor check is deterministic (matches the
// packages/core minor-safety suite).
const NOW = new Date("2026-07-11T00:00:00.000Z");

describe("romantic relationship-type classification", () => {
  it("flags partners and romantic as romantic, everything else as non-romantic", () => {
    expect(isRomanticRelation("partners")).toBe(true);
    expect(isRomanticRelation("romantic")).toBe(true);
    for (const t of ["siblings", "friends", "parent-child", "ancestor", "platonic"] as RelationType[]) {
      expect(isRomanticRelation(t)).toBe(false);
    }
  });
});

describe("MINOR SAFETY: /app/compare cannot select romantic framing for a minor", () => {
  it("removes every romantic type from the picker when the pairing has a minor", () => {
    const available = availableCompareRelationTypes(true);
    for (const romantic of ROMANTIC_RELATION_TYPES) {
      expect(available).not.toContain(romantic);
    }
    // Non-romantic caregiving/peer types stay selectable.
    expect(available).toEqual(["siblings", "friends", "parent-child", "ancestor"]);
    expect(available.every((t) => !isRomanticRelation(t))).toBe(true);
  });

  it("keeps all types (including partners) selectable for an adult-only pairing", () => {
    expect(availableCompareRelationTypes(false)).toContain("partners");
    expect(availableCompareRelationTypes(false)).toEqual([
      "partners",
      "siblings",
      "friends",
      "parent-child",
      "ancestor",
    ]);
  });

  it("never defaults to a romantic type, and defaults minor pairings to a non-romantic caregiving type", () => {
    expect(isRomanticRelation(defaultCompareRelationType(false))).toBe(false);
    expect(isRomanticRelation(defaultCompareRelationType(true))).toBe(false);
    expect(defaultCompareRelationType(false)).toBe("friends");
    expect(defaultCompareRelationType(true)).toBe("parent-child");
  });
});

describe("REPRODUCTION: grandmother vs. a child-labeled minor", () => {
  // The exact reported ship-blocker: Compare defaulted to "partners" and would
  // produce romantic/attraction framing about a child. The pairing's minor
  // status is decided by the age-aware backstop, never the raw is_minor flag.
  const grandmother = { isMinor: false, birthDate: "1955-03-02", birthPrecision: "exact" as const };
  const child = { isMinor: true, birthDate: "2015-08-20", birthPrecision: "exact" as const };

  const pairHasMinor = isMinorForSafety(grandmother, NOW) || isMinorForSafety(child, NOW);

  it("recognises the pairing includes a minor", () => {
    expect(isMinorForSafety(grandmother, NOW)).toBe(false);
    expect(isMinorForSafety(child, NOW)).toBe(true);
    expect(pairHasMinor).toBe(true);
  });

  it("makes romantic/partner framing UNSELECTABLE and defaults to a non-romantic type", () => {
    const available = availableCompareRelationTypes(pairHasMinor);
    expect(available).not.toContain("partners");
    expect(available.some((t) => isRomanticRelation(t))).toBe(false);
    expect(isRomanticRelation(defaultCompareRelationType(pairHasMinor))).toBe(false);
  });

  it("is age-aware: a real child saved with is_minor=false is still gated (the Gabriel case)", () => {
    const gabriel = { isMinor: false, birthDate: "2017-04-03", birthPrecision: "exact" as const };
    const pairWithUnflaggedChild = isMinorForSafety(grandmother, NOW) || isMinorForSafety(gabriel, NOW);
    expect(pairWithUnflaggedChild).toBe(true);
    expect(availableCompareRelationTypes(pairWithUnflaggedChild).some((t) => isRomanticRelation(t))).toBe(false);
  });
});

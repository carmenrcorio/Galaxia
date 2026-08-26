import { describe, expect, it } from "vitest";
import {
  COMPARE_RELATION_TYPES,
  ROMANTIC_RELATION_TYPES,
  isRomanticRelation,
  whatTheyNeed,
  type GuidancePerson,
  type RelationType,
} from "../src/compare-guidance";
import type { SynastryResult } from "../src/index";

/**
 * PERMANENT COMPLETENESS GATE. Converts the hand-maintained
 * ROMANTIC_RELATION_TYPES array into a CI-guarded invariant.
 *
 * Every persistable RelationType (COMPARE_RELATION_TYPES plus the two
 * binary-only values romantic/platonic, the same full union
 * apps/web/lib/quick-share.ts persists) must be classified by
 * isRomanticRelation(). For every value NOT in ROMANTIC_RELATION_TYPES,
 * whatTheyNeed() must never surface the attraction-framed Venus/warmth-score
 * line or the partner high-flow line, both of which are only meant to
 * reach a romantic-family pairing. A future RelationType that is
 * attraction-framed but forgotten from ROMANTIC_RELATION_TYPES would leak
 * this copy to a public, non-romantic share render; this test fails the
 * build instead.
 */

const ALL_RELATION_TYPES: RelationType[] = [...COMPARE_RELATION_TYPES, "romantic", "platonic"];

// Moon != Venus, and both have authored MOON_NEED/VENUS_NEED entries, so the
// Venus line is eligible to fire whenever isPartnerLens is true. warmth < 62
// and overall >= 70 arm both romantic-only branches in whatTheyNeed at once.
const person: GuidancePerson = { display_name: "Sam", moon: "Cancer", venus: "Leo" };
const scores = { overall: 80, emotional: 80, communication: 80, warmth: 40, values: 80, stability: 80 };
const synastry: SynastryResult = {
  aspects: [],
  houseOverlays: { aInB: [], bInA: [] },
  elementBalance: {
    a: { fire: 0, earth: 0, air: 0, water: 0 },
    b: { fire: 0, earth: 0, air: 0, water: 0 },
  },
  scores,
};

function hasAttractionCopy(output: string): boolean {
  // "feel loved through" is the fixed clause of the Venus-need line
  // (`With ${venus} Venus, they feel loved through ${venusLine}.`), the
  // only place whatTheyNeed reads scores.warmth. The high-flow line is the
  // other isPartnerLens-only branch.
  return output.includes("feel loved through") || output.includes("overall flow is strong");
}

describe("RelationType completeness: romantic-family classification", () => {
  it("COMPARE_RELATION_TYPES + romantic/platonic account for every union member with no gaps", () => {
    // Every entry classifies as a boolean (isRomanticRelation never throws
    // or falls through for a value drawn from the real exported list).
    for (const relType of ALL_RELATION_TYPES) {
      expect(typeof isRomanticRelation(relType)).toBe("boolean");
    }
    expect(new Set(ALL_RELATION_TYPES.filter(isRomanticRelation))).toEqual(
      new Set(ROMANTIC_RELATION_TYPES)
    );
  });

  it("the romantic-only Venus/warmth-score line is reachable at all (fixture sanity check)", () => {
    // Prove the fixture actually arms the attraction branch before trusting
    // its absence elsewhere. Otherwise a broken fixture would pass by
    // vacuously never triggering the copy for ANY type.
    const romantic = whatTheyNeed(scores, person, "romantic", synastry);
    expect(hasAttractionCopy(romantic)).toBe(true);
  });

  for (const relType of ALL_RELATION_TYPES) {
    if (isRomanticRelation(relType)) continue;
    it(`whatTheyNeed(..., "${relType}", ...) never surfaces attraction-framed / warmth-score copy`, () => {
      const output = whatTheyNeed(scores, person, relType, synastry);
      expect(hasAttractionCopy(output)).toBe(false);
    });
  }

  for (const relType of ALL_RELATION_TYPES) {
    if (!isRomanticRelation(relType)) continue;
    it(`whatTheyNeed(..., "${relType}", ...) is a genuine romantic-family lens (positive control)`, () => {
      const output = whatTheyNeed(scores, person, relType, synastry);
      expect(hasAttractionCopy(output)).toBe(true);
    });
  }
});

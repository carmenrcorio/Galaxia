import { isMinorForSafety } from "@galaxia/core";
import { describe, expect, it } from "vitest";
import {
  ROMANTIC_RELATION_TYPES,
  aspectActionLine,
  aspectActionParts,
  availableCompareRelationTypes,
  COMPARE_RELATION_SUGGESTION_HINT,
  defaultCompareRelationType,
  isRomanticRelation,
  orbStrength,
  relationshipAspectFraming,
  suggestCompareRelationType,
  whatTheyNeed,
  type RelationType,
} from "@galaxia/astro";

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

  it("tag suggestion is self-only; two user-relative tags never invent partners/siblings", () => {
    expect(suggestCompareRelationType("self", "partner")).toBe("partners");
    expect(suggestCompareRelationType("child", "child")).toBeNull();
    expect(suggestCompareRelationType("parent", "parent")).toBeNull();
    expect(COMPARE_RELATION_SUGGESTION_HINT).not.toContain("—");
  });

  it("self + partner suggestion is clamped by the minor default (order: suggest, then clamp)", () => {
    let relationType =
      suggestCompareRelationType("self", "partner") ?? defaultCompareRelationType(false);
    expect(relationType).toBe("partners");
    if (isRomanticRelation(relationType)) {
      relationType = defaultCompareRelationType(true);
    }
    expect(relationType).toBe("parent-child");
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

// ── Shared fixtures for the actionable-guidance suites ──────────────────────
// from = Person A's body, to = Person B's body (matches computeSynastry).
const ASPECTS = [
  { from: "mercury", to: "mars", type: "square", orb: 1.2, harmony: -0.8 },   // friction: communication vs drive
  { from: "venus", to: "moon", type: "trine", orb: 1.8, harmony: 0.7 },       // flow: affection/emotion
  { from: "moon", to: "saturn", type: "square", orb: 2.4, harmony: -0.6 },    // friction: emotion vs structure
  { from: "sun", to: "moon", type: "sextile", orb: 3.1, harmony: 0.5 },       // flow
  { from: "mercury", to: "moon", type: "trine", orb: 3.6, harmony: 0.6 },     // flow: communication
] as never[];
const SCORES = { overall: 55, emotional: 48, communication: 50, warmth: 55, values: 60, stability: 58 };
const SYNASTRY = { aspects: ASPECTS, scores: SCORES } as never;
const SARAH = { display_name: "Sarah", sun: "Leo", moon: "Leo", venus: "Cancer", mars: "Aries", mercury: "Gemini", saturn: "Scorpio" };

describe("PHASE 2: 'what they need' becomes need + how", () => {
  it("appends a concrete, sign-specific Moon 'how to deliver it' clause", () => {
    const text = whatTheyNeed(SCORES, SARAH, "friends", SYNASTRY);
    expect(text).toContain("Sarah's Leo Moon");
    expect(text).toContain("genuinely seen and celebrated"); // the need (description)
    expect(text).toContain("To actually give it:");          // the how (prescription)
    expect(text).toContain("out loud");                      // Leo-specific, not generic
  });

  it("parent-child adds a Saturn 'how to hold it' clause tied to the real Saturn sign", () => {
    const text = whatTheyNeed(SCORES, SARAH, "parent-child", SYNASTRY);
    expect(text).toContain("Scorpio Saturn");
    expect(text).toContain("How to hold it:");
  });

  it("partner lens adds a Venus 'way to show it' clause", () => {
    const text = whatTheyNeed(SCORES, SARAH, "partners", SYNASTRY);
    expect(text).toContain("Cancer Venus");
    expect(text).toContain("The way to show it:");
  });
});

describe("PHASE 1: actionable per-aspect guidance", () => {
  it("surfaces at least one flow AND one catch, each carrying an action line", () => {
    const framing = relationshipAspectFraming(SYNASTRY, "friends", "Sarah", "Ben");
    expect(framing.some((f) => f.flows)).toBe(true);   // a nurture line
    expect(framing.some((f) => !f.flows)).toBe(true);  // a minimize-the-clash line
    for (const f of framing) {
      expect(f.action.length).toBeGreaterThan(20);
      expect(f.action.endsWith(".")).toBe(true);
    }
  });

  it("friction → a minimize-the-clash line grounded in the specific bodies (Mercury square Mars)", () => {
    const line = aspectActionLine({ from: "mercury", to: "mars", harmony: -0.8 }, "friends");
    expect(line).toContain("debate");                    // specific to communication-vs-drive
    expect(line).toContain("get this right with you");
  });

  it("flow → a nurture line grounded in the specific bodies (Venus trine Moon)", () => {
    const line = aspectActionLine({ from: "venus", to: "moon", harmony: 0.7 }, "friends");
    expect(line.toLowerCase()).toContain("affection");
  });

  it("guidance DIFFERS by relationship type for the same aspect", () => {
    const a = { from: "mercury", to: "mars", harmony: -0.8 };
    const outputs = (["partners", "parent-child", "friends", "siblings"] as RelationType[]).map((t) => aspectActionLine(a, t));
    expect(new Set(outputs).size).toBeGreaterThanOrEqual(3);
    expect(aspectActionLine(a, "parent-child")).toContain("parent");
  });

  it("aspectActionParts splits opener + tactic without changing aspectActionLine", () => {
    const a = { from: "venus", to: "moon", harmony: 0.7 };
    const parts = aspectActionParts(a, "romantic");
    expect(parts.flows).toBe(true);
    expect(parts.opener).toBe("Don't let this ease go unspoken between you —");
    expect(parts.tactic.length).toBeGreaterThan(10);
    expect(aspectActionLine(a, "romantic")).toBe(`${parts.opener} ${parts.tactic}.`);
  });

  it("orbStrength maps thresholds: under 1 strong, 1–2.5 clear, over 2.5 subtle", () => {
    expect(orbStrength(0.9)).toBe("strong");
    expect(orbStrength(1.0)).toBe("clear");
    expect(orbStrength(2.5)).toBe("clear");
    expect(orbStrength(2.6)).toBe("subtle");
  });
});

describe("MINOR SAFETY: actionable guidance is never romantic/attraction-framed for non-romantic types", () => {
  const ROMANTIC_WORDS = /\b(attraction|desire|romance|romantic|lover|sexual|seduc)/i;
  const NON_ROMANTIC: RelationType[] = ["parent-child", "siblings", "friends", "ancestor"];

  it("no non-romantic-type action line or need prose contains romantic framing", () => {
    for (const t of NON_ROMANTIC) {
      for (const a of ASPECTS as { from: string; to: string; harmony: number }[]) {
        expect(aspectActionLine(a, t), `${t} / ${a.from}-${a.to}`).not.toMatch(ROMANTIC_WORDS);
      }
      expect(whatTheyNeed(SCORES, SARAH, t, SYNASTRY), `prose ${t}`).not.toMatch(ROMANTIC_WORDS);
    }
  });

  it("a Venus aspect surfaced under a family lens stays warmth-framed, not attraction-framed", () => {
    expect(aspectActionLine({ from: "venus", to: "moon", harmony: -0.5 }, "parent-child")).not.toMatch(ROMANTIC_WORDS);
  });
});

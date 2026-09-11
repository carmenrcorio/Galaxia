import { isMinorForSafety } from "@galaxia/core";
import { describe, expect, it } from "vitest";
import {
  COMPARE_RELATION_TYPES,
  ROMANTIC_RELATION_TYPES,
  RELATION_HEADLINE,
  aspectActionLine,
  aspectActionParts,
  availableCompareRelationTypes,
  COMPARE_RELATION_SUGGESTION_HINT,
  compareHeadline,
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

  it("tag suggestion: self + partner maps directly; non-symmetric non-self tags never invent a pair", () => {
    expect(suggestCompareRelationType("self", "partner")).toBe("partners");
    expect(suggestCompareRelationType("child", "child")).toBeNull();
    expect(suggestCompareRelationType("parent", "parent")).toBeNull();
    expect(COMPARE_RELATION_SUGGESTION_HINT).not.toContain("—");
  });

  it("tag suggestion: neither-side-self matching partner tags never invent romantic framing", () => {
    // A `people.relation` tag is each person's relation to the USER, not to
    // each other, so a single (or even matching) `partner` tag between two
    // non-self people must never auto-select a romantic lens.
    expect(suggestCompareRelationType("partner", "partner")).toBeNull();
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
    // PHASE 2: opener is now one of several pair-deterministic paraphrases
    // (see aspect-opener-variety.test.ts), not a single fixed string — this
    // pins the exact value for the venus/moon pair specifically so a future
    // regression to the pool ordering is caught here too.
    expect(parts.opener).toBe("Let this ease show instead of assuming they already know:");
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

// ── Relationship-differentiated Compare copy (RELATION_ASPECT_FRAME /
// whatTheyNeed audit follow-up) ─────────────────────────────────────────────
const ALL_SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

describe("1A: friends vs siblings now resolve to different Mercury-how strings", () => {
  it("the same Mercury sign produces a different 'in practice' clause for a friend vs a sibling", () => {
    const person = { ...SARAH, mercury: "Aries" };
    const friendText = whatTheyNeed(SCORES, person, "friends", SYNASTRY);
    const siblingText = whatTheyNeed(SCORES, person, "siblings", SYNASTRY);
    expect(friendText).toContain("This friend moves fast and says it straight.");
    expect(siblingText).toContain("Your sibling wants it direct, no cushioning.");
    expect(friendText).not.toBe(siblingText);
  });

  it("holds for every Mercury sign, not just one", () => {
    for (const sign of ALL_SIGNS) {
      const person = { ...SARAH, mercury: sign };
      const friendText = whatTheyNeed(SCORES, person, "friends", SYNASTRY);
      const siblingText = whatTheyNeed(SCORES, person, "siblings", SYNASTRY);
      expect(friendText, sign).not.toBe(siblingText);
      expect(friendText, sign).toContain("In practice: ");
      expect(siblingText, sign).toContain("In practice: ");
      expect(friendText, sign).toContain("friend");
      expect(siblingText, sign).toContain("Your sibling");
    }
  });

  it("does not change any other relType's whatTheyNeed() path", () => {
    const person = { ...SARAH, mercury: "Aries" };
    expect(whatTheyNeed(SCORES, person, "parent-child", SYNASTRY)).toContain("Scorpio Saturn");
    expect(whatTheyNeed(SCORES, person, "partners", SYNASTRY)).toContain("Cancer Venus");
  });
});

describe("1B: relationship-framed Compare headline (relType-keyed, score-band fallback)", () => {
  const HEADLINES: Record<string, string> = {
    partners: "This is a partnership you're both building on purpose. Below is where it moves easily, and where it asks for tending.",
    siblings: "You two share a history and a floor neither of you can walk off. Here's what runs smooth between you, and where the old patterns catch.",
    friends: "This is chosen closeness, kept alive by showing up. Here's what comes easy, and where it needs a little care.",
    "parent-child": "This is love read through respect and room to grow. Here's where care lands clean, and where it can tip into control.",
    ancestor: "This is a bond that reaches across time. Here's what still connects you, and where the eras pull apart.",
  };

  it("returns the relationship-framed line for each of the five core picker types, regardless of score", () => {
    for (const [relType, expected] of Object.entries(HEADLINES)) {
      expect(compareHeadline(relType as RelationType, 12)).toBe(expected);
      expect(compareHeadline(relType as RelationType, 55)).toBe(expected);
      expect(compareHeadline(relType as RelationType, 95)).toBe(expected);
    }
  });

  // PHASE 3: romantic/platonic are the two RelationTypes the saved-people
  // picker never offers, but they ARE what the public Quick Compare
  // (/chart/compare) uses — so falling through to a score-band line here
  // was exactly the bug the founder saw (a generic "High flow." line
  // instead of an authored relationship read). Both now have their own
  // RELATION_HEADLINE entry and never reach scoreBandHeadline.
  it("romantic and platonic now have their own authored headline, regardless of score", () => {
    const romantic = "This is a spark you're both curious about. Here's where it comes easily, and where it takes real care to turn into something steady.";
    const platonic = "This is a connection you have chosen to read together, kept easy by staying open with each other. Here is what comes easy, and where it needs a little care.";
    for (const overall of [12, 55, 95]) {
      expect(compareHeadline("romantic", overall)).toBe(romantic);
      expect(compareHeadline("platonic", overall)).toBe(platonic);
    }
    expect(RELATION_HEADLINE.romantic).toBe(romantic);
    expect(RELATION_HEADLINE.platonic).toBe(platonic);
  });

  it("the score-band fallback itself is unreachable from any real RelationType (all seven now have an authored headline)", () => {
    const ALL_RELATION_TYPES = [...COMPARE_RELATION_TYPES, "romantic", "platonic"] as RelationType[];
    for (const t of ALL_RELATION_TYPES) {
      // A score-band line would change between these three overalls; an
      // authored headline never does.
      const a = compareHeadline(t, 10);
      const b = compareHeadline(t, 55);
      const c = compareHeadline(t, 95);
      expect(a, t).toBe(b);
      expect(b, t).toBe(c);
    }
  });

  it("MINOR SAFETY: a minor pairing's available/default relation types never resolve to the partners headline", () => {
    const available = availableCompareRelationTypes(true);
    for (const t of available) {
      expect(compareHeadline(t, 80)).not.toBe(HEADLINES.partners);
    }
    expect(isRomanticRelation(defaultCompareRelationType(true))).toBe(false);
    expect(compareHeadline(defaultCompareRelationType(true), 80)).not.toBe(HEADLINES.partners);
  });
});

describe("1C: relationshipAspectFraming() revival — text is unique, action duplicates the tactic layer", () => {
  it("action is exactly aspectActionLine's opener+tactic (why it must never be re-rendered)", () => {
    const framing = relationshipAspectFraming(SYNASTRY, "friends", "Sarah", "Ben");
    for (const f of framing) {
      expect(f.action).toBe(aspectActionLine(f.aspect, "friends"));
    }
  });

  it("text is a distinct, relationship-framed sentence naming both people (never equal to action)", () => {
    const framing = relationshipAspectFraming(SYNASTRY, "siblings", "Sarah", "Ben");
    for (const f of framing) {
      expect(f.text).not.toBe(f.action);
      expect(f.text).toContain("Sarah's");
      expect(f.text).toContain("Ben's");
    }
  });
});

// PHASE 1 GRAMMAR FIX (DEFECT B): the shipped bug — "With Virgo Venus, they
// feel loved through to have the details noticed" — came from VENUS_NEED.Virgo
// being a to-infinitive instead of a noun phrase, so the template
// "...they feel loved through {X}." produced an ungrammatical sentence. Every
// one of the twelve VENUS_NEED values now reads as a single grammatical
// sentence when substituted into that template; assert the exact rendered
// text (not just a substring) for all twelve so a future edit that
// reintroduces a to-infinitive or a bare independent clause fails loudly.
describe("PHASE 1 grammar fix: every Venus sign renders a grammatical 'feel loved through' sentence", () => {
  // Full expected sentence per sign: "With {sign} Venus, they feel loved
  // through {need}. The way to show it: {how}." (VENUS_HOW is defined for
  // all twelve signs, so the second sentence always appears here).
  const EXPECTED: Record<string, string> = {
    Aries:
      "With Aries Venus, they feel loved through direct pursuit, the feeling of being chosen rather than merely convenient. The way to show it: pursue directly: choose them out loud instead of waiting to be chosen.",
    Taurus:
      "With Taurus Venus, they feel loved through tangible gestures and unhurried time together. The way to show it: make it tangible: unhurried time, a made meal, the seat kept for them.",
    Gemini:
      "With Gemini Venus, they feel loved through curiosity and real conversation, treated as its own love language. The way to show it: keep the conversation alive. A genuinely curious question reads as a love letter.",
    Cancer:
      "With Cancer Venus, they feel loved through warmth made domestic, being folded into their ordinary life. The way to show it: fold them into ordinary life: the errand, the small plan. That domestic inclusion is the intimacy they feel.",
    Leo:
      "With Leo Venus, they feel loved through public appreciation, not only private affection. The way to show it: appreciate them in front of others, not only in private; witnessed warmth is the real thing.",
    Virgo:
      "With Virgo Venus, they feel loved through having the small details noticed, since effort is how they give and how they want to receive. The way to show it: let them see you noticed the details of their effort, and name them one by one.",
    Libra:
      "With Libra Venus, they feel loved through harmony and reciprocity, warmth given generously and returned in kind. The way to show it: return the gesture evenly. They give generously and need to feel it come back.",
    Scorpio:
      "With Scorpio Venus, they feel loved through depth and full presence, intensity over pleasantry. The way to show it: give them your full, undistracted presence: depth over frequency.",
    Sagittarius:
      "With Sagittarius Venus, they feel loved through shared adventure, not stability alone. The way to show it: share an actual adventure instead of only offering stability. Go somewhere with them.",
    Capricorn:
      "With Capricorn Venus, they feel loved through reliability shown consistently, the simplest proof there is. The way to show it: show up consistently over time; here the reliability IS the romance.",
    Aquarius:
      "With Aquarius Venus, they feel loved through having their independence respected inside the bond. The way to show it: protect their freedom inside the bond. Don't make closeness cost their independence.",
    Pisces:
      "With Pisces Venus, they feel loved through quiet, genuine tenderness rather than grand gestures. The way to show it: offer sincere tenderness over grand gestures. The small true thing lands deepest.",
  };

  // Isolates the Venus clause as the ONLY sentence whatTheyNeed() produces:
  // moon is empty (skips the Moon-need clause) with emotional score high
  // enough to skip its reassurance fallback too, and synastry is null (skips
  // the "tightest friction" aspect clause) — so `text` below is exactly the
  // two authored Venus sentences, nothing appended or prepended.
  const ISOLATED_VENUS_SCORES = { ...SCORES, emotional: 60, overall: 55 };
  function isolatedVenusText(sign: string): string {
    const person = { ...SARAH, venus: sign, moon: "" };
    return whatTheyNeed(ISOLATED_VENUS_SCORES, person, "partners", null);
  }

  it("renders the exact expected sentence for all twelve signs (assert full strings, not substrings)", () => {
    expect(Object.keys(EXPECTED).sort()).toEqual([...ALL_SIGNS].sort());
    for (const sign of ALL_SIGNS) {
      expect(isolatedVenusText(sign), sign).toBe(EXPECTED[sign]);
    }
  });

  it("never produces a to-infinitive or a bare second clause after 'they feel loved through' (the exact DEFECT B shape)", () => {
    for (const sign of ALL_SIGNS) {
      const text = isolatedVenusText(sign);
      const match = text.match(/they feel loved through ([^.]+)\./);
      expect(match, sign).not.toBeNull();
      const needClause = match![1];
      // A to-infinitive need clause ("through to have...") is exactly the
      // shipped Virgo bug; a bare independent clause would read as two
      // sentences glued together with no connective.
      expect(needClause, sign).not.toMatch(/^to [a-z]+ /);
    }
  });
});

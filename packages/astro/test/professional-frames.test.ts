/**
 * PERMANENT GATE for the working (professional) Compare frames:
 * `colleagues`, `manager-report`, `mentor-mentee`.
 *
 * These frames exist so a saved colleague, boss, professor, or mentor is read
 * in a working register instead of a friendship or romantic one. Three things
 * must hold forever, and each is asserted here against the REAL exported
 * functions (never a copy of the tables):
 *
 *   1. DERIVATION — a recorded work tag preselects the matching working
 *      frame, and the asymmetric frame is never inferred from a pair of tags
 *      that cannot establish who reports to whom.
 *   2. REGISTER — no rendered professional string may contain romantic,
 *      attraction, or intimacy language, and none of them may borrow the
 *      personal register ("the bond", "close the distance", "loved").
 *   3. NO NEW ASTROLOGY — the frames only reorder and reframe aspects the
 *      engine already computed. `computeSynastry` takes no relationship
 *      argument, so the same two charts must produce the exact same aspect
 *      set, orbs, and scores under a working frame as under any other.
 */
import { describe, expect, it } from "vitest";
import {
  COMPARE_RELATION_LABEL,
  COMPARE_RELATION_TYPES,
  PROFESSIONAL_RELATION_TYPES,
  RELATION_BODY_PRIORITY,
  RELATION_HEADLINE,
  aspectActionLine,
  aspectActionParts,
  aspectSummaryLens,
  availableCompareRelationTypes,
  compareHeadline,
  compareRelationLabel,
  defaultCompareRelationType,
  isProfessionalRelation,
  isRomanticRelation,
  narrateHouseOverlay,
  relationHasHouseLens,
  relationHouseHint,
  relationHouseOverlays,
  relationLensCaption,
  relationshipAspectFraming,
  relationshipWatchLine,
  suggestCompareRelationType,
  whatTheyNeed,
  type GuidancePerson,
  type RelationType,
} from "../src/compare-guidance";
import { computeNatalChart, computeSynastry, type NatalChart } from "../src/index";

const PRO: RelationType[] = [...PROFESSIONAL_RELATION_TYPES];

const ALL_SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

// Two real, exact-time charts, so every reading below is rendered over genuine
// engine output (aspects, orbs, house overlays) rather than a hand-built stub.
const chartA: NatalChart = computeNatalChart({
  dateUTC: "1988-03-14T09:24:00Z",
  precision: "exact",
  lat: 40.7128,
  lng: -74.006,
});
const chartB: NatalChart = computeNatalChart({
  dateUTC: "1991-11-02T17:05:00Z",
  precision: "exact",
  lat: 51.5074,
  lng: -0.1278,
});
const synastry = computeSynastry(chartA, chartB);
const signOf = (chart: NatalChart, body: string) =>
  chart.placements.find((p) => p.body === body)?.sign;
const personFrom = (chart: NatalChart, name: string): GuidancePerson => ({
  display_name: name,
  sun: signOf(chart, "sun"),
  moon: signOf(chart, "moon"),
  venus: signOf(chart, "venus"),
  mars: signOf(chart, "mars"),
  mercury: signOf(chart, "mercury"),
  saturn: signOf(chart, "saturn"),
});
const ada = personFrom(chartA, "Ada");
const sam = personFrom(chartB, "Sam");

/** Everything a working frame can put in front of a reader, for one pairing. */
function renderedStringsFor(relType: RelationType, person: GuidancePerson): string[] {
  const overlays = relationHouseOverlays(synastry, relType);
  const framing = relationshipAspectFraming(synastry, relType, "Ada", "Sam");
  return [
    compareHeadline(relType, synastry.scores.overall),
    relationLensCaption(relType),
    compareRelationLabel(relType),
    relationHouseHint(relType),
    whatTheyNeed(synastry.scores, person, relType, synastry),
    relationshipWatchLine(synastry.scores, relType, synastry) ?? "",
    ...framing.map((f) => f.text),
    ...framing.map((f) => f.action),
    ...overlays.lines.map((line) => narrateHouseOverlay(line, relType, "Ada", "Sam")),
    ...synastry.aspects.map((a) => aspectActionLine(a, relType)),
  ].filter((s) => s.length > 0);
}

describe("PHASE 1: a recorded work relationship preselects the matching working frame", () => {
  it("self + work tag maps onto the frame the tag actually names", () => {
    expect(suggestCompareRelationType("self", "colleague")).toBe("colleagues");
    expect(suggestCompareRelationType("self", "coworker")).toBe("colleagues");
    expect(suggestCompareRelationType("self", "co-worker")).toBe("colleagues");
    expect(suggestCompareRelationType("self", "boss")).toBe("manager-report");
    expect(suggestCompareRelationType("self", "manager")).toBe("manager-report");
    expect(suggestCompareRelationType("self", "professor")).toBe("mentor-mentee");
    expect(suggestCompareRelationType("self", "mentor")).toBe("mentor-mentee");
  });

  it("a saved colleague is never read through a romantic or a friendship frame", () => {
    for (const tag of ["colleague", "coworker", "co-worker", "boss", "manager", "professor", "mentor"]) {
      const suggested = suggestCompareRelationType("self", tag);
      expect(suggested, tag).not.toBeNull();
      expect(isRomanticRelation(suggested!), tag).toBe(false);
      expect(suggested, tag).not.toBe("friends");
      expect(suggested, tag).not.toBe("platonic");
      expect(isProfessionalRelation(suggested!), tag).toBe(true);
    }
  });

  it("the user can still override: suggestion is a preselection, not a lock", () => {
    // The pages hold an explicit `userChoseTypeRef` and stop applying the
    // suggestion once it is set; the engine side of that contract is simply
    // that every frame stays selectable for an adult pairing.
    const available = availableCompareRelationTypes(false);
    for (const relType of COMPARE_RELATION_TYPES) {
      expect(available, relType).toContain(relType);
    }
  });

  it("the neutral fallback is unchanged for pairs with nothing recorded", () => {
    expect(suggestCompareRelationType(null, null)).toBeNull();
    expect(suggestCompareRelationType("acquaintance", "acquaintance")).toBeNull();
    expect(defaultCompareRelationType(false)).toBe("friends");
  });
});

describe("PHASE 2: every working frame is fully authored (no fallback copy)", () => {
  it("all three frames are in the picker list and classified as professional", () => {
    for (const relType of PRO) {
      expect(COMPARE_RELATION_TYPES).toContain(relType);
      expect(isProfessionalRelation(relType)).toBe(true);
      expect(isRomanticRelation(relType)).toBe(false);
    }
  });

  it("each has its own authored headline, caption, label, and body priority", () => {
    const headlines = new Set<string>();
    const captions = new Set<string>();
    for (const relType of PRO) {
      const headline = RELATION_HEADLINE[relType];
      expect(headline, relType).toBeDefined();
      // Flat per type: never the score-band fallback, which moves with score.
      expect(compareHeadline(relType, 10)).toBe(headline);
      expect(compareHeadline(relType, 95)).toBe(headline);
      headlines.add(headline!);
      captions.add(relationLensCaption(relType));
      expect(COMPARE_RELATION_LABEL[relType].length).toBeGreaterThan(0);
      expect(RELATION_BODY_PRIORITY[relType].length).toBeGreaterThan(0);
    }
    expect(headlines.size).toBe(PRO.length);
    expect(captions.size).toBe(PRO.length);
  });

  it("every frame reads working style, respect, and deadline friction for every sign", () => {
    for (const relType of PRO) {
      for (const mercury of ALL_SIGNS) {
        for (const saturn of ALL_SIGNS.slice(0, 3)) {
          const person: GuidancePerson = {
            display_name: "Kai",
            mercury,
            saturn,
            mars: "Aries",
            moon: "Cancer",
            venus: "Leo",
          };
          const text = whatTheyNeed(synastry.scores, person, relType, synastry);
          expect(text, `${relType}/${mercury}`).toContain(`${mercury} Mercury`);
          expect(text, `${relType}/${mercury}`).toContain("In practice: ");
          expect(text, `${relType}/${saturn}`).toContain(`reads respect through their ${saturn} Saturn`);
          expect(text, `${relType}/deadline`).toContain("Under a deadline");
        }
      }
    }
  });

  it("the same Mercury sign reads differently in each of the three frames (not a swapped prefix)", () => {
    for (const mercury of ALL_SIGNS) {
      const person: GuidancePerson = { display_name: "Kai", mercury, saturn: "Virgo", mars: "Libra" };
      const rendered = PRO.map((relType) => whatTheyNeed(synastry.scores, person, relType, synastry));
      expect(new Set(rendered).size, mercury).toBe(PRO.length);
    }
  });

  it("omits a clause rather than inventing one when the sign is missing or uncertain", () => {
    const noSigns: GuidancePerson = { display_name: "Kai" };
    for (const relType of PRO) {
      const text = whatTheyNeed(synastry.scores, noSigns, relType, synastry);
      expect(text, relType).not.toContain("Mercury sets");
      expect(text, relType).not.toContain("reads respect through");
      expect(text, relType).not.toContain("Under a deadline");
      expect(text.length, relType).toBeGreaterThan(0);
    }
  });

  it("leads with the working-style clause, not with the emotional-need clause", () => {
    for (const relType of PRO) {
      const text = whatTheyNeed(synastry.scores, ada, relType, synastry);
      expect(text.startsWith("Ada's"), relType).toBe(true);
      expect(text, relType).toContain("Mercury sets how they think a problem through");
      // The Moon clause is the personal register and is deliberately absent.
      expect(text, relType).not.toContain("Moon means they need");
    }
  });

  it("each frame has an authored register opener pool with real variety", () => {
    for (const relType of PRO) {
      for (const harmony of [0.5, -0.5]) {
        const openers = new Set<string>();
        for (const [from, to] of [
          ["jupiter", "sun"],
          ["jupiter", "mars"],
          ["uranus", "sun"],
          ["uranus", "mars"],
        ]) {
          openers.add(aspectActionParts({ from, to, harmony }, relType).opener);
        }
        // Same property the shipped DEFECT A case asserts for every other
        // frame (see aspect-opener-variety.test.ts): four real same-nature
        // rows must not repeat an opener.
        expect(openers.size, `${relType}/${harmony}`).toBe(4);
      }
    }
  });

  it("has a work-house lens that only asserts houses the engine computed", () => {
    for (const relType of PRO) {
      expect(relationHasHouseLens(relType), relType).toBe(true);
      expect(relationHouseHint(relType), relType).not.toBe("");
      // Date-only charts have no cusps, so there is nothing to assert.
      const dateOnly = relationHouseOverlays({ houseOverlays: { aInB: [], bInA: [] } }, relType);
      expect(dateOnly.available, relType).toBe(false);
      expect(dateOnly.lines, relType).toEqual([]);
    }
  });
});

describe("PHASE 2 SAFETY: the working register carries no romantic or intimacy language", () => {
  /**
   * THE GATE. Two families of term, and the same list the source uses to
   * decide which shared-table cells need a working-register override (see
   * WORK_ASPECT_ACTION / WORK_ASPECT_SUMMARY_FRAME in compare-guidance.ts):
   *
   *   1. Romantic, attraction, and intimacy language. The same family
   *      `no-romantic-terms-in-synastry-copy.test.ts` bans, which the task
   *      requires be absent from a working reading "of any kind".
   *   2. Personal-register affect vocabulary the personal frames legitimately
   *      use and a working frame must not borrow: affection, warmth, comfort,
   *      tenderness, closeness, and calling the relationship a bond.
   *
   * Deliberately NOT banned: "feeling", "mood", "care", "hurt". A working
   * reading is allowed to say a mood shifted or that a correction stung; that
   * is honest about real Moon and Mars placements, not intimacy.
   */
  const FORBIDDEN = [
    /\bromanc\w*/i,
    /\bromantic\w*/i,
    /\battract\w*/i,
    /\bdesir\w*/i,
    /\bchemistry\b/i,
    /\bmagnetic\w*/i,
    /\bpassion\w*/i,
    /\bintima\w*/i,
    /\bflirt\w*/i,
    /\bseduc\w*/i,
    /\bsexual\w*/i,
    /\blov\w*/i,
    /\baffection\w*/i,
    /\btender\w*/i,
    /\bcloseness\b/i,
    /\bwarm\w*/i,
    /\bcomfort\w*/i,
    /\bcherish\w*/i,
    /\bcuddl\w*/i,
    /\bsweetheart\b/i,
    /\bbond\w*/i,
    /\bclose the distance\b/i,
    /\bpartnership\b/i,
    /\bdating\b/i,
    /\bpursuit\b/i,
  ];

  const scan = (text: string) => FORBIDDEN.find((p) => p.test(text));

  it("fires on a planted violation (sanity check on the patterns themselves)", () => {
    for (const planted of [
      "This is where the attraction between you turns tender.",
      "Affection comes easy and large here.",
      "This pair needs comfort that doesn't cage.",
      "The maintenance the whole bond depends on.",
      "This pair loves in an unusual key.",
    ]) {
      expect(scan(planted), planted).toBeDefined();
    }
    expect(scan("Fix the handoff before the next one is due.")).toBeUndefined();
    expect(scan("Ask what they have already tried before adding to it.")).toBeUndefined();
    // Not a violation: a working reading may name a mood or a feeling.
    expect(scan("Ask them directly what should be dropped when they go quiet.")).toBeUndefined();
  });

  /**
   * EXHAUSTIVE, not sample-based. Every unordered pair of the ten BodyNames
   * the engine can produce, in both harmony directions, through both shared
   * pair-keyed layers (the summary lens and the action tactic). This is what
   * makes the guarantee hold for charts other than the two above: a pair that
   * neither of these people happens to have is still covered.
   */
  const BODIES = [
    "sun", "moon", "mercury", "venus", "mars",
    "jupiter", "saturn", "uranus", "neptune", "pluto",
  ];
  const ALL_PAIRS: { from: string; to: string }[] = [];
  for (let i = 0; i < BODIES.length; i++) {
    for (let j = i; j < BODIES.length; j++) {
      ALL_PAIRS.push({ from: BODIES[i]!, to: BODIES[j]! });
    }
  }

  it("covers all 55 body pairs in both directions with clean, non-empty copy", () => {
    expect(ALL_PAIRS.length).toBe(55);
    const violations: string[] = [];
    for (const relType of PRO) {
      for (const { from, to } of ALL_PAIRS) {
        for (const harmony of [0.8, -0.8]) {
          const aspect = { from, to, harmony };
          const lens = aspectSummaryLens(aspect, relType);
          const { tactic } = aspectActionParts(aspect, relType);
          // Non-empty tactic proves the pair resolves through the authored
          // Tier-1 table, never through the personal-register single-body
          // fallback (which would itself trip this gate).
          expect(tactic, `${relType} ${from}-${to} ${harmony}`).not.toBe("");
          expect(lens, `${relType} ${from}-${to} ${harmony}`).not.toBe("");
          for (const text of [lens, tactic, aspectActionLine(aspect, relType)]) {
            const hit = scan(text);
            if (hit) violations.push(`${relType} ${from}-${to} ${harmony > 0 ? "flows" : "catches"}: ${hit} in "${text}"`);
          }
        }
      }
    }
    expect(violations, violations.join("\n")).toEqual([]);
  });

  it("leaves the personal frames reading the shared tables (the override is working-frames-only)", () => {
    // The overrides must not leak sideways: a partner or a sibling still gets
    // the shared copy, including the cells a working frame overrides.
    const sunVenusFlow = { from: "sun", to: "venus", harmony: 0.8 };
    expect(aspectSummaryLens(sunVenusFlow, "partners")).toContain("warmth");
    expect(aspectActionParts(sunVenusFlow, "partners").tactic).toContain("warmth");
    expect(aspectSummaryLens(sunVenusFlow, "colleagues")).not.toContain("warmth");
    expect(aspectActionParts(sunVenusFlow, "colleagues").tactic).not.toContain("warmth");
    for (const relType of ["partners", "siblings", "friends", "parent-child", "ancestor", "romantic", "platonic"] as RelationType[]) {
      expect(aspectSummaryLens(sunVenusFlow, relType), relType).toBe(aspectSummaryLens(sunVenusFlow, "partners"));
      expect(aspectActionParts(sunVenusFlow, relType).tactic, relType).toBe(
        aspectActionParts(sunVenusFlow, "partners").tactic
      );
    }
  });

  it("no rendered professional string matches any forbidden pattern", () => {
    const violations: string[] = [];
    for (const relType of PRO) {
      for (const person of [ada, sam]) {
        for (const text of renderedStringsFor(relType, person)) {
          for (const pattern of FORBIDDEN) {
            const match = pattern.exec(text);
            if (match) violations.push(`${relType}: "${match[0]}" in "${text}"`);
          }
        }
      }
    }
    expect(violations, violations.join("\n")).toEqual([]);
  });

  it("holds for every sign combination of the sign-keyed working copy, not just these two charts", () => {
    const violations: string[] = [];
    for (const relType of PRO) {
      for (const sign of ALL_SIGNS) {
        const person: GuidancePerson = {
          display_name: "Kai",
          mercury: sign,
          saturn: sign,
          mars: sign,
          moon: sign,
          venus: sign,
        };
        const text = whatTheyNeed(synastry.scores, person, relType, synastry);
        for (const pattern of FORBIDDEN) {
          const match = pattern.exec(text);
          if (match) violations.push(`${relType}/${sign}: "${match[0]}" in "${text}"`);
        }
      }
    }
    expect(violations, violations.join("\n")).toEqual([]);
  });

  it("no U+2014 in any authored working string", () => {
    for (const relType of PRO) {
      for (const person of [ada, sam]) {
        for (const text of renderedStringsFor(relType, person)) {
          expect(text, `${relType}: ${text}`).not.toContain("\u2014");
        }
      }
    }
  });
});

describe("PHASE 3 SAFETY: isMinorForSafety gating covers every working frame", () => {
  // A professor or a mentor relationship can involve a minor, so the working
  // frames must stay REACHABLE for a pairing with a minor while remaining
  // impossible to render romantically. The gate is unchanged: it filters on
  // isRomanticRelation, and no professional frame is romantic.
  it("keeps the working frames selectable for a pairing with a minor", () => {
    const available = availableCompareRelationTypes(true);
    for (const relType of PRO) {
      expect(available, relType).toContain(relType);
    }
    expect(available.some((t) => isRomanticRelation(t))).toBe(false);
  });

  it("a professional frame is never the romantic clamp's target and never triggers it", () => {
    for (const relType of PRO) {
      // The page clamp is `if (pairHasMinor && isRomanticRelation(relType))`.
      expect(isRomanticRelation(relType), relType).toBe(false);
      // So a professional selection survives the clamp untouched.
      const afterClamp = isRomanticRelation(relType) ? defaultCompareRelationType(true) : relType;
      expect(afterClamp, relType).toBe(relType);
    }
    expect(isRomanticRelation(defaultCompareRelationType(true))).toBe(false);
  });

  it("a professor/mentor tag next to a minor still resolves to a non-romantic frame", () => {
    for (const tag of ["professor", "mentor", "boss", "colleague"]) {
      let relationType = suggestCompareRelationType("self", tag) ?? defaultCompareRelationType(false);
      const pairHasMinor = true;
      if (pairHasMinor && isRomanticRelation(relationType)) {
        relationType = defaultCompareRelationType(true);
      }
      expect(isProfessionalRelation(relationType), tag).toBe(true);
      expect(isRomanticRelation(relationType), tag).toBe(false);
    }
  });

  it("PROFESSIONAL_RELATION_TYPES and ROMANTIC_RELATION_TYPES never intersect", () => {
    for (const relType of PRO) {
      expect(isRomanticRelation(relType), relType).toBe(false);
    }
  });
});

describe("CONSTRAINT: no change to the aspect computation", () => {
  it("computeSynastry output is identical regardless of the frame (it takes no relationship argument)", () => {
    const again = computeSynastry(chartA, chartB);
    expect(again.aspects).toEqual(synastry.aspects);
    expect(again.scores).toEqual(synastry.scores);
    // Frame choice only reorders/reframes: every rendered row for a working
    // frame refers to an aspect that is in the untouched engine output.
    for (const relType of PRO) {
      const framing = relationshipAspectFraming(synastry, relType, "Ada", "Sam");
      for (const f of framing) {
        expect(synastry.aspects).toContain(f.aspect);
      }
    }
  });

  it("a working frame surfaces the same aspects a personal frame does, in a different order", () => {
    const asColleagues = relationshipAspectFraming(synastry, "colleagues", "Ada", "Sam");
    for (const f of asColleagues) {
      const engineAspect = synastry.aspects.find(
        (a) => a.from === f.aspect.from && a.to === f.aspect.to && a.type === f.aspect.type
      );
      expect(engineAspect).toBeDefined();
      expect(f.aspect.orb).toBe(engineAspect!.orb);
      expect(f.text).toContain(engineAspect!.orb.toFixed(1));
    }
  });
});

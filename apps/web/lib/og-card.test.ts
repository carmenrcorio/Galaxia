import { COMPARE_RELATION_TYPES, isRomanticRelation, RELATION_HEADLINE, type NatalChart, type RelationType } from "@galaxia/astro";
import { describe, expect, it } from "vitest";
import {
  buildOgCompareCard,
  buildOgSingleCard,
  extractOgBigThree,
  OG_NEUTRAL_COMPARE_SUBTITLE,
  OG_PLATONIC_SUMMARY,
  resolveOgCompareSummary,
} from "./og-card";
import { FORBIDDEN_PII_KEYS, type CompareSharePayload, type SingleSharePayload } from "./quick-share";

// Every value the persisted `relationType` column can actually hold — same
// construction as quick-share.ts's internal ALL_RELATION_TYPES, so a future
// 8th RelationType is exercised here without an edit.
const ALL_RELATION_TYPES: RelationType[] = [...COMPARE_RELATION_TYPES, "romantic", "platonic"];

function chart(overrides: Partial<NatalChart> = {}): NatalChart {
  return {
    placements: [
      { body: "sun", lon: 12, sign: "Aries", degree: 12, retro: false, confident: true },
      { body: "moon", lon: 200, sign: "Scorpio", degree: 20, retro: false, confident: true },
    ],
    precision: "exact",
    generational: {
      uranus: { sign: "Capricorn", confident: true },
      neptune: { sign: "Capricorn", confident: true },
      pluto: { sign: "Scorpio", confident: true },
      cohortLabel: "test",
    },
    ...overrides,
  };
}

/** Recursively asserts no forbidden PII key name appears anywhere in `value`. */
function assertNoForbiddenKeys(value: unknown, path = "$"): void {
  if (Array.isArray(value)) {
    value.forEach((item, i) => assertNoForbiddenKeys(item, `${path}[${i}]`));
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      expect(FORBIDDEN_PII_KEYS.has(key), `${path}.${key} is a forbidden PII key`).toBe(false);
      assertNoForbiddenKeys(child, `${path}.${key}`);
    }
  }
}

describe("extractOgBigThree — confident-only signs, chart.asc-only rising", () => {
  it("returns sun/moon signs when confident, and no rising when chart.asc is absent", () => {
    const result = extractOgBigThree(chart());
    expect(result).toEqual({ sun: "Aries", moon: "Scorpio", rising: undefined });
  });

  it("omits a placement whose confident flag is false — never fabricates a sign", () => {
    const result = extractOgBigThree(
      chart({
        placements: [
          { body: "sun", lon: 12, sign: "Aries", degree: 12, retro: false, confident: false, possibleSigns: ["Aries", "Pisces"] },
          { body: "moon", lon: 200, sign: "Scorpio", degree: 20, retro: false, confident: true },
        ],
      })
    );
    expect(result.sun).toBeUndefined();
    expect(result.moon).toBe("Scorpio");
  });

  it("includes rising only when chart.asc is a real exact-time value", () => {
    expect(extractOgBigThree(chart({ asc: "Leo" })).rising).toBe("Leo");
    expect(extractOgBigThree(chart()).rising).toBeUndefined();
  });

  it("never returns a rising value the chart did not actually compute (no fabrication)", () => {
    const result = extractOgBigThree(chart({ precision: "date" }));
    expect(result.rising).toBeUndefined();
  });
});

describe("buildOgSingleCard — structurally free of birth PII", () => {
  const payload: SingleSharePayload = {
    displayDate: "April 3, 1990",
    birthPlace: "Austin",
    chart: chart({ asc: "Leo" }),
  };

  it("carries only sun/moon/rising signs plus an optional name — no PII keys anywhere", () => {
    const card = buildOgSingleCard(payload);
    expect(card).toEqual({ name: undefined, bigThree: { sun: "Aries", moon: "Scorpio", rising: "Leo" } });
    assertNoForbiddenKeys(card);
  });

  it("never carries displayDate/birthPlace through to the card model (image never needs them)", () => {
    const card = buildOgSingleCard(payload) as Record<string, unknown>;
    expect(card).not.toHaveProperty("displayDate");
    expect(card).not.toHaveProperty("birthPlace");
  });
});

describe("resolveOgCompareSummary — never reads scores, never a romantic read", () => {
  it("returns the neutral subtitle for every romantic relationType, never a relationship line", () => {
    for (const relationType of ALL_RELATION_TYPES.filter(isRomanticRelation)) {
      const result = resolveOgCompareSummary(RELATION_HEADLINE, relationType, "generational fallback theme");
      expect(result).toEqual({ kind: "neutral", text: OG_NEUTRAL_COMPARE_SUBTITLE });
    }
  });

  it("returns RELATION_HEADLINE's own line for every non-romantic type it covers", () => {
    for (const relationType of ALL_RELATION_TYPES.filter((t) => !isRomanticRelation(t))) {
      const direct = RELATION_HEADLINE[relationType];
      if (!direct) continue;
      const result = resolveOgCompareSummary(RELATION_HEADLINE, relationType, "generational fallback theme");
      expect(result).toEqual({ kind: "relationship", text: direct });
    }
  });

  it('falls back to the authored OG_PLATONIC_SUMMARY for "platonic" (the one type RELATION_HEADLINE omits)', () => {
    expect(RELATION_HEADLINE.platonic).toBeUndefined();
    const result = resolveOgCompareSummary(RELATION_HEADLINE, "platonic", "generational fallback theme");
    expect(result).toEqual({ kind: "relationship", text: OG_PLATONIC_SUMMARY });
  });

  it("falls back to generational.theme only if a non-romantic type has neither a table entry nor the platonic line", () => {
    const result = resolveOgCompareSummary({}, "friends", "generational fallback theme");
    expect(result).toEqual({ kind: "relationship", text: "generational fallback theme" });
  });

  it("never falls back to a score-band line — the fallback signature has no score input at all", () => {
    // Type-level guarantee: resolveOgCompareSummary's parameters are
    // (table, relationType, generationalTheme, blockRomanticMinorRender) —
    // there is no `overall`/`scores` parameter to thread a score through,
    // unlike compareHeadline(relType, overall).
    expect(resolveOgCompareSummary.length).toBeLessThanOrEqual(4);
  });

  it("forces the neutral subtitle when blockRomanticMinorRender is set, even for a non-romantic type", () => {
    const result = resolveOgCompareSummary(RELATION_HEADLINE, "friends", "theme", true);
    expect(result).toEqual({ kind: "neutral", text: OG_NEUTRAL_COMPARE_SUBTITLE });
  });

  it("authored copy has no em dashes", () => {
    expect(OG_PLATONIC_SUMMARY).not.toMatch(/—/);
    expect(OG_NEUTRAL_COMPARE_SUBTITLE).not.toMatch(/—/);
  });
});

describe("buildOgCompareCard — no scores, no romantic read, no PII, for every relationType", () => {
  const basePayload: CompareSharePayload = {
    nameA: "Ada",
    nameB: "Sam",
    relationType: "friends",
    pairHasMinor: false,
    chartA: chart({ asc: "Leo" }),
    chartB: chart({ asc: "Virgo" }),
    synastry: {
      // Deliberately populated so a leak would be caught — buildOgCompareCard
      // must never read any of this.
      scores: { overall: 91, warmth: 88, emotional: 5, communication: 12, values: 3, stability: 77 },
      aspects: [{ from: "sun", to: "moon", type: "trine", orb: 1.1, harmony: 1 }],
    },
    generational: { theme: "A shared generational sky.", shared: [], diverged: [] },
  };

  it.each(ALL_RELATION_TYPES)("relationType=%s — no PII keys, no score values, correct romantic gating", (relationType) => {
    const payload: CompareSharePayload = { ...basePayload, relationType };
    const card = buildOgCompareCard(payload, RELATION_HEADLINE);

    assertNoForbiddenKeys(card);

    const serialized = JSON.stringify(card);
    // None of the populated score numbers/keys ever appear in the card.
    expect(serialized).not.toMatch(/\b91\b|\b88\b|"warmth"|"overall"|"communication"|"stability"/);

    if (isRomanticRelation(relationType)) {
      expect(card.summary).toEqual({ kind: "neutral", text: OG_NEUTRAL_COMPARE_SUBTITLE });
    } else {
      expect(card.summary.kind).toBe("relationship");
      expect(card.summary.text).not.toBe("");
    }
  });

  it("carries only names + big-three signs per person, never a chart/placements/synastry object", () => {
    const card = buildOgCompareCard(basePayload, RELATION_HEADLINE) as unknown as Record<string, unknown>;
    expect(card).not.toHaveProperty("chartA");
    expect(card).not.toHaveProperty("chartB");
    expect(card).not.toHaveProperty("synastry");
    expect(card.personA).toEqual({ name: "Ada", bigThree: { sun: "Aries", moon: "Scorpio", rising: "Leo" } });
    expect(card.personB).toEqual({ name: "Sam", bigThree: { sun: "Aries", moon: "Scorpio", rising: "Virgo" } });
  });

  it("snaps a bad romantic+minor row to platonic framing before building the card (defense in depth) — the snapped type is not romantic, so it gets the platonic summary, never the raw romantic read", () => {
    const card = buildOgCompareCard(
      { ...basePayload, relationType: "romantic", pairHasMinor: true },
      RELATION_HEADLINE
    );
    expect(card.relationType).toBe("platonic");
    expect(card.summary).toEqual({ kind: "relationship", text: OG_PLATONIC_SUMMARY });
  });

  it("omits rising for whichever person's chart has no asc, independent of the other person", () => {
    const card = buildOgCompareCard(
      { ...basePayload, chartA: chart(), chartB: chart({ asc: "Virgo" }) },
      RELATION_HEADLINE
    );
    expect(card.personA.bigThree.rising).toBeUndefined();
    expect(card.personB.bigThree.rising).toBe("Virgo");
  });
});

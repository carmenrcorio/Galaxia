import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ADJUST_BADGE,
  ADJUST_OPENER,
  ADJUST_TACTIC,
  ADJUST_TACTIC_PREFIX,
  ASPECT_NATURE,
  aspectDefinition,
  aspectGroup,
  aspectActionParts,
  computeNatalChart,
  computeSynastry,
  computeTransits,
  interpretAspect,
  interpretSynastryAspect,
  isQuincunx,
  MAJOR_ASPECT_TYPES,
  selectCompareAspectRows,
  selectNatalAspectReadings,
  type AspectType,
  type BodyName,
  type NatalChart,
} from "../src/index";

const MAJOR_DEFS: Record<Exclude<AspectType, "quincunx">, { angle: number; orb: number; harmony: number }> = {
  conjunction: { angle: 0, orb: 8, harmony: 0.6 },
  sextile: { angle: 60, orb: 4, harmony: 1.3 },
  square: { angle: 90, orb: 6, harmony: -1.2 },
  trine: { angle: 120, orb: 6, harmony: 1.7 },
  opposition: { angle: 180, orb: 8, harmony: -1.1 },
};

function singleBodyChart(body: BodyName, lon: number, lonSpeedDegPerDay = 1): NatalChart {
  return {
    placements: [
      {
        body,
        lon,
        sign: "Aries",
        degree: lon % 30,
        retro: lonSpeedDegPerDay < 0,
        lonSpeedDegPerDay,
        confident: true,
      },
    ],
    precision: "exact",
    generational: computeNatalChart({
      dateUTC: "1990-06-15T12:00:00Z",
      precision: "exact",
      lat: 40.7128,
      lng: -74.006,
    }).generational,
  };
}

describe("quincunx engine", () => {
  it("keeps the five major defs unchanged", () => {
    for (const type of MAJOR_ASPECT_TYPES) {
      expect(aspectDefinition(type)).toEqual(MAJOR_DEFS[type]);
    }
  });

  it("computes quincunx at 150° with a 2.5° orb", () => {
    expect(aspectDefinition("quincunx")).toEqual({ angle: 150, orb: 2.5, harmony: -0.3 });
    const syn = computeSynastry(singleBodyChart("sun", 0), singleBodyChart("moon", 150.4));
    expect(syn.aspects).toHaveLength(1);
    expect(syn.aspects[0]!.type).toBe("quincunx");
    expect(syn.aspects[0]!.orb).toBeCloseTo(0.4, 5);
    expect(isQuincunx(syn.aspects[0]!.type)).toBe(true);
  });

  it("rejects a 150° pair outside the 2.5° orb", () => {
    const syn = computeSynastry(singleBodyChart("sun", 0), singleBodyChart("moon", 153));
    expect(syn.aspects.filter((a) => a.type === "quincunx")).toHaveLength(0);
  });

  it("attaches applying/separating from longitude speed", () => {
    const applying = computeSynastry(
      singleBodyChart("sun", 0, 1),
      singleBodyChart("moon", 152, 0)
    ).aspects[0];
    expect(applying?.type).toBe("quincunx");
    expect(applying?.phase).toBe("applying");

    const separating = computeSynastry(
      singleBodyChart("sun", 0, 1),
      singleBodyChart("moon", 148, 0)
    ).aspects[0];
    expect(separating?.type).toBe("quincunx");
    expect(separating?.phase).toBe("separating");
  });

  it("does not change synastry scores when a scoring-domain quincunx is present", () => {
    const withQx = computeSynastry(singleBodyChart("sun", 0), singleBodyChart("moon", 150));
    expect(withQx.aspects.some((a) => a.type === "quincunx")).toBe(true);
    expect(withQx.scores).toEqual({
      overall: 50,
      emotional: 50,
      communication: 50,
      warmth: 50,
      values: 50,
      stability: 50,
    });
  });

  it("locks the 1993-1994 and Little Rock pair scores after adding quincunx", () => {
    // These numbers include Chiron major aspects (now on main). Quincunx is
    // still omitted from the sums; changing these without a Chiron-or-scoring
    // change means quincunx leaked into scoring.
    const pairA = computeSynastry(
      computeNatalChart({ dateUTC: "1993-04-10T13:45:00.000Z", precision: "exact", lat: 40.7128, lng: -74.006 }),
      computeNatalChart({ dateUTC: "1994-11-20T09:15:00.000Z", precision: "exact", lat: 34.0522, lng: -118.2437 })
    );
    expect(pairA.scores).toEqual({
      overall: 56,
      emotional: 47,
      communication: 60,
      warmth: 61,
      values: 63,
      stability: 51,
    });

    const pairB = computeSynastry(
      computeNatalChart({
        dateUTC: "1987-12-29T06:00:00.000Z",
        precision: "exact",
        lat: 34.8659,
        lng: -92.1099,
        tzOffsetMin: -360,
      }),
      computeNatalChart({ dateUTC: "1994-11-20T09:15:00.000Z", precision: "exact", lat: 34.0522, lng: -118.2437 })
    );
    expect(pairB.scores).toEqual({
      overall: 51,
      emotional: 39,
      communication: 45,
      warmth: 66,
      values: 44,
      stability: 62,
    });
  });

  it("never emits quincunx from computeTransits", () => {
    const natal = computeNatalChart({
      dateUTC: "1993-04-10T13:45:00.000Z",
      precision: "date",
    });
    const hits = computeTransits(natal, "2026-06-29T12:00:00.000Z");
    expect(hits.some((h) => h.type === "quincunx")).toBe(false);
    expect(hits.length).toBeGreaterThan(0);
  });
});

describe("quincunx copy and grouping", () => {
  it("uses the approved nature line and never authors a natal pair cell", () => {
    expect(ASPECT_NATURE.quincunx.tone).toBe("adjust");
    expect(ASPECT_NATURE.quincunx.short).toBe("a persistent mismatch that will not resolve by force");
    expect(ASPECT_NATURE.quincunx.long).toContain("Name the gap, then change the approach, not the person.");
    expect(interpretAspect("sun", "moon", "quincunx")).toBeNull();
    expect(interpretSynastryAspect("sun", "moon", "quincunx").short).toBe(ASPECT_NATURE.quincunx.short);
  });

  it("classifies as adjusts, not catches, despite negative harmony", () => {
    const a = { from: "sun", to: "moon", type: "quincunx", harmony: -0.3 };
    expect(aspectGroup(a)).toBe("adjusts");
    const parts = aspectActionParts(a, "friends");
    expect(parts.adjusts).toBe(true);
    expect(parts.flows).toBe(false);
    expect(parts.group).toBe("adjusts");
    expect(parts.opener).toBe(ADJUST_OPENER);
    expect(parts.tactic).toBe(ADJUST_TACTIC);
    expect(ADJUST_BADGE).toBe("~ adjusts");
    expect(ADJUST_TACTIC_PREFIX).toBe("Adjust it:");
  });

  it("keeps a square in the catch branch", () => {
    const parts = aspectActionParts({ from: "sun", to: "moon", type: "square", harmony: -1.2 }, "friends");
    expect(parts.group).toBe("catches");
    expect(parts.adjusts).toBe(false);
  });

  it("surfaces quincunx rows even when six tighter majors exist", () => {
    const rows = selectCompareAspectRows(
      [
        { from: "sun", to: "moon", type: "trine", orb: 0.1, harmony: 1.5 },
        { from: "venus", to: "mars", type: "sextile", orb: 0.2, harmony: 1.2 },
        { from: "mercury", to: "jupiter", type: "conjunction", orb: 0.3, harmony: 0.5 },
        { from: "sun", to: "venus", type: "trine", orb: 0.4, harmony: 1.4 },
        { from: "moon", to: "venus", type: "sextile", orb: 0.5, harmony: 1.1 },
        { from: "mars", to: "jupiter", type: "trine", orb: 0.6, harmony: 1.3 },
        { from: "sun", to: "saturn", type: "quincunx", orb: 1.1, harmony: -0.3 },
      ],
      "friends",
      6
    );
    expect(rows.filter((r) => r.type !== "quincunx")).toHaveLength(6);
    expect(rows.some((r) => r.type === "quincunx")).toBe(true);
  });

  it("does not put quincunx in natal Key aspects readings", () => {
    const syn = computeSynastry(singleBodyChart("sun", 0), singleBodyChart("moon", 150));
    expect(selectNatalAspectReadings(syn.aspects)).toHaveLength(0);
  });

  it("does not add quincunx to Vela allowed types", () => {
    const vela = readFileSync(resolve(__dirname, "../../vela/src/index.ts"), "utf8");
    const chat = readFileSync(resolve(__dirname, "../../../supabase/functions/vela-chat/index.ts"), "utf8");
    expect(vela).toContain('"conjunction"');
    expect(vela).toContain('"opposition"');
    expect(vela).not.toMatch(/VELA_CITATION_ASPECTS[\s\S]{0,200}quincunx/);
    expect(chat).not.toMatch(/"conjunction", "sextile", "square", "trine", "opposition", "quincunx"/);
    expect(chat).not.toMatch(/angle: 150/);
  });

  it("has no em dash in new copy", () => {
    const em = "\u2014";
    for (const text of [
      ASPECT_NATURE.quincunx.short,
      ASPECT_NATURE.quincunx.long,
      ADJUST_BADGE,
      ADJUST_OPENER,
      ADJUST_TACTIC,
      ADJUST_TACTIC_PREFIX,
    ]) {
      expect(text.includes(em)).toBe(false);
    }
  });
});

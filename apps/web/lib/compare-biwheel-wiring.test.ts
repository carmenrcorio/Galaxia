import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { orientSynastryWheel, type WheelAspect } from "../components/chart-wheel";
import type { NatalChart } from "@galaxia/astro";

function stubChart(label: string): NatalChart {
  // Minimal chart stub for wheel orientation only — not a full engine result.
  return {
    placements: [{ body: "sun", lon: 10, sign: "Aries", degree: 10, retro: false, confident: true }],
    precision: "exact",
    generational: {
      pluto: { sign: "Capricorn", confident: true },
      neptune: { sign: "Aquarius", confident: true },
      uranus: { sign: "Capricorn", confident: true },
      cohortLabel: label,
    },
    cusps: Array.from({ length: 12 }, (_, i) => i * 30),
    // Distinguish A vs B without relying on object identity alone.
    houseSystem: label === "A" ? "placidus" : "whole-sign",
  } as NatalChart;
}

const ASPECTS: WheelAspect[] = [
  { from: "sun", to: "moon", type: "square", orb: 0.5, harmony: -1 },
];

describe("orientSynastryWheel — self owns house frame", () => {
  it("keeps picker A as inner when A is self", () => {
    const chartA = stubChart("A");
    const chartB = stubChart("B");
    const oriented = orientSynastryWheel(
      { relation: "self" },
      { relation: "child" },
      chartA,
      chartB,
      ASPECTS
    );
    expect(oriented.chart).toBe(chartA);
    expect(oriented.overlayChart).toBe(chartB);
    expect(oriented.aspects[0]).toEqual(ASPECTS[0]);
  });

  it("swaps when B is self so self is inner A, and flips aspect from/to", () => {
    const chartA = stubChart("A");
    const chartB = stubChart("B");
    const oriented = orientSynastryWheel(
      { relation: "parent" },
      { relation: "self" },
      chartA,
      chartB,
      ASPECTS
    );
    expect(oriented.chart).toBe(chartB);
    expect(oriented.overlayChart).toBe(chartA);
    expect(oriented.aspects[0]).toEqual({
      from: "moon",
      to: "sun",
      type: "square",
      orb: 0.5,
      harmony: -1,
    });
  });

  it("keeps picker order when neither is self", () => {
    const chartA = stubChart("A");
    const chartB = stubChart("B");
    const oriented = orientSynastryWheel(
      { relation: "friend" },
      { relation: "friend" },
      chartA,
      chartB,
      ASPECTS
    );
    expect(oriented.chart).toBe(chartA);
    expect(oriented.overlayChart).toBe(chartB);
  });
});

describe("source wiring — compare bi-wheel + shared flows/catches", () => {
  it("ChartWheel accepts overlayChart + aspects without recomputing overlay", () => {
    const src = readFileSync(resolve(__dirname, "../components/chart-wheel.tsx"), "utf8");
    expect(src).toContain("overlayChart?: NatalChart");
    expect(src).toContain("aspects?: WheelAspect[]");
    expect(src).toContain("orientSynastryWheel");
    // Overlay path must not call computeSynastry — only natal fallback may.
    const overlayBlock = src.slice(src.indexOf("if (isOverlay)"), src.indexOf("if (!natalPrecisionOk)"));
    expect(overlayBlock).not.toContain("computeSynastry");
  });

  it("FlowsAndCatchesSection has closed-by-default aspect detail disclosure", () => {
    const src = readFileSync(
      resolve(__dirname, "../components/flows-and-catches-section.tsx"),
      "utf8"
    );
    expect(src).toContain("Show aspect detail");
    expect(src).toContain("Hide aspect detail");
    expect(src).toContain("useState(false)");
    // Full RelationType focus — not romantic/platonic-only.
    expect(src).toMatch(/sortAspectsForFocus\([\s\S]*relationType\s*\)/);
  });

  it("/app/compare uses shared FlowsAndCatchesSection and bi-wheel (no inline aspect table)", () => {
    const src = readFileSync(resolve(__dirname, "../app/app/compare/page.tsx"), "utf8");
    expect(src).toContain("FlowsAndCatchesSection");
    expect(src).toContain("orientSynastryWheel");
    expect(src).toContain("overlayChart={wheel.overlayChart}");
    expect(src).not.toContain("orderedAspects");
    expect(src).not.toContain("relationshipAspectFraming");
    expect(src).not.toContain("aspect-tight");
  });

  it("/chart/compare and /s mount overlay ChartWheel with passed aspects", () => {
    const quick = readFileSync(resolve(__dirname, "../app/chart/compare/page.tsx"), "utf8");
    const share = readFileSync(resolve(__dirname, "../components/share-snapshot-view.tsx"), "utf8");
    expect(quick).toContain("overlayChart={result.chartB}");
    expect(quick).toContain("aspects={result.synastry.aspects}");
    expect(share).toContain("overlayChart={payload.chartB}");
    expect(share).toContain("aspects={payload.synastry.aspects}");
    expect(share).toContain("FlowsAndCatchesSection");
  });
});

describe("revival: relationshipAspectFraming() text-only inside FlowsAndCatchesSection", () => {
  it("the shared component calls relationshipAspectFraming and renders f.text, but never f.action", () => {
    const src = readFileSync(
      resolve(__dirname, "../components/flows-and-catches-section.tsx"),
      "utf8"
    );
    expect(src).toContain("relationshipAspectFraming");
    expect(src).toContain("f.text");
    // `f.action` is the exact opener+tactic pair the rows above already render
    // via aspectActionParts — rendering it again would be word-for-word
    // repetition, which is the specific thing this revival must not reintroduce.
    expect(src).not.toContain("f.action");
  });

  it("/app/compare does NOT import relationshipAspectFraming directly (it stays inside the shared component)", () => {
    const src = readFileSync(resolve(__dirname, "../app/app/compare/page.tsx"), "utf8");
    expect(src).not.toContain("relationshipAspectFraming");
  });

  it("all three Compare surfaces pass real nameA/nameB into the shared component", () => {
    const appCompare = readFileSync(resolve(__dirname, "../app/app/compare/page.tsx"), "utf8");
    const quickCompare = readFileSync(resolve(__dirname, "../app/chart/compare/page.tsx"), "utf8");
    const share = readFileSync(resolve(__dirname, "../components/share-snapshot-view.tsx"), "utf8");
    for (const src of [appCompare, quickCompare, share]) {
      expect(src).toMatch(/FlowsAndCatchesSection[\s\S]*?nameA=/);
      expect(src).toMatch(/FlowsAndCatchesSection[\s\S]*?nameB=/);
    }
  });
});

describe("image export minor gate: every compare surface passes an isMinorForSafety-derived boolean, never a raw column", () => {
  it("/app/compare threads pairHasMinor (built from minorOf/isMinorForSafety) into ShareExportCard's minorBlocked", () => {
    const src = readFileSync(resolve(__dirname, "../app/app/compare/page.tsx"), "utf8");
    expect(src).toContain("ShareExportCard");
    expect(src).toMatch(/ShareExportCard[\s\S]*?minorBlocked=\{pairHasMinor\}/);
    expect(src).toMatch(/function minorOf[\s\S]*?isMinorForSafety/);
  });

  it("/chart/compare threads pairHasMinor (from the isMinorForSafety-backed API) into ShareExportCard's minorBlocked", () => {
    const src = readFileSync(resolve(__dirname, "../app/chart/compare/page.tsx"), "utf8");
    expect(src).toContain("ShareExportCard");
    expect(src).toMatch(/ShareExportCard[\s\S]*?minorBlocked=\{pairHasMinor\}/);
    expect(src).toContain("Boolean(result?.pairHasMinor)");
  });

  it("/s/[token] compare threads payload.pairHasMinor (stored via isMinorForSafety, never re-derived) into ShareExportCard's minorBlocked", () => {
    const src = readFileSync(resolve(__dirname, "../components/share-snapshot-view.tsx"), "utf8");
    expect(src).toContain("ShareExportCard");
    expect(src).toMatch(/ShareExportCard[\s\S]*?minorBlocked=\{payload\.pairHasMinor\}/);
  });

  it("the quick-compare API that ultimately feeds all three surfaces computes pairHasMinor via isMinorForSafety", () => {
    const src = readFileSync(resolve(__dirname, "../app/api/quick-compare/route.ts"), "utf8");
    expect(src).toContain("isMinorForSafety");
    expect(src).toMatch(/pairHasMinor\s*=[\s\S]*?isMinorForSafety/);
  });
});

describe("1B: web shares one compareHeadline() helper with mobile (no drift) — web half", () => {
  it("web /app/compare calls the shared compareHeadline helper, not an inline score ternary", () => {
    const src = readFileSync(resolve(__dirname, "../app/app/compare/page.tsx"), "utf8");
    expect(src).toContain("compareHeadline(relationType, result.synastry.scores.overall)");
    expect(src).not.toContain("High flow — momentum comes naturally here.");
  });
});

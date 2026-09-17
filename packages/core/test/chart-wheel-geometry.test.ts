import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ASPECT_GLYPH,
  BODY_GLYPH,
  COMPARE_WHEEL_NEEDS_HOUSES,
  OVERLAY_ASPECTS_MISSING_NOTE,
  SIGN_GLYPH,
  SIGNS_ORDER,
  WHEEL_CLUSTER_PROXIMITY_DEG,
  WHEEL_CLUSTER_STEP_A,
  WHEEL_CLUSTER_STEP_B,
  WHEEL_CX,
  WHEEL_CY,
  WHEEL_LINE_COLOR,
  WHEEL_R_HOUSE_GL,
  WHEEL_R_INNER,
  WHEEL_R_OUT,
  WHEEL_R_PLANET,
  WHEEL_R_PLANET_A,
  WHEEL_R_PLANET_B,
  WHEEL_R_SIGN_GL,
  WHEEL_R_SIGN_IN,
  WHEEL_SIZE,
  YEAR_ASPECTS_NEED_DATE_NOTE,
  clusteredOffsets,
  layoutChartWheel,
  orientSynastryWheel,
  signElement,
  svgAngle,
  wheelPoint,
  type WheelAspect,
  type WheelChartLike,
} from "../src/index";

const webWheel = readFileSync(
  resolve(__dirname, "../../../apps/web/components/chart-wheel.tsx"),
  "utf8",
);

function stubChart(overrides: Partial<WheelChartLike> = {}): WheelChartLike {
  return {
    placements: [{ body: "sun", lon: 0, sign: "Aries", confident: true }],
    precision: "exact",
    cusps: Array.from({ length: 12 }, (_, i) => i * 30),
    mc: "Capricorn",
    ...overrides,
  };
}

describe("glyphs", () => {
  it("covers the twelve signs and ten bodies (plus lower-case engine keys)", () => {
    expect(Object.keys(SIGN_GLYPH)).toHaveLength(12);
    expect(SIGN_GLYPH.Aries).toBe("\u2648");
    expect(SIGN_GLYPH.Pisces).toBe("\u2653");
    expect(BODY_GLYPH.Sun).toBe("\u2609");
    expect(BODY_GLYPH.sun).toBe("\u2609");
    expect(BODY_GLYPH.pluto).toBe("\u2647");
    expect(ASPECT_GLYPH.trine).toBe("\u25B3");
    expect(signElement("Aries")).toBe("fire");
    expect(signElement("not-a-sign")).toBe("water");
  });
});

describe("wheel constants lock to the web ChartWheel layer table", () => {
  it("keeps the 300 viewBox and ring radii", () => {
    expect(WHEEL_SIZE).toBe(300);
    expect(WHEEL_CX).toBe(150);
    expect(WHEEL_CY).toBe(150);
    expect(WHEEL_R_OUT).toBe(140);
    expect(WHEEL_R_SIGN_IN).toBe(112);
    expect(WHEEL_R_SIGN_GL).toBe(126);
    expect(WHEEL_R_HOUSE_GL).toBe(99);
    expect(WHEEL_R_INNER).toBe(62);
    expect(WHEEL_R_PLANET).toBe(84);
    expect(WHEEL_R_PLANET_A).toBe(72);
    expect(WHEEL_R_PLANET_B).toBe(96);
    expect(WHEEL_LINE_COLOR).toBe("rgba(230,174,108,.13)");
    expect(WHEEL_CLUSTER_PROXIMITY_DEG).toBe(16);
    expect(WHEEL_CLUSTER_STEP_A).toBe(12);
    expect(WHEEL_CLUSTER_STEP_B).toBe(10);
    expect([...SIGNS_ORDER]).toEqual([
      "Aries",
      "Taurus",
      "Gemini",
      "Cancer",
      "Leo",
      "Virgo",
      "Libra",
      "Scorpio",
      "Sagittarius",
      "Capricorn",
      "Aquarius",
      "Pisces",
    ]);
  });

  it("web ChartWheel paints layoutChartWheel instead of a second angle table", () => {
    expect(webWheel).toContain("layoutChartWheel");
    expect(webWheel).toContain("orientSynastryWheel");
    expect(webWheel).toContain("COMPARE_WHEEL_NEEDS_HOUSES");
    expect(webWheel).toContain("OVERLAY_ASPECTS_MISSING_NOTE");
    expect(webWheel).toContain("YEAR_ASPECTS_NEED_DATE_NOTE");
  });
});

describe("svgAngle + ASC at nine o'clock", () => {
  it("pins ASC at 180 and Aries-at-0 without houses at 270", () => {
    expect(svgAngle(40, 40)).toBe(180);
    expect(svgAngle(0, null)).toBe(270);
    const [x, y] = wheelPoint(WHEEL_R_OUT, 180);
    expect(x).toBeCloseTo(10, 5);
    expect(y).toBeCloseTo(150, 5);
  });
});

describe("cluster wrap", () => {
  it("joins planets across 0° when the wrap gap is under 16°", () => {
    const offsets = clusteredOffsets(
      [
        { body: "sun", lon: 2, sign: "Aries" },
        { body: "moon", lon: 358, sign: "Pisces" },
      ].sort((a, b) => a.lon - b.lon),
      16,
      12,
    );
    expect(offsets.get("moon")).toBe(0);
    expect(offsets.get("sun")).toBe(-12);
  });
});

describe("orientSynastryWheel", () => {
  it("flips when B is self so self owns the inner frame", () => {
    const chartA = stubChart({ mc: "A" });
    const chartB = stubChart({ mc: "B" });
    const aspects: WheelAspect[] = [{ from: "sun", to: "moon", type: "square", orb: 0.5, harmony: -1 }];
    const oriented = orientSynastryWheel({ relation: "parent" }, { relation: "self" }, chartA, chartB, aspects);
    expect(oriented.chart).toBe(chartB);
    expect(oriented.overlayChart).toBe(chartA);
    expect(oriented.aspects[0]?.from).toBe("moon");
  });
});

describe("layoutChartWheel", () => {
  it("places a sun on the ASC at the inner planet ring", () => {
    const layout = layoutChartWheel({ chart: stubChart() });
    const sun = layout.planets.find((p) => p.key === "a-sun");
    expect(sun).toBeTruthy();
    expect(sun!.px).toBeCloseTo(WHEEL_CX - WHEEL_R_PLANET, 5);
    expect(sun!.py).toBeCloseTo(WHEEL_CY, 5);
    expect(sun!.strokeToken).toBe("fire");
    expect(layout.hasHouses).toBe(true);
    expect(layout.houses).toHaveLength(12);
    expect(layout.ascLabel?.anchor).toBe("start");
    expect(layout.mcLabel).toBeTruthy();
  });

  it("draws overlay A/B keys and lines from the 72 ring to the 96 ring", () => {
    const inner = stubChart();
    const outer = stubChart({
      placements: [{ body: "moon", lon: 90, sign: "Cancer", confident: true }],
    });
    const layout = layoutChartWheel({
      chart: inner,
      overlayChart: outer,
      aspects: [{ from: "sun", to: "moon", type: "square", orb: 1, harmony: -1 }],
    });
    expect(layout.planets.map((p) => p.key)).toEqual(["a-sun", "b-moon"]);
    expect(layout.aspectLines).toHaveLength(1);
    expect(layout.aspectLines[0]!.x0).toBeCloseTo(WHEEL_CX - WHEEL_R_PLANET_A, 5);
    expect(layout.aspectLines[0]!.strokeToken).toBe("rose");
    expect(layout.planets[1]!.strokeToken).toBe("teal");
  });

  it("year precision is a loud empty center", () => {
    const layout = layoutChartWheel({
      chart: stubChart({ precision: "year", cusps: undefined, mc: null }),
      aspects: [{ from: "sun", to: "moon", type: "square", orb: 1, harmony: -1 }],
    });
    expect(layout.aspectLines).toHaveLength(0);
    expect(layout.showYearNote).toBe(true);
    expect(YEAR_ASPECTS_NEED_DATE_NOTE).toMatch(/birth date/);
  });

  it("overlay without aspects is loud, not a silent void", () => {
    const layout = layoutChartWheel({
      chart: stubChart(),
      overlayChart: stubChart(),
    });
    expect(layout.overlayMissingAspects).toBe(true);
    expect(layout.aspectLines).toHaveLength(0);
    expect(OVERLAY_ASPECTS_MISSING_NOTE).toMatch(/compare aspects/);
    expect(COMPARE_WHEEL_NEEDS_HOUSES).toMatch(/birth time and city/);
  });

  it("person-page aspects are drawn exactly (no orb slice)", () => {
    const chart = stubChart({
      placements: [
        { body: "sun", lon: 0, sign: "Aries", confident: true },
        { body: "moon", lon: 90, sign: "Cancer", confident: true },
      ],
    });
    const layout = layoutChartWheel({
      chart,
      aspects: [{ from: "sun", to: "moon", type: "square", orb: 8, harmony: -1 }],
    });
    expect(layout.aspectLines).toHaveLength(1);
  });
});

import { describe, expect, it } from "vitest";
import { computeNatalChart } from "../src/index";

/**
 * Planet-to-house ASSIGNMENT tests.
 *
 * The astronomy these lean on (cusp longitudes, planet longitudes) is verified
 * against external ground truth in placidus-external-ground-truth.test.ts and
 * natal-synastry-transits.test.ts. This suite locks the separate step the
 * person page depends on: mapping each planet's ecliptic longitude into the
 * house whose cusp arc contains it. A wraparound bug at 0°/360°, or reading the
 * wrong cusp array, would leave houses looking empty on the profile — exactly
 * the failure this guards against.
 *
 * Birth: 1987-12-29, 22:30 CST, Little Rock, Arkansas (Ascendant 16° Virgo).
 */
const EXACT = {
  dateUTC: "1987-12-30T04:30:00.000Z",
  precision: "exact" as const,
  lat: 34.7465,
  lng: -92.2896,
  tzOffsetMin: -360,
  houseSystem: "placidus" as const
};

/** Independent, wraparound-aware house-of-longitude, recomputed in the test. */
function houseContaining(lon: number, cusps: number[]): number {
  const norm = ((lon % 360) + 360) % 360;
  for (let i = 0; i < 12; i += 1) {
    const start = cusps[i]!;
    const end = cusps[(i + 1) % 12]!;
    if (start < end) {
      if (norm >= start && norm < end) return i + 1;
    } else if (norm >= start || norm < end) {
      return i + 1;
    }
  }
  return -1;
}

describe("planet-to-house assignment (exact chart)", () => {
  const chart = computeNatalChart(EXACT);

  it("gives every planet a concrete house 1–12", () => {
    expect(chart.cusps).toHaveLength(12);
    for (const p of chart.placements) {
      expect(typeof p.house).toBe("number");
      expect(p.house).toBeGreaterThanOrEqual(1);
      expect(p.house).toBeLessThanOrEqual(12);
    }
  });

  it("distributes planets across multiple houses — not all in one, never all empty", () => {
    const occupied = new Set(chart.placements.map((p) => p.house));
    // An exact-time chart must populate houses. All-in-house-1 was the shape a
    // wraparound fallback (`return 1`) would produce; all-undefined was the
    // shape a missing assignment would produce. Both are excluded here.
    expect(occupied.size).toBeGreaterThan(1);
    expect(occupied.has(undefined)).toBe(false);
  });

  it("places each planet in the house whose cusp arc actually contains it", () => {
    for (const p of chart.placements) {
      expect(p.house).toBe(houseContaining(p.lon, chart.cusps!));
    }
  });

  it("assigns a planet sitting just past the Ascendant to the 1st house (0°/360° wraparound)", () => {
    // Synthetic longitude 0.5° past the Ascendant cusp — the exact spot a naive
    // start<end comparison mishandles when the 1st house straddles 0° Aries.
    const asc = chart.cusps![0]!;
    const justInside = ((asc + 0.5) % 360 + 360) % 360;
    expect(houseContaining(justInside, chart.cusps!)).toBe(1);
    const justBefore = ((asc - 0.5) % 360 + 360) % 360;
    expect(houseContaining(justBefore, chart.cusps!)).toBe(12);
  });
});

describe("no-time charts hedge — houses are never fabricated", () => {
  it("date-only precision (no birth time/place) yields no cusps and no planet houses", () => {
    const chart = computeNatalChart({ dateUTC: "1987-12-29T00:00:00.000Z", precision: "date" });
    expect(chart.cusps).toBeUndefined();
    expect(chart.asc).toBeUndefined();
    for (const p of chart.placements) expect(p.house).toBeUndefined();
  });

  it("exact precision but no location yields no cusps and no planet houses", () => {
    // §12: we never invent houses. Without lat/lng the Ascendant is undefined,
    // so every planet's house must stay undefined rather than default to a guess.
    const chart = computeNatalChart({ dateUTC: "1987-12-30T04:30:00.000Z", precision: "exact" });
    expect(chart.cusps).toBeUndefined();
    for (const p of chart.placements) expect(p.house).toBeUndefined();
  });
});

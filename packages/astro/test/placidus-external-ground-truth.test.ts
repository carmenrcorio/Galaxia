import { describe, expect, it } from "vitest";
import { computeNatalChart } from "../src/index";

/**
 * EXTERNAL GROUND TRUTH — do not replace these values with engine output.
 *
 * A previous engine bug (heliocentric coordinates) passed its own tests because
 * they tested the engine's own wrong answer. These expected values come from
 * Cafe Astrology's published Placidus chart for this birth and must never be
 * regenerated from this codebase.
 *
 * Birth: 1987-12-29, 22:30 local time (CST, UTC-6), Little Rock, Arkansas.
 * lat 34.7465, lng -92.2896 → dateUTC 1987-12-30T04:30:00Z.
 */

const dms = (deg: number, min: number, sec = 0): number => deg + min / 60 + sec / 3600;
const signStart: Record<string, number> = {
  Aries: 0, Taurus: 30, Gemini: 60, Cancer: 90, Leo: 120, Virgo: 150,
  Libra: 180, Scorpio: 210, Sagittarius: 240, Capricorn: 270, Aquarius: 300, Pisces: 330
};
const lonIn = (sign: string, deg: number, min: number, sec = 0): number => signStart[sign]! + dms(deg, min, sec);

/** Absolute difference between two zodiac longitudes, degrees, wrap-aware. */
const lonDiff = (a: number, b: number): number => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};

const ARC_MINUTE = 1 / 60;

describe("Placidus cusps vs Cafe Astrology (Little Rock, 1987-12-29 22:30 CST)", () => {
  const chart = computeNatalChart({
    dateUTC: "1987-12-30T04:30:00.000Z",
    precision: "exact",
    lat: 34.7465,
    lng: -92.2896,
    tzOffsetMin: -360,
    houseSystem: "placidus"
  });

  it("computes and labels Placidus, with no fallback", () => {
    expect(chart.houseSystem).toBe("placidus");
    expect(chart.houseSystemRequested).toBe("placidus");
    expect(chart.houseSystemFallbackReason).toBeUndefined();
    expect(chart.cusps).toHaveLength(12);
  });

  it("Ascendant ≈ 16°01′50″ Virgo (±1′)", () => {
    expect(chart.asc).toBe("Virgo");
    expect(lonDiff(chart.cusps![0]!, lonIn("Virgo", 16, 1, 50))).toBeLessThan(ARC_MINUTE);
  });

  it("MC ≈ 14°36′ Gemini (±1′)", () => {
    expect(chart.mc).toBe("Gemini");
    expect(lonDiff(chart.cusps![9]!, lonIn("Gemini", 14, 36))).toBeLessThan(ARC_MINUTE);
  });

  it("2nd cusp ≈ 12°03′49″ Libra (±1′)", () => {
    expect(lonDiff(chart.cusps![1]!, lonIn("Libra", 12, 3, 49))).toBeLessThan(ARC_MINUTE);
  });

  it("3rd cusp ≈ 12°03′38″ Scorpio (±1′)", () => {
    expect(lonDiff(chart.cusps![2]!, lonIn("Scorpio", 12, 3, 38))).toBeLessThan(ARC_MINUTE);
  });

  it("5th cusp ≈ 17°21′50″ Capricorn (±1′)", () => {
    expect(lonDiff(chart.cusps![4]!, lonIn("Capricorn", 17, 21, 50))).toBeLessThan(ARC_MINUTE);
  });

  it("6th cusp ≈ 18°12′01″ Aquarius (±1′)", () => {
    expect(lonDiff(chart.cusps![5]!, lonIn("Aquarius", 18, 12, 1))).toBeLessThan(ARC_MINUTE);
  });

  it("cusps are NOT the Equal House signature (every cusp 30° from the last)", () => {
    // The bug being locked out: Equal House shipped under the label "placidus".
    const gaps = Array.from({ length: 12 }, (_, i) =>
      lonDiff(chart.cusps![(i + 1) % 12]!, chart.cusps![i]! + 30)
    );
    expect(gaps.some((g) => g > 0.5)).toBe(true);
  });

  it("derived cusps oppose their partners exactly", () => {
    for (const [a, b] of [[0, 6], [1, 7], [2, 8], [3, 9], [4, 10], [5, 11]] as const) {
      expect(lonDiff(chart.cusps![a]!, chart.cusps![b]! + 180)).toBeLessThan(1e-9);
    }
  });
});

describe("Placidus polar fallback is explicit, never silent", () => {
  it("falls back to Whole Sign above the polar circle and says so", () => {
    // Longyearbyen, Svalbard: 78.22°N — Placidus is undefined here.
    const chart = computeNatalChart({
      dateUTC: "1990-06-15T08:00:00.000Z",
      precision: "exact",
      lat: 78.2232,
      lng: 15.6267,
      tzOffsetMin: 60,
      houseSystem: "placidus"
    });
    expect(chart.houseSystemRequested).toBe("placidus");
    expect(chart.houseSystem).toBe("whole");
    expect(chart.houseSystemFallbackReason).toBeTruthy();
    expect(chart.cusps).toHaveLength(12);
    // Whole sign: every cusp on a sign boundary
    for (const cusp of chart.cusps!) {
      expect(cusp % 30).toBeCloseTo(0, 6);
    }
  });

  it("equal house is available as an explicit choice and labeled as itself", () => {
    const chart = computeNatalChart({
      dateUTC: "1987-12-30T04:30:00.000Z",
      precision: "exact",
      lat: 34.7465,
      lng: -92.2896,
      houseSystem: "equal"
    });
    expect(chart.houseSystem).toBe("equal");
    expect(chart.houseSystemFallbackReason).toBeUndefined();
    // Equal: cusp 1 = Ascendant, every cusp exactly 30° apart
    expect(chart.cusps![0]!).not.toBeCloseTo(Math.floor(chart.cusps![0]! / 30) * 30, 4);
    for (let i = 0; i < 12; i += 1) {
      const gap = (chart.cusps![(i + 1) % 12]! - chart.cusps![i]! + 360) % 360;
      expect(gap).toBeCloseTo(30, 6);
    }
  });
});

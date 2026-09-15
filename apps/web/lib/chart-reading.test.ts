import { interpretPlacement, type SignKey } from "@galaxia/astro";
import { describe, expect, it } from "vitest";
import {
  BODY_LABEL,
  buildChartReading,
  buildFallbackChart,
  buildPersonalizedChart,
  FALLBACK_PUBLISHED_BIRTH,
  hasCompleteBirthData,
  isValidCaptureEmail,
  normalizeCaptureEmail,
  selectReadingPlacements,
  signOf
} from "./chart-reading";

function dateWithUncertainMoon(): { month: number; day: number; year: number } {
  for (let day = 1; day <= 28; day += 1) {
    const chart = buildPersonalizedChart({ month: 4, day, year: 1993 });
    const moon = chart.placements.find((p) => p.body === "moon");
    if (moon && moon.confident === false) return { month: 4, day, year: 1993 };
  }
  throw new Error("could not find a date-only day in April 1993 whose Moon is unconfident");
}

describe("email validation", () => {
  it("accepts a normal address and rejects missing or malformed ones", () => {
    expect(isValidCaptureEmail(normalizeCaptureEmail("  Maya@Galaxia.Mea  "))).toBe(true);
    expect(normalizeCaptureEmail("  Maya@Galaxia.Mea  ")).toBe("maya@galaxia.mea");
    expect(isValidCaptureEmail("")).toBe(false);
    expect(isValidCaptureEmail("not-an-email")).toBe(false);
    expect(isValidCaptureEmail("a@b")).toBe(false);
  });
});

describe("hasCompleteBirthData", () => {
  it("requires month, day, year, and a non-empty city together", () => {
    expect(hasCompleteBirthData({ month: 12, day: 29, year: 1987, birthPlace: "Little Rock" })).toBe(true);
    expect(hasCompleteBirthData({ month: 12, day: 29, year: 1987, birthPlace: "  " })).toBe(false);
    expect(hasCompleteBirthData({ month: 12, day: 29, year: 1987 })).toBe(false);
    expect(hasCompleteBirthData({ birthPlace: "Little Rock" })).toBe(false);
  });
});

describe("selectReadingPlacements", () => {
  it("uses interpretPlacement long verbatim for the published Little Rock chart", () => {
    const chart = buildFallbackChart();
    expect(FALLBACK_PUBLISHED_BIRTH.dateUTC).toBe("1987-12-30T04:30:00.000Z");
    expect(FALLBACK_PUBLISHED_BIRTH.precision).toBe("exact");
    const placements = selectReadingPlacements(chart, false);
    expect(placements.length).toBeGreaterThan(0);
    expect(placements[0]?.body).toBe("moon");
    const moon = placements.find((p) => p.body === "moon");
    const sun = placements.find((p) => p.body === "sun");
    expect(moon).toBeDefined();
    expect(sun).toBeDefined();
    expect(moon?.text).toBe(interpretPlacement("moon", moon!.sign, { minorSafe: false }).long);
    expect(sun?.text).toBe(interpretPlacement("sun", sun!.sign, { minorSafe: false }).long);
    const outer = placements.find((p) => p.body !== "moon" && p.body !== "sun");
    if (outer) {
      expect(outer.text).toBe(interpretPlacement(outer.body, outer.sign, { minorSafe: false }).long);
    }
  });

  it("skips an unconfident Moon on the date-only path and never writes a guess", () => {
    const input = dateWithUncertainMoon();
    const chart = buildPersonalizedChart(input);
    const moon = chart.placements.find((p) => p.body === "moon");
    expect(moon?.confident).toBe(false);
    const placements = selectReadingPlacements(chart, false);
    expect(placements.some((p) => p.body === "moon")).toBe(false);
    const sun = signOf(chart, "sun");
    if (sun) {
      expect(placements[0]?.body).toBe("sun");
      expect(placements[0]?.text).toBe(interpretPlacement("sun", sun as SignKey, { minorSafe: false }).long);
    }
  });
});

describe("buildChartReading", () => {
  it("labels a no-birth-data request as the published sample, not as the reader's chart", () => {
    const reading = buildChartReading({ name: "Maya" });
    expect(reading.sample).toBe(true);
    expect(reading.personName).toBe("Maya");
    expect(reading.sunSign).toBe(signOf(buildFallbackChart(), "sun"));
    expect(reading.moonSign).toBe(signOf(buildFallbackChart(), "moon"));
    expect(reading.emptyNote).toBeNull();
    for (const placement of reading.placements) {
      expect(placement.text).toBe(
        interpretPlacement(placement.body, placement.sign, { minorSafe: false }).long
      );
      expect(BODY_LABEL[placement.body]).toBeTruthy();
    }
  });

  it("computes a date-only chart when date and city are both present", () => {
    const reading = buildChartReading({
      name: "Sam",
      month: 4,
      day: 10,
      year: 1993,
      birthPlace: "New York"
    });
    expect(reading.sample).toBe(false);
    expect(reading.personName).toBe("Sam");
    const chart = buildPersonalizedChart({ month: 4, day: 10, year: 1993 });
    expect(chart.precision).toBe("date");
    expect(chart.asc).toBeUndefined();
    expect(reading.placements.every((p) => p.text.length > 0)).toBe(true);
    for (const placement of reading.placements) {
      const row = chart.placements.find((p) => p.body === placement.body);
      expect(row?.confident).toBe(true);
      expect(placement.text).toBe(
        interpretPlacement(placement.body, placement.sign, { minorSafe: false }).long
      );
    }
  });

  it("rejects an impossible calendar date rather than computing a wrong chart", () => {
    expect(() =>
      buildChartReading({ month: 2, day: 31, year: 1993, birthPlace: "Austin" })
    ).toThrow(/Invalid date/);
  });
});

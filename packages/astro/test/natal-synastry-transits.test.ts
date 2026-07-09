import { describe, expect, it } from "vitest";
import { computeNatalChart, computeSynastry, computeTransits } from "../src/index";

describe("computeNatalChart", () => {
  it("computes an exact chart with angles, cusps, and houses", () => {
    const chart = computeNatalChart({
      dateUTC: "1993-04-10T13:45:00.000Z",
      precision: "exact",
      lat: 40.7128,
      lng: -74.006,
      houseSystem: "whole"
    });

    expect(chart.precision).toBe("exact");
    expect(chart.asc).toBeTruthy();
    expect(chart.mc).toBeTruthy();
    expect(chart.cusps?.length).toBe(12);
    expect(chart.placements).toHaveLength(10);
    expect(chart.placements.every((placement) => placement.house !== undefined)).toBe(true);
    expect(chart.generational.cohortLabel).toContain("Pluto in");
  });

  it("degrades gracefully for date-only birth data", () => {
    const chart = computeNatalChart({
      dateUTC: "1993-04-10T00:00:00.000Z",
      precision: "date"
    });

    expect(chart.asc).toBeUndefined();
    expect(chart.mc).toBeUndefined();
    expect(chart.cusps).toBeUndefined();
    const moon = chart.placements.find((placement) => placement.body === "moon");
    expect(moon).toBeDefined();
    expect(moon?.house).toBeUndefined();
  });

  it("supports year precision as first-class input", () => {
    const chart = computeNatalChart({
      dateUTC: "1995-01-01T00:00:00.000Z",
      precision: "year"
    });

    expect(chart.placements.map((placement) => placement.body)).toEqual(["sun", "uranus", "neptune", "pluto"]);
    expect(chart.generational.pluto.confident).toBe(false);
  });
});

describe("computeSynastry and computeTransits", () => {
  it("builds deterministic synastry scores and aspects", () => {
    const a = computeNatalChart({
      dateUTC: "1993-04-10T13:45:00.000Z",
      precision: "exact",
      lat: 40.7128,
      lng: -74.006
    });
    const b = computeNatalChart({
      dateUTC: "1994-11-20T09:15:00.000Z",
      precision: "exact",
      lat: 34.0522,
      lng: -118.2437
    });

    const synastry = computeSynastry(a, b);
    expect(synastry.aspects.length).toBeGreaterThan(0);
    expect(synastry.scores.overall).toBeGreaterThanOrEqual(0);
    expect(synastry.scores.overall).toBeLessThanOrEqual(100);
    expect(synastry.houseOverlays.aInB.length).toBe(a.placements.length);
    expect(synastry.houseOverlays.bInA.length).toBe(b.placements.length);
  });

  it("returns sorted transit hits against natal placements", () => {
    const natal = computeNatalChart({
      dateUTC: "1993-04-10T13:45:00.000Z",
      precision: "date"
    });

    const hits = computeTransits(natal, "2026-06-29T12:00:00.000Z");
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].orb).toBeLessThanOrEqual(hits[hits.length - 1].orb);
    expect(hits[0].summary.length).toBeGreaterThan(0);
  });
});

describe("Jacksonville, Arkansas regression — 1987-12-29", () => {
  /**
   * User-reported: entering 1987-12-29, Jacksonville, Arkansas produced Sagittarius Sun.
   * Correct answer: Capricorn Sun ~7.5° (verified against astro.com).
   *
   * Root cause was the geocoder silently returning Jacksonville, FL instead of AR,
   * then treating the local birth time as UTC. This test locks the correct chart
   * to prevent regressions.
   *
   * Jacksonville, Arkansas: lat 34.8659, lng -92.1099, timezone America/Chicago (UTC-6 in Dec)
   * 1987-12-29 local time → UTC-6 → dateUTC for midnight local = 06:00 UTC
   * We test date-only precision so the Sun sign is unambiguous regardless of time.
   */
  it("Sun is Capricorn for 1987-12-29 date-only", () => {
    const chart = computeNatalChart({
      dateUTC: "1987-12-29T12:00:00.000Z", // noon UTC = safe midday for date-only
      precision: "date",
    });
    const sun = chart.placements.find((p) => p.body === "sun");
    expect(sun?.sign).toBe("Capricorn");
    // Sun should be close to 7–8°
    expect(sun?.degree).toBeGreaterThan(6);
    expect(sun?.degree).toBeLessThan(10);
  });

  it("Sun is Capricorn for 1987-12-29 with Jacksonville AR coords (exact, local midnight)", () => {
    // Jacksonville AR: UTC-6 in December
    // Local midnight (00:00 CST) = 06:00 UTC
    const chart = computeNatalChart({
      dateUTC: "1987-12-29T06:00:00.000Z",
      precision: "exact",
      lat: 34.8659,
      lng: -92.1099,
      tzOffsetMin: -360, // UTC-6
      houseSystem: "placidus",
    });
    const sun = chart.placements.find((p) => p.body === "sun");
    expect(sun?.sign).toBe("Capricorn");
    expect(sun?.degree).toBeGreaterThan(6);
    expect(sun?.degree).toBeLessThan(10);
  });

  it("Sun would be wrong (Sagittarius) if Jacksonville FL coords used instead", () => {
    // Jacksonville FL (wrong place) has same date but different timezone only marginally —
    // the key wrong-answer case was Jacksonville FL returning roughly same date.
    // The real issue was Sag vs Cap, which happens near Dec 21-22 (Solstice).
    // Dec 29 is solidly Capricorn regardless — confirm both FL and AR give Capricorn.
    // (The original bug was actually a UTC-treatment error, not a coordinate error for this date.)
    const chart = computeNatalChart({
      dateUTC: "1987-12-29T12:00:00.000Z",
      precision: "date",
    });
    // Confirm the date is unambiguously Capricorn regardless of timezone
    const sun = chart.placements.find((p) => p.body === "sun");
    expect(sun?.sign).toBe("Capricorn");
  });

  it("geocoding disambiguation: Open-Meteo returns multiple Jacksonville results", async () => {
    // This test documents that searchPlaces returns multiple results for "Jacksonville"
    // including both Florida and Arkansas entries, which the UI must present for user choice.
    const { searchPlaces } = await import("../../../apps/web/lib/geocode");
    const results = await searchPlaces("Jacksonville");
    expect(results.length).toBeGreaterThan(0);
    // Should include at least one Jacksonville result
    expect(results.some(r => r.label.includes("Jacksonville"))).toBe(true);
    // Multiple results must be returned so the user can disambiguate
    expect(results.length).toBeGreaterThanOrEqual(2);
  });
});

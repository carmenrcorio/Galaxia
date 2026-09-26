import { describe, expect, it } from "vitest";
import { computeNatalChart } from "../src/index";

/**
 * EXTERNAL GROUND TRUTH — published Mercury retrograde windows.
 * Do not replace these dates with engine-derived stations.
 *
 * Mercury was retrograde 13 December 2023 through 1 January 2024
 * (astro.com / Cafe Astrology ephemeris). Mercury was direct on
 * 1 November 2023. The Sun is never retrograde.
 */
describe("natal Placement.retro", () => {
  it("marks Mercury retrograde inside a published Rx window", () => {
    const chart = computeNatalChart({
      dateUTC: "2023-12-22T17:00:00.000Z",
      precision: "exact",
      lat: 40.7128,
      lng: -74.006,
      tzOffsetMin: -300
    });
    const mercury = chart.placements.find((p) => p.body === "mercury");
    const sun = chart.placements.find((p) => p.body === "sun");
    expect(mercury?.retro).toBe(true);
    expect(sun?.retro).toBe(false);
  });

  it("marks Mercury direct outside that window", () => {
    const chart = computeNatalChart({
      dateUTC: "2023-11-01T17:00:00.000Z",
      precision: "exact",
      lat: 40.7128,
      lng: -74.006,
      tzOffsetMin: -240
    });
    const mercury = chart.placements.find((p) => p.body === "mercury");
    expect(mercury?.retro).toBe(false);
  });

  it("never marks the Sun retrograde", () => {
    for (const dateUTC of ["2023-12-22T17:00:00.000Z", "1990-06-15T14:20:00.000Z", "1987-12-30T04:30:00.000Z"]) {
      const chart = computeNatalChart({ dateUTC, precision: "date" });
      expect(chart.placements.find((p) => p.body === "sun")?.retro).toBe(false);
    }
  });
});

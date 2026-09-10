import { describe, expect, it } from "vitest";
import { computeNatalChart } from "../src/index";
import { computeLifespanTransits } from "../src/lifespan-transits";
import { interpretLifespanTransitEvent } from "../src/memorial-timeline-interpretations";

describe("computeLifespanTransits", () => {
  const chart = computeNatalChart({
    dateUTC: "1950-06-15T13:45:00.000Z",
    precision: "exact",
    lat: 40.7128,
    lng: -74.006,
    houseSystem: "whole",
  });
  const birthUTC = "1950-06-15T13:45:00.000Z";
  const deathUTC = "2020-06-15T00:00:00.000Z"; // 70-year lifespan

  it("finds real Saturn returns near ages 29 and 58 (ground truth: ~29.4yr cycle)", () => {
    const events = computeLifespanTransits(chart, birthUTC, deathUTC);
    const returns = events.filter((e) => e.kind === "saturn_return");
    expect(returns.length).toBeGreaterThanOrEqual(2);
    expect(returns.some((e) => e.approxAge >= 27 && e.approxAge <= 31)).toBe(true);
    expect(returns.some((e) => e.approxAge >= 56 && e.approxAge <= 60)).toBe(true);
  });

  it("finds real Jupiter returns roughly every ~12 years", () => {
    const events = computeLifespanTransits(chart, birthUTC, deathUTC);
    const returns = events.filter((e) => e.kind === "jupiter_return");
    // 70 years / ~11.86yr cycle ≈ 5-6 returns.
    expect(returns.length).toBeGreaterThanOrEqual(4);
    expect(returns.some((e) => e.approxAge >= 10 && e.approxAge <= 13)).toBe(true);
  });

  it("finds progressed Moon sign changes roughly every ~2.3-2.5 years", () => {
    const events = computeLifespanTransits(chart, birthUTC, deathUTC);
    const moonChanges = events.filter((e) => e.kind === "progressed_moon_sign_change");
    // 70 years / ~2.3yr per sign ≈ 28-31 changes; allow a wide honest band.
    expect(moonChanges.length).toBeGreaterThan(20);
    expect(moonChanges.length).toBeLessThan(40);
    expect(moonChanges.every((e) => Boolean(e.sign))).toBe(true);
  });

  it("finds at least one outer-planet conjunction to Sun, Moon, or Ascendant", () => {
    const events = computeLifespanTransits(chart, birthUTC, deathUTC);
    const outer = events.filter((e) => e.kind === "outer_conjunction");
    expect(outer.length).toBeGreaterThan(0);
    for (const e of outer) {
      expect(["uranus", "neptune", "pluto"]).toContain(e.transitBody);
      expect(["sun", "moon", "ascendant"]).toContain(e.natalBody);
    }
  });

  it("returns events sorted chronologically", () => {
    const events = computeLifespanTransits(chart, birthUTC, deathUTC);
    const dates = events.map((e) => e.dateUTC);
    const sorted = [...dates].sort();
    expect(dates).toEqual(sorted);
  });

  it("never fabricates from a year-only chart when called without an explicit precision (defaults to 'exact')", () => {
    const yearChart = computeNatalChart({ dateUTC: "1950-01-01T00:00:00.000Z", precision: "year" });
    expect(computeLifespanTransits(yearChart, "1950-01-01T00:00:00.000Z", deathUTC)).toEqual([]);
    // Passing 'exact' explicitly against a year-only chart is the same caller
    // mistake — still no fabrication net, same as the default.
    expect(computeLifespanTransits(yearChart, "1950-01-01T00:00:00.000Z", deathUTC, "exact")).toEqual([]);
  });

  it("'exact' output is byte-identical to before precision existed as a parameter", () => {
    const withDefault = computeLifespanTransits(chart, birthUTC, deathUTC);
    const withExplicitExact = computeLifespanTransits(chart, birthUTC, deathUTC, "exact");
    expect(withExplicitExact).toEqual(withDefault);
    expect(withDefault.length).toBeGreaterThan(0);
    // No new fields leak into exact-mode events — old callers see the exact
    // same shape as before isApproximate/ageEstimate existed.
    for (const event of withDefault) {
      expect(event).not.toHaveProperty("isApproximate");
      expect(event).not.toHaveProperty("ageEstimate");
    }
  });

  describe("precision: 'approximate' (year-only chart)", () => {
    const yearChart = computeNatalChart({ dateUTC: "1950-01-01T00:00:00.000Z", precision: "year" });
    // Caller convention for a year-only chart: the same mid-year "working
    // date" computeNatalChart itself uses for year precision — July 1 of the
    // birth year, noon UTC — never a real birth day.
    const approxBirthUTC = "1950-07-01T12:00:00.000Z";

    it("returns ONLY Saturn and Jupiter returns, each isApproximate with an integer ageEstimate", () => {
      const events = computeLifespanTransits(yearChart, approxBirthUTC, deathUTC, "approximate");
      expect(events.length).toBeGreaterThan(0);
      for (const event of events) {
        expect(["saturn_return", "jupiter_return"]).toContain(event.kind);
        expect(event.isApproximate).toBe(true);
        expect(typeof event.ageEstimate).toBe("number");
        expect(Number.isInteger(event.ageEstimate)).toBe(true);
        expect(event.ageEstimate).toBe(event.approxAge);
      }
      // No progressed Moon, no outer-planet conjunctions, no Sun conjunctions.
      expect(events.some((e) => e.kind === "progressed_moon_sign_change")).toBe(false);
      expect(events.some((e) => e.kind === "outer_conjunction")).toBe(false);
    });

    it("still finds a real Saturn return near age 29 from the mid-year sample", () => {
      const events = computeLifespanTransits(yearChart, approxBirthUTC, deathUTC, "approximate");
      const returns = events.filter((e) => e.kind === "saturn_return");
      expect(returns.length).toBeGreaterThanOrEqual(1);
      expect(returns.some((e) => e.ageEstimate! >= 27 && e.ageEstimate! <= 31)).toBe(true);
    });

    it("returns nothing for an invalid or empty lifespan window even in approximate mode", () => {
      expect(computeLifespanTransits(yearChart, deathUTC, approxBirthUTC, "approximate")).toEqual([]);
      expect(computeLifespanTransits(yearChart, approxBirthUTC, approxBirthUTC, "approximate")).toEqual([]);
    });

    it("every approximate event still has a curated, non-empty reverent interpretation", () => {
      const events = computeLifespanTransits(yearChart, approxBirthUTC, deathUTC, "approximate");
      expect(events.length).toBeGreaterThan(0);
      for (const event of events) {
        const copy = interpretLifespanTransitEvent(event);
        expect(copy.headline.length).toBeGreaterThan(0);
        expect(copy.body.length).toBeGreaterThan(0);
      }
    });
  });

  it("returns nothing for an invalid or empty lifespan window", () => {
    expect(computeLifespanTransits(chart, deathUTC, birthUTC)).toEqual([]); // end before birth
    expect(computeLifespanTransits(chart, birthUTC, birthUTC)).toEqual([]); // zero-length
  });

  it("completes within a reasonable time budget for a long lifespan", () => {
    const start = Date.now();
    computeLifespanTransits(chart, "1930-01-01T00:00:00.000Z", "2025-01-01T00:00:00.000Z");
    expect(Date.now() - start).toBeLessThan(8000);
  });

  it("every event kind has a curated, non-empty reverent interpretation", () => {
    const events = computeLifespanTransits(chart, birthUTC, deathUTC);
    expect(events.length).toBeGreaterThan(0);
    for (const event of events) {
      const copy = interpretLifespanTransitEvent(event);
      expect(copy.headline.length).toBeGreaterThan(0);
      expect(copy.body.length).toBeGreaterThan(0);
    }
  });
});

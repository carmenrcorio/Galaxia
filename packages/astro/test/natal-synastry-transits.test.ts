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

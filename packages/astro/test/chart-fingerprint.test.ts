import { describe, expect, it } from "vitest";
import {
  bodiesWithMovedLongitudes,
  chartPlacementFingerprint,
  computeNatalChart,
  computeSynastry,
  pairChartFingerprint,
  placementsLongitudeChanged,
} from "../src/index";

describe("chartPlacementFingerprint", () => {
  const chart = computeNatalChart({
    dateUTC: "1990-05-04T14:20:00.000Z",
    precision: "exact",
    lat: 41.8781,
    lng: -87.6298,
    tzOffsetMin: -300,
  });

  it("is stable for the same placements", () => {
    expect(chartPlacementFingerprint(chart)).toBe(chartPlacementFingerprint(chart));
  });

  it("ignores house/cusp-only changes", () => {
    const houseOnly = {
      ...chart,
      cusps: chart.cusps?.map((c) => c + 3),
      placements: chart.placements.map((p) => ({ ...p, house: (p.house ?? 1) % 12 + 1 })),
    };
    expect(placementsLongitudeChanged(chart, houseOnly)).toBe(false);
    expect(chartPlacementFingerprint(chart)).toBe(chartPlacementFingerprint(houseOnly));
  });

  it("detects longitude moves", () => {
    const shifted = {
      ...chart,
      placements: chart.placements.map((p) =>
        p.body === "moon" ? { ...p, lon: p.lon + 1.5 } : p
      ),
    };
    expect(placementsLongitudeChanged(chart, shifted)).toBe(true);
    expect(bodiesWithMovedLongitudes(chart, shifted)).toEqual(["moon"]);
  });

  it("pair fingerprint orders low then high", () => {
    const other = computeNatalChart({
      dateUTC: "1988-07-22T16:00:00.000Z",
      precision: "exact",
      lat: 37.7749,
      lng: -122.4194,
      tzOffsetMin: -420,
    });
    const ab = pairChartFingerprint(chart, other);
    const ba = pairChartFingerprint(other, chart);
    expect(ab).not.toBe(ba);
    expect(ab.startsWith(chartPlacementFingerprint(chart))).toBe(true);
  });
});

/**
 * Standing guard (Phase 1): score one fixture pair twice and assert equality.
 * computeSynastry is deterministic; this locks the contract the product copy claims.
 */
describe("computeSynastry fixture scored twice is equal", () => {
  it("returns the same overall (and full scores) on two calls", () => {
    const a = computeNatalChart({
      dateUTC: "1990-05-04T14:20:00.000Z",
      precision: "exact",
      lat: 41.8781,
      lng: -87.6298,
      tzOffsetMin: -300,
    });
    const b = computeNatalChart({
      dateUTC: "1988-07-22T16:00:00.000Z",
      precision: "exact",
      lat: 37.7749,
      lng: -122.4194,
      tzOffsetMin: -420,
    });
    const first = computeSynastry(a, b);
    const second = computeSynastry(a, b);
    expect(second.scores).toEqual(first.scores);
    expect(second.scores.overall).toBe(first.scores.overall);
  });
});

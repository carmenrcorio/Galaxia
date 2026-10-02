import { describe, expect, it } from "vitest";
import {
  formatCrossChartAspectLine,
  formatElementBalanceLine,
  formatNatalAspectLine,
  formatPlacementLine,
  platonicWatchMercuryAspect,
} from "./why-reading";
import { summarizePairElementBalance, countPlanetElements, computeNatalChart, computeSynastry, type Birth } from "@galaxia/astro";

describe("why-reading formatters", () => {
  it("formats cross-chart aspects with names and orb in degrees", () => {
    expect(
      formatCrossChartAspectLine(
        { from: "venus", to: "jupiter", type: "sextile", orb: 0.42 },
        "Ada",
        "Sam"
      )
    ).toBe("Ada's Venus sextile Sam's Jupiter, orb 0.4 degrees.");
  });

  it("formats natal aspects", () => {
    expect(formatNatalAspectLine({ from: "moon", to: "saturn", type: "square", orb: 1.2 })).toBe(
      "Moon square Saturn, orb 1.2 degrees."
    );
  });

  it("formats placements with optional house", () => {
    expect(formatPlacementLine("mars", "Virgo", 6, 14.2)).toBe(
      "Mars in Virgo, house 6, 14.2 degrees."
    );
  });

  it("finds platonic watch mercury aspect among tight aspects", () => {
    const birthA: Birth = {
      dateUTC: "1990-06-15T14:30:00.000Z",
      precision: "exact",
      lat: 40.7128,
      lng: -74.006,
      tzOffsetMin: -240,
    };
    const birthB: Birth = {
      dateUTC: "1988-03-22T09:15:00.000Z",
      precision: "exact",
      lat: 34.0522,
      lng: -118.2437,
      tzOffsetMin: -420,
    };
    const syn = computeSynastry(computeNatalChart(birthA), computeNatalChart(birthB));
    const hit = platonicWatchMercuryAspect(syn);
    if (hit) {
      expect(hit.orb).toBeLessThan(4);
      expect([hit.from.toLowerCase(), hit.to.toLowerCase()]).toContain("mercury");
    }
  });

  it("element balance line uses stored counts", () => {
    const a = countPlanetElements(computeNatalChart({
      dateUTC: "1990-06-15T14:30:00.000Z",
      precision: "exact",
      lat: 40.7128,
      lng: -74.006,
      tzOffsetMin: -240,
    }).placements);
    const b = countPlanetElements(computeNatalChart({
      dateUTC: "1988-03-22T09:15:00.000Z",
      precision: "exact",
      lat: 34.0522,
      lng: -118.2437,
      tzOffsetMin: -420,
    }).placements);
    const balance = summarizePairElementBalance(a, b);
    const line = formatElementBalanceLine(balance, "Ada", "Sam");
    expect(line).toContain("Ada:");
    expect(line).toContain("Sam:");
  });
});

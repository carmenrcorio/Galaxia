import { describe, expect, it } from "vitest";
import {
  computeNatalChart,
  computeSynastry,
  summarizePairElementBalance,
  type ElementCounts,
} from "../src/index";

const total = (counts: ElementCounts) =>
  counts.fire + counts.earth + counts.air + counts.water;

describe("pair element balance", () => {
  it("counts exactly the ten planets from Sun through Pluto for each person", () => {
    const chartA = computeNatalChart({
      dateUTC: "1993-04-10T12:00:00.000Z",
      precision: "date",
    });
    const chartB = computeNatalChart({
      dateUTC: "1994-11-20T12:00:00.000Z",
      precision: "date",
    });

    const balance = computeSynastry(chartA, chartB).elementBalance;

    expect(total(balance.a)).toBe(10);
    expect(total(balance.b)).toBe(10);
    expect(total(balance.combined)).toBe(20);
    expect(balance.combined).toEqual({
      fire: balance.a.fire + balance.b.fire,
      earth: balance.a.earth + balance.b.earth,
      air: balance.a.air + balance.b.air,
      water: balance.a.water + balance.b.water,
    });
  });

  it("returns every co-dominant element instead of choosing by object order", () => {
    const balance = summarizePairElementBalance(
      { fire: 4, earth: 3, air: 2, water: 1 },
      { fire: 2, earth: 3, air: 2, water: 3 },
    );

    expect(balance.combined).toEqual({ fire: 6, earth: 6, air: 4, water: 4 });
    expect(balance.dominantElements).toEqual(["fire", "earth"]);
    expect(balance.balanced).toBe(false);
  });

  it("marks a near-even distribution as balanced with no dominant element", () => {
    const balance = summarizePairElementBalance(
      { fire: 3, earth: 2, air: 3, water: 2 },
      { fire: 2, earth: 3, air: 2, water: 3 },
    );

    expect(balance.combined).toEqual({ fire: 5, earth: 5, air: 5, water: 5 });
    expect(balance.dominantElements).toEqual([]);
    expect(balance.balanced).toBe(true);
  });

  it("reports elements with zero or one combined planet as missing", () => {
    const balance = summarizePairElementBalance(
      { fire: 5, earth: 3, air: 2, water: 0 },
      { fire: 3, earth: 4, air: 2, water: 1 },
    );

    expect(balance.missingElements).toEqual(["water"]);
    expect(balance.combined.water).toBe(1);
  });

  it("does not call an empty tally balanced or dominant", () => {
    const empty = { fire: 0, earth: 0, air: 0, water: 0 };
    const balance = summarizePairElementBalance(empty, empty);

    expect(balance.balanced).toBe(false);
    expect(balance.dominantElements).toEqual([]);
    expect(balance.missingElements).toEqual(["fire", "earth", "air", "water"]);
  });
});

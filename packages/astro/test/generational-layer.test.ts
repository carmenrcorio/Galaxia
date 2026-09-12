import { describe, expect, it } from "vitest";
import {
  GENERATION_BY_YEAR,
  PLUTO_SIGN_EXTENDED,
  generationNameForYear,
  getFamilyBridge,
} from "../src/generational-layer";

describe("PLUTO_SIGN_EXTENDED", () => {
  const signs = Object.keys(PLUTO_SIGN_EXTENDED) as Array<keyof typeof PLUTO_SIGN_EXTENDED>;

  it("has a non-empty corruptionSignature for every authored sign", () => {
    for (const sign of signs) {
      const entry = PLUTO_SIGN_EXTENDED[sign]!;
      expect(entry.corruptionSignature.length, sign).toBeGreaterThan(0);
    }
  });

  it("every historicalFigure entry has non-empty name, knownFor, and plutoBridge", () => {
    for (const sign of signs) {
      const entry = PLUTO_SIGN_EXTENDED[sign]!;
      for (const figure of entry.historicalFigures) {
        expect(figure.name.length, `${sign} name`).toBeGreaterThan(0);
        expect(figure.knownFor.length, `${sign} knownFor`).toBeGreaterThan(0);
        expect(figure.plutoBridge.length, `${sign} plutoBridge`).toBeGreaterThan(0);
      }
    }
  });

  it("leaves Capricorn's historicalFigures empty (no fabricated figures)", () => {
    expect(PLUTO_SIGN_EXTENDED.Capricorn?.historicalFigures).toEqual([]);
  });
});

describe("GENERATION_BY_YEAR", () => {
  it("has no gaps between consecutive ranges", () => {
    const sorted = [...GENERATION_BY_YEAR].sort((a, b) => a.from - b.from);
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i]!.from, `${sorted[i - 1]!.name} -> ${sorted[i]!.name}`).toBe(sorted[i - 1]!.to + 1);
    }
  });

  it.each([
    [1932, "The Silent Generation"],
    [1955, "Baby Boomers"],
    [1968, "Generation X"],
    [1988, "Millennials"],
    [2001, "Generation Z"],
    [2018, "Generation Alpha"],
  ] as const)("returns %s for year %s", (year, expectedName) => {
    expect(generationNameForYear(year)?.name).toBe(expectedName);
  });
});

describe("getFamilyBridge", () => {
  it("returns a non-null string for an authored pair", () => {
    const bridge = getFamilyBridge("Scorpio", "Cancer");
    expect(bridge).not.toBeNull();
    expect(bridge?.length).toBeGreaterThan(0);
  });

  it("returns null for an unauthored pair", () => {
    expect(getFamilyBridge("Scorpio", "Aquarius")).toBeNull();
  });
});

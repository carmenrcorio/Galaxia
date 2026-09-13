import { describe, expect, it } from "vitest";
import {
  GENERATION_BY_YEAR,
  PLUTO_SIGN_EXTENDED,
  figureBirth,
  generationNameForYear,
  getFamilyBridge,
} from "../src/generational-layer";
import { computeGenerational, computeNatalChart } from "../src/index";

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

describe("figureBirth", () => {
  it("reads a full date at date precision", () => {
    expect(figureBirth("1997-07-12")).toEqual({ dateUTC: "1997-07-12T12:00:00.000Z", precision: "date" });
  });

  it("keeps a year-only value at year precision rather than inventing a day", () => {
    expect(figureBirth("1997")).toEqual({ dateUTC: "1997-01-01T12:00:00.000Z", precision: "year" });
  });

  it.each(["", "1997-7-12", "12-07-1997", "1997-07-12T00:00:00Z", "sometime in 1997"])(
    "rejects the malformed value %o",
    (born) => {
      expect(() => figureBirth(born)).toThrow(/must be "YYYY-MM-DD" or "YYYY"/);
    }
  );

  it("rejects a well-formed value that is not a real calendar date", () => {
    expect(() => figureBirth("1997-02-31")).toThrow(/not a real calendar date/);
  });
});

// Every historical figure is filed under the Pluto sign they are claimed to
// carry. Before `born` existed, that claim lived only in a code comment, so a
// wrong sign was invisible to CI (see PR #212, Malala Yousafzai). These tests
// recompute each figure's natal Pluto from their birth date and check it
// against the list they sit in.
describe("historicalFigures natal Pluto matches the sign they are filed under", () => {
  const signs = Object.keys(PLUTO_SIGN_EXTENDED) as Array<keyof typeof PLUTO_SIGN_EXTENDED>;
  const figures = signs.flatMap((sign) =>
    PLUTO_SIGN_EXTENDED[sign]!.historicalFigures.map((figure) => ({ sign, figure }))
  );

  // The birth-year range each list claims in its FOUNDER-REVIEW comment, so
  // the prose and the data cannot drift apart unnoticed.
  const COHORT_YEARS: Partial<Record<keyof typeof PLUTO_SIGN_EXTENDED, [number, number]>> = {
    Cancer: [1926, 1935],
    Leo: [1938, 1957],
    Virgo: [1956, 1971],
    Libra: [1971, 1983],
    Scorpio: [1983, 1995],
    Sagittarius: [1995, 2008],
    Capricorn: [2008, 2023],
  };

  it("covers every authored figure", () => {
    expect(figures.length).toBe(28);
  });

  it.each(figures.map(({ sign, figure }) => [`${figure.name} (${sign})`, sign, figure] as const))(
    "%s",
    (_label, sign, figure) => {
      const { dateUTC, precision } = figureBirth(figure.born);
      const pluto = computeGenerational(dateUTC, precision).pluto;

      // A year-only birth in a year Pluto changed sign settles nothing, and
      // the engine says so. Never let an unsettled sign pass as verified.
      expect(pluto.confident, `${figure.name}: ${pluto.possibleSigns?.join(" or ")}`).toBe(true);
      expect(pluto.sign, figure.name).toBe(sign);

      const [from, to] = COHORT_YEARS[sign]!;
      const year = Number(figure.born.slice(0, 4));
      expect(year, `${figure.name} outside the ${sign} cohort range`).toBeGreaterThanOrEqual(from);
      expect(year, `${figure.name} outside the ${sign} cohort range`).toBeLessThanOrEqual(to);
    }
  );

  // Guard against a figure whose sign is only right by a hair: within a degree
  // of a cusp the answer would depend on the noon-UTC sampling choice and on
  // engine precision (~0.1 degrees), which is not a fact we can present.
  it.each(figures.map(({ figure }) => [figure.name, figure] as const))(
    "%s sits clear of a sign boundary",
    (_name, figure) => {
      const { dateUTC, precision } = figureBirth(figure.born);
      const pluto = computeNatalChart({ dateUTC, precision }).placements.find((p) => p.body === "pluto")!;
      const marginDeg = Math.min(pluto.degree, 30 - pluto.degree);
      expect(marginDeg, `${figure.name} at ${pluto.sign} ${pluto.degree.toFixed(2)} deg`).toBeGreaterThan(1);
    }
  );
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

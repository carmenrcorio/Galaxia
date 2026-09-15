import { describe, expect, it } from "vitest";
import {
  ERA_READING_HEADING,
  ERA_READING_LABELS,
  GENERATION_BY_YEAR,
  PLUTO_SIGN_EXTENDED,
  PROFESSIONAL_PERSON_RELATIONS,
  WORK_VIEW_HEADING,
  WORK_VIEW_LABELS,
  figureBirth,
  generationNameForYear,
  generationalLeadForPair,
  getFamilyBridge,
  getPlutoEraReading,
  getPlutoWorkView,
  isProfessionalPersonRelation,
  plutoSignsFromRelation,
  plutoSourceLine,
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

  // The birth-year range each list claims, so the prose and the data cannot
  // drift apart unnoticed.
  const COHORT_YEARS: Partial<Record<keyof typeof PLUTO_SIGN_EXTENDED, [number, number]>> = {
    Cancer: [1926, 1935],
    Leo: [1938, 1957],
    // 1972 upper bound covers Biggie Smalls: born inside the same 1972
    // retrograde dip that makes Eminem's Libra entry a boundary case too.
    Virgo: [1956, 1972],
    Libra: [1971, 1983],
    Scorpio: [1983, 1995],
    Sagittarius: [1995, 2008],
    Capricorn: [2008, 2023],
  };

  it("covers every authored figure", () => {
    expect(figures.length).toBe(29);
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
  //
  // Biggie Smalls is a documented exception, not a loosened default: his
  // natal Pluto sits at Virgo 29 degrees 24 minutes retrograde, 0.59 degrees
  // from the Libra cusp, five weeks into the 1972 retrograde dip. That is six
  // times the engine's ~0.1 degree tolerance, and PR #215 cross-checked it
  // against astro.com, so the closeness is the real placement, not sampling
  // noise. Everyone else still has to clear the full 1-degree bar.
  const NEAR_CUSP_VERIFIED_EXTERNALLY: Record<string, number> = { "Biggie Smalls": 0.5 };

  it.each(figures.map(({ figure }) => [figure.name, figure] as const))(
    "%s sits clear of a sign boundary",
    (_name, figure) => {
      const { dateUTC, precision } = figureBirth(figure.born);
      const pluto = computeNatalChart({ dateUTC, precision }).placements.find((p) => p.body === "pluto")!;
      const marginDeg = Math.min(pluto.degree, 30 - pluto.degree);
      const minMargin = NEAR_CUSP_VERIFIED_EXTERNALLY[figure.name] ?? 1;
      expect(marginDeg, `${figure.name} at ${pluto.sign} ${pluto.degree.toFixed(2)} deg`).toBeGreaterThan(minMargin);
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

const AUTHORED_SIGNS = Object.keys(PLUTO_SIGN_EXTENDED) as Array<keyof typeof PLUTO_SIGN_EXTENDED>;

describe("eraReading (Phase 1: plain-language lead)", () => {
  it("is present with all four fields for every authored Pluto sign", () => {
    for (const sign of AUTHORED_SIGNS) {
      const reading = PLUTO_SIGN_EXTENDED[sign]!.eraReading;
      expect(reading.authority.length, `${sign} authority`).toBeGreaterThan(40);
      expect(reading.institutions.length, `${sign} institutions`).toBeGreaterThan(40);
      expect(reading.change.length, `${sign} change`).toBeGreaterThan(40);
      expect(reading.trust.length, `${sign} trust`).toBeGreaterThan(40);
      expect(getPlutoEraReading(sign)).toBe(reading);
    }
  });

  it("does not lead the era reading with a planet name (source line does that)", () => {
    for (const sign of AUTHORED_SIGNS) {
      const reading = PLUTO_SIGN_EXTENDED[sign]!.eraReading;
      for (const [field, text] of Object.entries(reading)) {
        expect(text, `${sign}.${field}`).not.toMatch(/^Pluto\b/);
        expect(text, `${sign}.${field}`).not.toMatch(/^Uranus\b/);
        expect(text, `${sign}.${field}`).not.toMatch(/^Neptune\b/);
      }
    }
  });

  it("returns null for an unauthored sign instead of fabricating", () => {
    expect(getPlutoEraReading("Aries")).toBeNull();
    expect(getPlutoEraReading("Aquarius")).toBeNull();
  });

  it("keeps the placement visible as a source line", () => {
    expect(plutoSourceLine("Virgo")).toBe("Source: Pluto in Virgo");
    expect(ERA_READING_HEADING.length).toBeGreaterThan(0);
    expect(ERA_READING_LABELS.authority).toBe("Authority");
    expect(ERA_READING_LABELS.institutions).toBe("Institutions");
    expect(ERA_READING_LABELS.change).toBe("Change");
    expect(ERA_READING_LABELS.trust).toBe("Trust");
  });
});

describe("workView (Phase 2: professional lead)", () => {
  const FORBIDDEN = [
    /\bhiring\b/i,
    /\bhire[ds]?\b/i,
    /\bcandidate/i,
    /\bpromot(e|ion|ed|ing)\b/i,
    /\bperformance\b/i,
    /\bcompetence\b/i,
    /\bcompetent\b/i,
    /\bproductiv/i,
    /\bshortlist/i,
  ];

  it("is present with respect, decisions, and friction for every authored sign", () => {
    for (const sign of AUTHORED_SIGNS) {
      const view = PLUTO_SIGN_EXTENDED[sign]!.workView;
      expect(view.respect.length, `${sign} respect`).toBeGreaterThan(20);
      expect(view.decisions.length, `${sign} decisions`).toBeGreaterThan(20);
      expect(view.friction.length, `${sign} friction`).toBeGreaterThan(20);
      expect(getPlutoWorkView(sign)).toBe(view);
    }
  });

  it("contains no hiring, performance, or competence claims", () => {
    for (const sign of AUTHORED_SIGNS) {
      const view = PLUTO_SIGN_EXTENDED[sign]!.workView;
      const blob = `${view.respect} ${view.decisions} ${view.friction}`;
      for (const pattern of FORBIDDEN) {
        expect(blob, `${sign} ${pattern}`).not.toMatch(pattern);
      }
    }
  });

  it("returns null for an unauthored sign instead of fabricating", () => {
    expect(getPlutoWorkView("Pisces")).toBeNull();
  });

  it("unlocks from the same person.relation tags compare already maps to working frames", () => {
    for (const tag of PROFESSIONAL_PERSON_RELATIONS) {
      expect(isProfessionalPersonRelation(tag), tag).toBe(true);
    }
    expect(isProfessionalPersonRelation("partner")).toBe(false);
    expect(isProfessionalPersonRelation(null)).toBe(false);
    expect(WORK_VIEW_HEADING.length).toBeGreaterThan(0);
    expect(WORK_VIEW_LABELS.respect).toContain("respect");
    expect(WORK_VIEW_LABELS.decisions).toContain("decisions");
    expect(WORK_VIEW_LABELS.friction).toContain("friction");
  });
});

describe("generationalLeadForPair", () => {
  it("returns one lead when Pluto is shared", () => {
    const leads = generationalLeadForPair({
      shared: [{ planet: "pluto", sign: "Virgo" }],
      diverged: [],
    });
    expect(leads).toHaveLength(1);
    expect(leads[0]!.sign).toBe("Virgo");
    expect(leads[0]!.source).toBe("Source: Pluto in Virgo");
    expect(leads[0]!.workView).toBe(PLUTO_SIGN_EXTENDED.Virgo!.workView);
  });

  it("returns two leads when Pluto diverges, skipping unauthored signs", () => {
    const leads = generationalLeadForPair({
      shared: [],
      diverged: [{ planet: "pluto", signA: "Scorpio", signB: "Aries" }],
    });
    expect(leads.map((lead) => lead.sign)).toEqual(["Scorpio"]);
  });

  it("returns null signs rather than inventing a Pluto when the lists omit it", () => {
    expect(plutoSignsFromRelation({ shared: [], diverged: [] })).toBeNull();
    expect(generationalLeadForPair({ shared: [], diverged: [] })).toEqual([]);
  });
});

describe("authored era and work strings contain no em dashes", () => {
  it("scans every eraReading and workView field", () => {
    for (const sign of AUTHORED_SIGNS) {
      const entry = PLUTO_SIGN_EXTENDED[sign]!;
      const blobs = [
        ...Object.values(entry.eraReading),
        ...Object.values(entry.workView),
        ERA_READING_HEADING,
        WORK_VIEW_HEADING,
        ...Object.values(ERA_READING_LABELS),
        ...Object.values(WORK_VIEW_LABELS),
        plutoSourceLine(sign),
      ];
      for (const text of blobs) {
        expect(text.includes("\u2014"), text.slice(0, 80)).toBe(false);
      }
    }
  });
});

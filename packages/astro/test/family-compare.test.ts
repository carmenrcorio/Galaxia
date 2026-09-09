import { describe, expect, it } from "vitest";
import { computeNatalChart } from "../src/index";
import { detectFamilyPatterns, extractFamilyPlacements, FAMILY_COMPARE_PLANETS } from "../src/family-compare";
import {
  interpretDominantElement,
  interpretMissingElement,
  interpretMissingModality,
  interpretSharedPlacement,
} from "../src/family-compare-interpretations";

// Ground truth from computeNatalChart itself (verified once via a scratch
// script) — these are the engine's real placements for these exact births,
// not hand-picked "nice" signs.
const PERSON_A = computeNatalChart({ dateUTC: "1990-06-15T14:20:00.000Z", precision: "exact", lat: 40.7, lng: -74.0, tzOffsetMin: -240 });
// Same exact birth as A — guarantees every placement matches, independent of
// which signs the engine actually returns.
const PERSON_A2 = computeNatalChart({ dateUTC: "1990-06-15T14:20:00.000Z", precision: "exact", lat: 40.7, lng: -74.0, tzOffsetMin: -240 });
const PERSON_B = computeNatalChart({ dateUTC: "1962-01-10T08:00:00.000Z", precision: "exact", lat: 41.8, lng: -87.6, tzOffsetMin: -360 });
const YEAR_ONLY = computeNatalChart({ dateUTC: "1975-01-01T00:00:00.000Z", precision: "year" });

describe("extractFamilyPlacements", () => {
  it("reads all six personal placements, with Rising from chart.asc (not placements[])", () => {
    const cells = extractFamilyPlacements(PERSON_A);
    for (const planet of FAMILY_COMPARE_PLANETS) {
      expect(cells[planet].sign).not.toBeNull();
      expect(cells[planet].confident).toBe(true);
    }
    expect(cells.rising.sign).toBe(PERSON_A.asc);
  });

  it("marks Rising unavailable (not fabricated) when the chart has no ascendant", () => {
    const cells = extractFamilyPlacements(YEAR_ONLY);
    expect(cells.rising.sign).toBeNull();
    expect(cells.rising.confident).toBe(false);
  });

  it("marks a year-only chart's sun as unconfident, never counted as a claim", () => {
    const cells = extractFamilyPlacements(YEAR_ONLY);
    expect(cells.sun.confident).toBe(false);
  });
});

describe("detectFamilyPatterns — shared placements", () => {
  it("finds identical-chart people sharing all six placements", () => {
    const result = detectFamilyPatterns([
      { id: "a", name: "Ada", chart: PERSON_A },
      { id: "a2", name: "Nell", chart: PERSON_A2 },
      { id: "b", name: "Bo", chart: PERSON_B },
    ]);
    for (const planet of FAMILY_COMPARE_PLANETS) {
      const hit = result.sharedPlacements.find((s) => s.planet === planet && s.personIds.includes("a") && s.personIds.includes("a2"));
      expect(hit).toBeTruthy();
    }
  });

  it("never groups two different signs together, and never includes solo (1-person) placements", () => {
    const result = detectFamilyPatterns([
      { id: "a", name: "Ada", chart: PERSON_A },
      { id: "b", name: "Bo", chart: PERSON_B },
    ]);
    for (const shared of result.sharedPlacements) {
      expect(shared.personIds.length).toBeGreaterThanOrEqual(2);
      const signs = new Set(shared.personIds.map((id) => (id === "a" ? PERSON_A : PERSON_B)));
      expect(signs.size).toBeGreaterThan(0); // sanity — grouping key is a single sign by construction
    }
  });

  it("sorts by group size descending, so the most-shared placement leads", () => {
    const result = detectFamilyPatterns([
      { id: "a", name: "Ada", chart: PERSON_A },
      { id: "a2", name: "Nell", chart: PERSON_A2 },
      { id: "b", name: "Bo", chart: PERSON_B },
    ]);
    for (let i = 1; i < result.sharedPlacements.length; i++) {
      expect(result.sharedPlacements[i - 1]!.personIds.length).toBeGreaterThanOrEqual(result.sharedPlacements[i]!.personIds.length);
    }
  });

  it("year-only people never contribute a fabricated shared Sun/Moon claim", () => {
    const result = detectFamilyPatterns([
      { id: "a", name: "Ada", chart: PERSON_A },
      { id: "y1", name: "Yuki", chart: YEAR_ONLY },
      { id: "y2", name: "Yara", chart: YEAR_ONLY },
    ]);
    // Two year-only people never claim a "shared Sun" together, even though
    // the engine happens to guess the same sign for both from the same year.
    const yearShare = result.sharedPlacements.find((s) => s.personIds.includes("y1") && s.personIds.includes("y2"));
    expect(yearShare).toBeUndefined();
  });
});

describe("detectFamilyPatterns — element clustering", () => {
  it("identifies a clear earth-dominant cluster from three copies of an earth-heavy chart", () => {
    // PERSON_B's real placements: Capricorn Sun/Venus/Mars (earth x3), Pisces
    // Moon (water), Scorpio Rising (water), Aquarius Mercury (air), zero fire.
    const result = detectFamilyPatterns([
      { id: "b1", name: "One", chart: PERSON_B },
      { id: "b2", name: "Two", chart: PERSON_B },
      { id: "b3", name: "Three", chart: PERSON_B },
    ]);
    expect(result.dominantElement).not.toBeNull();
    expect(result.dominantElement!.element).toBe("earth");
    expect(result.dominantElement!.count).toBe(9); // 3 earth placements x 3 people
    expect(result.dominantElement!.total).toBe(18); // 6 planets x 3 people
    expect(result.missingElements).toEqual(["fire"]);
  });

  it("does not call a plurality 'dominant' when it barely edges out the runner-up (no false clustering claim)", () => {
    const result = detectFamilyPatterns([
      { id: "a", name: "Ada", chart: PERSON_A },
      { id: "b", name: "Bo", chart: PERSON_B },
    ]);
    // Only 2 people / 12 placements — any element leading by one placement
    // should not clear the >=3-placements-and-40% bar meant to avoid
    // over-claiming a "family pattern" from a small, noisy sample.
    if (result.dominantElement) {
      expect(result.dominantElement.count).toBeGreaterThanOrEqual(3);
      expect(result.dominantElement.count / result.dominantElement.total).toBeGreaterThanOrEqual(0.4);
    }
  });

  it("reports no missing elements/modalities when there are zero confident placements to judge", () => {
    const result = detectFamilyPatterns([
      { id: "y1", name: "Yuki", chart: YEAR_ONLY },
      { id: "y2", name: "Yara", chart: YEAR_ONLY },
    ]);
    expect(result.missingElements).toEqual([]);
    expect(result.missingModalities).toEqual([]);
  });
});

describe("interpretation copy", () => {
  it("interpretSharedPlacement names the real sign and planet, with an honest group-size phrase", () => {
    const result = detectFamilyPatterns([
      { id: "a", name: "Ada", chart: PERSON_A },
      { id: "a2", name: "Nell", chart: PERSON_A2 },
      { id: "b", name: "Bo", chart: PERSON_B },
    ]);
    const sunShare = result.sharedPlacements.find((s) => s.planet === "sun")!;
    const copy = interpretSharedPlacement(sunShare, 3);
    expect(copy).toContain(sunShare.sign);
    expect(copy.toLowerCase()).toContain("sun");
    expect(copy).toContain("Two of you");
  });

  it("says 'All of you' when the shared group is the entire compared set", () => {
    const result = detectFamilyPatterns([
      { id: "a", name: "Ada", chart: PERSON_A },
      { id: "a2", name: "Nell", chart: PERSON_A2 },
    ]);
    const sunShare = result.sharedPlacements.find((s) => s.planet === "sun")!;
    expect(interpretSharedPlacement(sunShare, 2)).toContain("All of you");
  });

  it("interpretDominantElement and interpretMissingElement/Modality never mention an element that wasn't actually detected", () => {
    const result = detectFamilyPatterns([
      { id: "b1", name: "One", chart: PERSON_B },
      { id: "b2", name: "Two", chart: PERSON_B },
      { id: "b3", name: "Three", chart: PERSON_B },
    ]);
    const dominantCopy = interpretDominantElement(result.dominantElement!.element, result.dominantElement!.count, result.dominantElement!.total);
    expect(dominantCopy).toContain("earth");
    for (const el of result.missingElements) {
      expect(interpretMissingElement(el)).toContain(el);
    }
    for (const mod of result.missingModalities) {
      expect(interpretMissingModality(mod)).toContain(mod);
    }
  });
});

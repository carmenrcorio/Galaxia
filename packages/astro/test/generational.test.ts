import { describe, expect, it } from "vitest";
import { cohortOverlay, compareGenerational, computeGenerational } from "../src/index";

describe("computeGenerational", () => {
  it("returns confident signatures for date precision", () => {
    const signature = computeGenerational("1993-11-20T12:00:00.000Z", "date");
    expect(signature.uranus.confident).toBe(true);
    expect(signature.neptune.confident).toBe(true);
    expect(signature.pluto.confident).toBe(true);
    expect(signature.cohortLabel).toContain("Pluto in");
  });

  it("flags ambiguous year boundaries when signs can change", () => {
    const signature = computeGenerational("1995-01-01T00:00:00.000Z", "year");
    expect(signature.pluto.confident).toBe(false);
    expect(signature.pluto.possibleSigns?.length).toBeGreaterThan(1);
  });
});

describe("generational relation helpers", () => {
  it("detects same-generation dyads", () => {
    const a = computeGenerational("1993-11-20T12:00:00.000Z", "date");
    const b = computeGenerational("1994-04-03T12:00:00.000Z", "date");
    const relation = compareGenerational(a, b, 1);
    expect(relation.sameGeneration).toBe(true);
    expect(relation.shared.length).toBeGreaterThanOrEqual(2);
  });

  it("builds fault lines for mixed cohorts", () => {
    const overlay = cohortOverlay([
      { name: "Ari", gen: computeGenerational("1988-05-03T12:00:00.000Z", "date") },
      { name: "Bea", gen: computeGenerational("1992-07-18T12:00:00.000Z", "date") },
      { name: "Cy", gen: computeGenerational("2003-03-11T12:00:00.000Z", "date") }
    ]);
    expect(overlay.faultLines.length).toBeGreaterThan(0);
  });
});

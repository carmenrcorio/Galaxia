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

  it("keys the cohort label to sharedSky.length (never contradict Shared Sky)", () => {
    const shared3 = cohortOverlay([
      { name: "A", gen: computeGenerational("1993-11-20T12:00:00.000Z", "date") },
      { name: "B", gen: computeGenerational("1994-04-03T12:00:00.000Z", "date") },
      { name: "C", gen: computeGenerational("1992-07-18T12:00:00.000Z", "date") }
    ]);
    expect(shared3.sharedSky.length).toBe(3);
    expect(shared3.label).toBe("Everyone here came up under the same generational sky.");

    const shared2 = cohortOverlay([
      { name: "A", gen: computeGenerational("1995-06-01T12:00:00.000Z", "date") },
      { name: "B", gen: computeGenerational("1996-06-01T12:00:00.000Z", "date") },
      { name: "C", gen: computeGenerational("1997-06-01T12:00:00.000Z", "date") }
    ]);
    expect(shared2.sharedSky.length).toBe(2);
    expect(shared2.label).toBe("Mostly one generation, with one place where your eras part.");

    const shared1 = cohortOverlay([
      { name: "A", gen: computeGenerational("1988-06-01T12:00:00.000Z", "date") },
      { name: "B", gen: computeGenerational("1996-06-01T12:00:00.000Z", "date") },
      { name: "C", gen: computeGenerational("1997-06-01T12:00:00.000Z", "date") }
    ]);
    expect(shared1.sharedSky.length).toBe(1);
    expect(shared1.label).toBe(
      "One thread of generational sky runs through all of you, and the rest is split."
    );

    const shared0 = cohortOverlay([
      { name: "Ari", gen: computeGenerational("1988-05-03T12:00:00.000Z", "date") },
      { name: "Bea", gen: computeGenerational("1992-07-18T12:00:00.000Z", "date") },
      { name: "Cy", gen: computeGenerational("2003-03-11T12:00:00.000Z", "date") }
    ]);
    expect(shared0.sharedSky.length).toBe(0);
    expect(shared0.label).toBe(
      "No single generation runs through this whole group. Instincts about change, trust, and power were set by different eras here."
    );
  });
});

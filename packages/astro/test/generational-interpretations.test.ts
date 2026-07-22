import { describe, expect, it } from "vitest";
import {
  GEN_HEADLINES,
  genFrame,
  genHeadline,
  genPlacement,
} from "../src/generational-interpretations";

describe("generational interpretation library", () => {
  it("returns curated placement copy for known outer-planet signs", () => {
    const entry = genPlacement("pluto", "Scorpio");
    expect(entry).not.toBeNull();
    expect(entry?.essence.length).toBeGreaterThan(0);
    expect(entry?.shared.length).toBeGreaterThan(0);
  });

  it("returns null for a missing placement instead of fabricating", () => {
    // Cast a deliberately invalid sign key to exercise the fail-safe path.
    const entry = genPlacement("uranus", "NotASign" as never);
    expect(entry).toBeNull();
  });

  it("exposes a frame for every outer planet", () => {
    for (const planet of ["uranus", "neptune", "pluto"] as const) {
      const frame = genFrame(planet);
      expect(frame.domain.length).toBeGreaterThan(0);
      expect(frame.diverged.length).toBeGreaterThan(0);
    }
  });

  it("picks headlines from the engine shared/diverged mix only", () => {
    expect(genHeadline(3, 0)).toBe(GEN_HEADLINES.allShared);
    expect(genHeadline(2, 1)).toBe(GEN_HEADLINES.mostlyShared);
    expect(genHeadline(1, 2)).toBe(GEN_HEADLINES.mostlyDiverged);
    expect(genHeadline(0, 3)).toBe(GEN_HEADLINES.mostlyDiverged);
  });
});

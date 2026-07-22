import { describe, expect, it } from "vitest";
import type { Sign } from "../src/index";
import {
  GEN_HEADLINES,
  GEN_PLACEMENTS,
  genFrame,
  genHeadline,
  genPlacement,
  type GenPlanet,
} from "../src/generational-interpretations";

const SIGNS: Sign[] = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];
const PLANETS: GenPlanet[] = ["uranus", "neptune", "pluto"];

describe("generational interpretation library", () => {
  it("returns curated placement copy for known outer-planet signs", () => {
    const entry = genPlacement("pluto", "Scorpio");
    expect(entry).not.toBeNull();
    expect(entry?.essence.length).toBeGreaterThan(0);
    expect(entry?.shared.length).toBeGreaterThan(0);
  });

  it("covers all 12 signs for every outer planet (no fail-safe for 1800+)", () => {
    for (const planet of PLANETS) {
      for (const sign of SIGNS) {
        expect(GEN_PLACEMENTS[planet][sign], `${planet} ${sign}`).toBeTruthy();
        expect(genPlacement(planet, sign)).not.toBeNull();
      }
    }
  });

  it("returns null for a missing placement instead of fabricating", () => {
    // Cast a deliberately invalid sign key to exercise the fail-safe path.
    const entry = genPlacement("uranus", "NotASign" as never);
    expect(entry).toBeNull();
  });

  it("exposes a frame for every outer planet", () => {
    for (const planet of PLANETS) {
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

  it("authored strings contain no em dashes", () => {
    const blobs: string[] = [
      ...Object.values(GEN_HEADLINES),
      ...PLANETS.flatMap((p) => [genFrame(p).domain, genFrame(p).diverged]),
      ...PLANETS.flatMap((p) =>
        SIGNS.flatMap((s) => {
          const e = GEN_PLACEMENTS[p][s];
          return e ? [e.essence, e.shared] : [];
        })
      ),
    ];
    for (const text of blobs) {
      expect(text.includes("—"), text.slice(0, 60)).toBe(false);
    }
  });
});

import { describe, expect, it } from "vitest";
import {
  MEMORIAL_CONSTELLATIONS,
  getMemorialConstellation,
  isMemorialConstellationId,
  normalizeMemorialConstellationForWrite,
  usesMemorialGlyph,
} from "../src/index";

const EXPECTED_IDS = [
  "cassiopeia",
  "orion",
  "lyra",
  "cygnus",
  "scorpius",
  "leo",
  "ursa_major",
  "ursa_minor",
  "andromeda",
  "perseus",
  "aquila",
  "corona_borealis",
  "gemini",
  "taurus",
  "bootes",
  "draco",
] as const;

describe("MEMORIAL_CONSTELLATIONS library", () => {
  it("ships exactly the 16 sourced patterns in picker order", () => {
    expect(MEMORIAL_CONSTELLATIONS.map((c) => c.id)).toEqual([...EXPECTED_IDS]);
  });

  it("gives each entry a stable id, display name, IAU abbrev, stars, and lines", () => {
    for (const entry of MEMORIAL_CONSTELLATIONS) {
      expect(entry.id).toMatch(/^[a-z_]+$/);
      expect(entry.name.length).toBeGreaterThan(2);
      expect(entry.iau).toMatch(/^[A-Z][a-zA-Z]{1,2}$/);
      expect(entry.stars.length).toBeGreaterThanOrEqual(5);
      expect(entry.lines.length).toBeGreaterThanOrEqual(4);
    }
  });

  it("keeps star coords in roughly [-1, 1] with barycenter near origin", () => {
    for (const entry of MEMORIAL_CONSTELLATIONS) {
      let sx = 0;
      let sy = 0;
      for (const [x, y] of entry.stars) {
        expect(x).toBeGreaterThanOrEqual(-1.05);
        expect(x).toBeLessThanOrEqual(1.05);
        expect(y).toBeGreaterThanOrEqual(-1.05);
        expect(y).toBeLessThanOrEqual(1.05);
        sx += x;
        sy += y;
      }
      const n = entry.stars.length;
      expect(Math.abs(sx / n)).toBeLessThan(0.02);
      expect(Math.abs(sy / n)).toBeLessThan(0.02);
    }
  });

  it("indexes lines into the star list only", () => {
    for (const entry of MEMORIAL_CONSTELLATIONS) {
      for (const [a, b] of entry.lines) {
        expect(a).toBeGreaterThanOrEqual(0);
        expect(b).toBeGreaterThanOrEqual(0);
        expect(a).toBeLessThan(entry.stars.length);
        expect(b).toBeLessThan(entry.stars.length);
        expect(a).not.toBe(b);
      }
    }
  });
});

describe("normalize / resolve memorial constellation", () => {
  it("accepts known ids and clears empty / unknown", () => {
    expect(normalizeMemorialConstellationForWrite("orion")).toBe("orion");
    expect(normalizeMemorialConstellationForWrite(null)).toBeNull();
    expect(normalizeMemorialConstellationForWrite("")).toBeNull();
    expect(normalizeMemorialConstellationForWrite("none")).toBeNull();
    expect(normalizeMemorialConstellationForWrite("default")).toBeNull();
    expect(normalizeMemorialConstellationForWrite("not-a-sky")).toBeNull();
    expect(isMemorialConstellationId("ursa_major")).toBe(true);
    expect(isMemorialConstellationId("made_up")).toBe(false);
    expect(getMemorialConstellation("lyra")?.iau).toBe("Lyr");
    expect(getMemorialConstellation("nope")).toBeNull();
  });
});

describe("usesMemorialGlyph", () => {
  it("requires passed_at and a known assignment", () => {
    expect(
      usesMemorialGlyph({
        passed_at: "2024-01-01T00:00:00.000Z",
        memorial_constellation: "cassiopeia",
      })
    ).toBe(true);
    expect(
      usesMemorialGlyph({
        passed_at: "2024-01-01T00:00:00.000Z",
        memorial_constellation: null,
      })
    ).toBe(false);
    expect(
      usesMemorialGlyph({
        passed_at: null,
        memorial_constellation: "orion",
      })
    ).toBe(false);
    expect(
      usesMemorialGlyph({
        passed_at: "2024-01-01T00:00:00.000Z",
        memorial_constellation: "invented",
      })
    ).toBe(false);
    expect(
      usesMemorialGlyph({
        is_self: true,
        passed_at: "2024-01-01T00:00:00.000Z",
        memorial_constellation: "orion",
      })
    ).toBe(false);
  });
});

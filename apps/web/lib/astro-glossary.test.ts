import { describe, expect, it } from "vitest";
import { PLANET_KEYS, PLANET_MEANINGS, SIGN_KEYS, SIGN_MEANINGS, planetMeaning, signMeaning } from "./astro-glossary";

describe("astro glossary", () => {
  it("authors one beginner line for all ten planets", () => {
    expect(PLANET_KEYS).toHaveLength(10);
    for (const key of PLANET_KEYS) {
      expect(PLANET_MEANINGS[key].length).toBeGreaterThan(20);
      expect(PLANET_MEANINGS[key]).not.toContain("\u2014");
    }
  });

  it("authors one beginner line for all twelve signs", () => {
    expect(SIGN_KEYS).toHaveLength(12);
    for (const key of SIGN_KEYS) {
      expect(SIGN_MEANINGS[key].length).toBeGreaterThan(20);
      expect(SIGN_MEANINGS[key]).not.toContain("\u2014");
    }
  });

  it("looks up planet meaning case-insensitively", () => {
    expect(planetMeaning("Uranus")).toBe(PLANET_MEANINGS.uranus);
    expect(planetMeaning("not-a-planet")).toBeUndefined();
  });

  it("looks up sign meaning by exact engine key", () => {
    expect(signMeaning("Sagittarius")).toBe(SIGN_MEANINGS.Sagittarius);
    expect(signMeaning("sagittarius")).toBeUndefined();
  });
});

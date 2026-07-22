import { describe, expect, it } from "vitest";
import { ASPECT_NATURE, interpretAspect } from "../src/interpretations";
import {
  interpretSynastryAspect,
  SYNASTRY_PAIR,
} from "../src/synastry-interpretations";

describe("interpretSynastryAspect", () => {
  it("returns curated between-you copy for a PASS 1 pair (venus-mars square)", () => {
    const reading = interpretSynastryAspect("venus", "mars", "square");
    expect(reading.short).toBe("heat with friction in it");
    expect(reading.long).toContain("You want each other");
    // Direction-normalized: same key either order.
    expect(interpretSynastryAspect("mars", "venus", "square").short).toBe(
      reading.short
    );
  });

  it("falls back to neutral ASPECT_NATURE, never natal ASPECT_PAIR, for outer pairs", () => {
    const syn = interpretSynastryAspect("uranus", "moon", "sextile");
    expect(syn.short).toBe(ASPECT_NATURE.sextile.short);
    expect(syn.long).toBe(ASPECT_NATURE.sextile.long);
    // Natal table has moon-pluto square; synastry must NOT use that voice for an unauthored outer pair.
    const natalPlutoMoon = interpretAspect("pluto", "moon", "square");
    const synPlutoMoon = interpretSynastryAspect("pluto", "moon", "square");
    expect(synPlutoMoon.short).toBe(ASPECT_NATURE.square.short);
    expect(synPlutoMoon.short).not.toBe(natalPlutoMoon.short);
  });

  it("PASS 1 covers 21 pairs × 5 aspect types", () => {
    const keys = Object.keys(SYNASTRY_PAIR);
    expect(keys).toHaveLength(21);
    const types = ["conjunction", "sextile", "square", "trine", "opposition"] as const;
    let count = 0;
    for (const key of keys) {
      for (const type of types) {
        expect(SYNASTRY_PAIR[key]?.[type]?.short).toBeTruthy();
        count += 1;
      }
    }
    expect(count).toBe(105);
  });
});

import { describe, expect, it } from "vitest";
import { ASPECT_NATURE, interpretAspect } from "../src/interpretations";
import {
  interpretSynastryAspect,
  SYNASTRY_PAIR,
} from "../src/synastry-interpretations";
import type { AspectKey, BodyKey } from "../src/interpretations";

const TYPES: AspectKey[] = ["conjunction", "sextile", "square", "trine", "opposition"];
const CORE: BodyKey[] = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn"];
const OUTER: BodyKey[] = ["uranus", "neptune", "pluto"];
const PAIR = (a: BodyKey, b: BodyKey) => [a, b].sort().join("-");

function outerPairs(): string[] {
  const keys = new Set<string>();
  for (const c of CORE) for (const o of OUTER) keys.add(PAIR(c, o));
  for (let i = 0; i < OUTER.length; i++) {
    for (let j = i + 1; j < OUTER.length; j++) keys.add(PAIR(OUTER[i]!, OUTER[j]!));
  }
  return Array.from(keys).sort();
}

const OUTER_PAIRS = outerPairs();

const ROMANTIC_WORDS = /\b(attraction|desire|romance|romantic|lover|sexual|seduc|chemistry)\b/i;
const EM_DASH = "\u2014";

describe("interpretSynastryAspect", () => {
  it("returns curated between-you copy for a PASS 1 pair (venus-mars square)", () => {
    const reading = interpretSynastryAspect("venus", "mars", "square");
    expect(reading.short).toBe("heat with friction in it");
    expect(reading.long).toContain("The pull toward each other and the friction between you show up together");
    expect(interpretSynastryAspect("mars", "venus", "square").short).toBe(reading.short);
  });

  it("falls back to neutral ASPECT_NATURE, never natal ASPECT_PAIR, for unauthored same-body pairs", () => {
    // Same-body pairs are not in SYNASTRY_PAIR (the compare surface drops from===to).
    // This is the remaining miss path, and it must still never leak natal voice.
    const syn = interpretSynastryAspect("uranus", "uranus", "sextile");
    expect(syn.short).toBe(ASPECT_NATURE.sextile.short);
    expect(syn.long).toBe(ASPECT_NATURE.sextile.long);
    const natalPlutoMoon = interpretAspect("pluto", "moon", "square");
    expect(natalPlutoMoon).not.toBeNull();
    const synSameBody = interpretSynastryAspect("pluto", "pluto", "square");
    expect(synSameBody.short).toBe(ASPECT_NATURE.square.short);
    expect(synSameBody.short).not.toBe(natalPlutoMoon!.short);
  });

  it("PASS 1 covers 21 pairs and PASS 2 adds 24 outer pairs (45 x 5 = 225)", () => {
    const keys = Object.keys(SYNASTRY_PAIR);
    expect(keys).toHaveLength(45);
    let count = 0;
    for (const key of keys) {
      for (const type of TYPES) {
        expect(SYNASTRY_PAIR[key]?.[type]?.short).toBeTruthy();
        expect(SYNASTRY_PAIR[key]?.[type]?.long).toBeTruthy();
        count += 1;
      }
    }
    expect(count).toBe(225);
  });
});

describe("PASS 2 outer-planet readings", () => {
  it("authors exactly the 24 unordered pairs involving uranus, neptune, or pluto", () => {
    expect(OUTER_PAIRS).toHaveLength(24);
    for (const key of OUTER_PAIRS) {
      expect(SYNASTRY_PAIR[key], key).toBeTruthy();
      for (const type of TYPES) {
        expect(SYNASTRY_PAIR[key]?.[type]?.short, `${key} ${type} short`).toBeTruthy();
        expect(SYNASTRY_PAIR[key]?.[type]?.long, `${key} ${type} long`).toBeTruthy();
      }
    }
  });

  it("every outer pair x type resolves to the authored entry, never ASPECT_NATURE", () => {
    for (const key of OUTER_PAIRS) {
      const [a, b] = key.split("-") as [BodyKey, BodyKey];
      for (const type of TYPES) {
        const reading = interpretSynastryAspect(a, b, type);
        const authored = SYNASTRY_PAIR[key]![type]!;
        expect(reading.short).toBe(authored.short);
        expect(reading.long).toBe(authored.long);
        expect(reading.short).not.toBe(ASPECT_NATURE[type].short);
        expect(reading.long).not.toBe(ASPECT_NATURE[type].long);
      }
    }
  });

  it("direction-normalizes: moon-uranus and uranus-moon share the same shorts", () => {
    for (const type of TYPES) {
      expect(interpretSynastryAspect("moon", "uranus", type).short).toBe(
        interpretSynastryAspect("uranus", "moon", type).short
      );
    }
  });

  it("no duplicate shorts anywhere in the reading library, and none collide with ASPECT_NATURE", () => {
    const seen = new Map<string, string>();
    const natureShorts = new Set(TYPES.map((t) => ASPECT_NATURE[t].short));
    for (const [pair, rec] of Object.entries(SYNASTRY_PAIR)) {
      for (const type of TYPES) {
        const short = rec[type]?.short ?? "";
        expect(short.length, `${pair} ${type}`).toBeGreaterThan(0);
        expect(natureShorts.has(short), `${pair} ${type} duplicates ASPECT_NATURE`).toBe(false);
        const prior = seen.get(short);
        expect(prior, `duplicate short "${short}" at ${pair} ${type} (first: ${prior})`).toBeUndefined();
        seen.set(short, `${pair} ${type}`);
      }
    }
    expect(seen.size).toBe(225);
  });

  it("PASS 2 shorts and longs contain no U+2014", () => {
    for (const key of OUTER_PAIRS) {
      for (const type of TYPES) {
        const { short, long } = SYNASTRY_PAIR[key]![type]!;
        expect(short.includes(EM_DASH), `${key} ${type} short`).toBe(false);
        expect(long.includes(EM_DASH), `${key} ${type} long`).toBe(false);
      }
    }
  });

  it("PASS 2 copy has no sexual/romantic/possessive charge (renders on parent-child)", () => {
    for (const key of OUTER_PAIRS) {
      for (const type of TYPES) {
        const { short, long } = SYNASTRY_PAIR[key]![type]!;
        expect(short, `${key} ${type} short`).not.toMatch(ROMANTIC_WORDS);
        expect(long, `${key} ${type} long`).not.toMatch(ROMANTIC_WORDS);
      }
    }
  });
});

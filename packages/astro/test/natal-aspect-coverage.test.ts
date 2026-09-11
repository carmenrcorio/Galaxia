/**
 * Natal aspect coverage lock + authored-only reading rows.
 * Header comment numbers must match natalAspectCoverage() or this fails in CI.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  ASPECT_NATURE,
  ASPECT_PAIR,
  interpretAspect,
  natalAspectCoverage,
  selectNatalAspectGeometry,
  selectNatalAspectReadings,
  type AspectKey,
  type BodyKey,
  type Reading,
} from "../src/interpretations";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(__dirname, "../src/interpretations.ts");
const EM_DASH = "\u2014";

/** The 18 cells that shipped before batch 1. Byte-identical freeze. */
const ORIGINAL_EIGHTEEN: Array<{ a: BodyKey; b: BodyKey; aspect: AspectKey; short: string; long: string }> = [
  { a: "sun", b: "moon", aspect: "conjunction", short: "what they want and what they need agree", long: "Their identity and their emotional needs point the same way, which makes them coherent and a little unexamined." },
  { a: "sun", b: "moon", aspect: "square", short: "wants one thing, needs another", long: "What makes them proud isn't what makes them safe, and they will keep choosing the first. Ask what they need, not what they want." },
  { a: "sun", b: "moon", aspect: "opposition", short: "at odds with themselves", long: "Their public self and private self were built in different rooms. Don't take the contradiction personally; it predates you." },
  { a: "moon", b: "venus", aspect: "conjunction", short: "loves the way they feel", long: "Affection and emotional need are the same instinct in them. Withdrawing love is felt as withdrawing safety." },
  { a: "moon", b: "venus", aspect: "square", short: "wants closeness, flinches at it", long: "They reach and then retreat, and it isn't a game. Steadiness is the answer, not pursuit." },
  { a: "moon", b: "venus", aspect: "trine", short: "loves easily and knows it", long: "Warmth comes without effort. Watch that it isn't spent on people who don't return it." },
  { a: "mars", b: "venus", aspect: "conjunction", short: "desire and affection, one fire", long: "They don't separate wanting from loving. It's intense, and it burns through anything lukewarm." },
  { a: "mars", b: "venus", aspect: "square", short: "wants what unsettles them", long: "Attraction and comfort pull opposite ways here. The tension is real chemistry and also real trouble." },
  { a: "mars", b: "venus", aspect: "opposition", short: "chases what it can't hold", long: "They're drawn to what resists them. Name the pattern out loud and it loosens." },
  { a: "mars", b: "moon", aspect: "square", short: "anger sits close to hurt", long: "The heat comes up fast because the feeling did. The fight is almost never about the thing." },
  { a: "mars", b: "moon", aspect: "conjunction", short: "feels it and acts on it, instantly", long: "No gap between the emotion and the response. Give them a beat before they speak and they'll thank you." },
  { a: "mercury", b: "moon", aspect: "square", short: "can't say what they feel", long: "The words and the feeling live in different rooms, so they go quiet or clinical under pressure. Ask in writing." },
  { a: "mercury", b: "moon", aspect: "trine", short: "says the feeling plainly", long: "A rare, quiet gift: they can name what's happening inside them while it's happening." },
  { a: "saturn", b: "moon", aspect: "square", short: "learned not to need", long: "Someone taught them early that needing was unsafe, so they manage instead of asking. Offer before they ask; they won't ask." },
  { a: "saturn", b: "moon", aspect: "conjunction", short: "carries the feeling alone", long: "Emotion arrives with a weight and a duty attached. Being allowed to be a mess is the most generous thing you can give them." },
  { a: "saturn", b: "venus", aspect: "square", short: "believes love must be earned", long: "They work for affection they've already got. Say it unprompted, when they've done nothing, and watch it land." },
  { a: "pluto", b: "moon", aspect: "square", short: "feelings arrive as weather systems", long: "Emotion comes with an intensity that frightens even them. Don't fear it, and don't try to manage it for them." },
  { a: "jupiter", b: "sun", aspect: "conjunction", short: "generous, expansive, easy to like", long: "Life gives them a little more room than it gives others, and they mostly share it." },
];

describe("natalAspectCoverage lock", () => {
  it("header Coverage lock matches natalAspectCoverage()", () => {
    const src = readFileSync(SRC, "utf8");
    const match = src.match(/Coverage lock: authored=(\d+) possible=(\d+)/);
    expect(match, "interpretations.ts must contain 'Coverage lock: authored=N possible=M'").toBeTruthy();
    const coverage = natalAspectCoverage();
    expect(coverage.authored).toBe(Number(match![1]));
    expect(coverage.possible).toBe(Number(match![2]));
    expect(coverage.authored + coverage.unauthored.length).toBe(coverage.possible);
  });

  it("reports 38 authored of 225 after batch 1", () => {
    const coverage = natalAspectCoverage();
    expect(coverage.authored).toBe(38);
    expect(coverage.possible).toBe(225);
    expect(coverage.unauthored).toHaveLength(187);
  });
});

describe("existing authored natal output is byte-identical", () => {
  it("freezes the original 18 shorts and longs", () => {
    expect(ORIGINAL_EIGHTEEN).toHaveLength(18);
    for (const cell of ORIGINAL_EIGHTEEN) {
      const reading = interpretAspect(cell.a, cell.b, cell.aspect);
      expect(reading, `${cell.a}-${cell.b} ${cell.aspect}`).not.toBeNull();
      expect(reading!.short).toBe(cell.short);
      expect(reading!.long).toBe(cell.long);
    }
  });
});

describe("interpretAspect never fabricates a nature line", () => {
  it("returns null for an unauthored pair instead of ASPECT_NATURE", () => {
    const reading = interpretAspect("sun", "pluto", "square");
    expect(reading).toBeNull();
    expect(ASPECT_NATURE.square.short).toBe("friction that makes them grow");
  });

  it("new batch 1 cells resolve to authored copy, not ASPECT_NATURE", () => {
    const sample: Array<[BodyKey, BodyKey, AspectKey]> = [
      ["neptune", "pluto", "sextile"],
      ["mercury", "venus", "conjunction"],
      ["mars", "mercury", "square"],
      ["moon", "pluto", "conjunction"],
      ["pluto", "uranus", "sextile"],
    ];
    for (const [a, b, aspect] of sample) {
      const reading = interpretAspect(a, b, aspect);
      expect(reading, `${a}-${b} ${aspect}`).not.toBeNull();
      expect(reading!.short).not.toBe(ASPECT_NATURE[aspect].short);
      expect(reading!.long).not.toBe(ASPECT_NATURE[aspect].long);
    }
  });
});

describe("selectNatalAspectReadings suppresses unauthored cells", () => {
  it("omits a pair with no authored cell from rendered rows", () => {
    const aspects = [
      { from: "sun", to: "pluto", type: "square", orb: 0.1 },
      { from: "sun", to: "moon", type: "square", orb: 1.2 },
      { from: "mercury", to: "jupiter", type: "trine", orb: 0.4 },
    ];
    const rows = selectNatalAspectReadings(aspects);
    expect(rows.map((a) => `${a.from}-${a.to}:${a.type}`)).toEqual(["sun-moon:square"]);
    for (const row of rows) {
      expect(interpretAspect(row.from as BodyKey, row.to as BodyKey, row.type as AspectKey)).not.toBeNull();
    }
  });

  it("does not pad to a fixed count", () => {
    const aspects = [
      { from: "sun", to: "moon", type: "square", orb: 1 },
    ];
    expect(selectNatalAspectReadings(aspects, 14)).toHaveLength(1);
  });

  it("geometry still includes unauthored tight aspects for the wheel", () => {
    const aspects = [
      { from: "sun", to: "pluto", type: "square", orb: 0.1 },
      { from: "sun", to: "moon", type: "square", orb: 1.2 },
    ];
    const geometry = selectNatalAspectGeometry(aspects);
    expect(geometry).toHaveLength(2);
    expect(selectNatalAspectReadings(aspects)).toHaveLength(1);
  });
});

describe("natal ASPECT_PAIR copy constraints", () => {
  it("no U+2014 in any natal aspect short or long", () => {
    const hits: string[] = [];
    for (const [pair, byAspect] of Object.entries(ASPECT_PAIR)) {
      for (const [aspect, reading] of Object.entries(byAspect) as [AspectKey, Reading][]) {
        if (reading.short.includes(EM_DASH)) hits.push(`${pair} ${aspect} short`);
        if (reading.long.includes(EM_DASH)) hits.push(`${pair} ${aspect} long`);
      }
    }
    expect(hits).toEqual([]);
  });

  it("no authored short collides with ASPECT_NATURE", () => {
    const natureShorts = new Set(
      (["conjunction", "sextile", "square", "trine", "opposition"] as AspectKey[]).map(
        (t) => ASPECT_NATURE[t].short
      )
    );
    for (const [pair, byAspect] of Object.entries(ASPECT_PAIR)) {
      for (const [aspect, reading] of Object.entries(byAspect) as [AspectKey, Reading][]) {
        expect(natureShorts.has(reading.short), `${pair} ${aspect}`).toBe(false);
      }
    }
  });
});

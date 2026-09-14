import { describe, expect, it } from "vitest";
import {
  formatMomentSkyContext,
  reflectMoment
} from "../src/moment-reflection";
import type { MomentTransitSnapshot } from "../src/moment-snapshot";

function quietPair(): MomentTransitSnapshot {
  return {
    whenUTC: "2026-06-29T12:00:00.000Z",
    quiet: true,
    honesty: "ok",
    includedYou: true,
    includedThem: true,
    youHonesty: "ok",
    themHonesty: "ok",
    hits: []
  };
}

function withHits(): MomentTransitSnapshot {
  return {
    whenUTC: "2026-06-29T12:00:00.000Z",
    quiet: false,
    honesty: "ok",
    includedYou: true,
    includedThem: true,
    youHonesty: "ok",
    themHonesty: "ok",
    hits: [
      { personId: "them", whose: "them", transitBody: "saturn", natalBody: "moon", type: "square", orb: 0.4 },
      { personId: "self", whose: "you", transitBody: "venus", natalBody: "sun", type: "trine", orb: 1.1 },
      { personId: "them", whose: "them", transitBody: "mars", natalBody: "mercury", type: "conjunction", orb: 1.4 }
    ]
  };
}

const PLANET = /\b(sun|moon|mercury|venus|mars|jupiter|saturn|uranus|neptune|pluto)\b/i;
const ASPECT = /\b(conjunction|sextile|square|trine|opposition)\b/i;

describe("reflectMoment", () => {
  it("says the moment stands on its own when the sky is quiet, and names no aspect", () => {
    const text = reflectMoment({ snapshot: quietPair(), personName: "Ada", isSelf: false });
    expect(text).toContain("Nothing significant was active between you and Ada then");
    expect(text).toContain("This moment stands on its own.");
    expect(text).not.toMatch(PLANET);
    expect(text).not.toMatch(ASPECT);
  });

  it("does not take a moment type, so it cannot explain an event with a manufactured aspect", () => {
    expect(reflectMoment).toHaveLength(1);
    const text = reflectMoment({ snapshot: withHits(), personName: "Ada", isSelf: false });
    expect(text.toLowerCase()).not.toContain("hard conversation");
    expect(text.toLowerCase()).not.toContain("celebration");
    expect(text.toLowerCase()).not.toContain("because");
  });

  it("names only stored hits, capped at two, and never a third body", () => {
    const text = reflectMoment({ snapshot: withHits(), personName: "Ada", isSelf: false });
    expect(text).toContain("transiting saturn square their natal moon (0.4°)");
    expect(text).toContain("Transiting venus trine your natal sun (1.1°)");
    expect(text.toLowerCase()).not.toContain("mars");
    expect(text.toLowerCase()).not.toContain("mercury");
  });

  it("says year-only charts cannot support an orb", () => {
    const snapshot: MomentTransitSnapshot = {
      ...quietPair(),
      honesty: "year_precision",
      includedYou: false,
      includedThem: false,
      youHonesty: "absent",
      themHonesty: "year_precision"
    };
    const text = reflectMoment({ snapshot, personName: "Ada", isSelf: false });
    expect(text).toContain("year-only");
    expect(text).toContain("This moment stands on its own.");
    expect(text).not.toMatch(ASPECT);
  });
});

describe("formatMomentSkyContext", () => {
  it("lists stored proof lines for the Record and does not recompute", () => {
    const line = formatMomentSkyContext(withHits(), { personName: "Ada", isSelf: false });
    expect(line).toContain("Saturn square Moon (their, 0.4°)");
    expect(line).toContain("Venus trine Sun (your, 1.1°)");
    expect(line).toContain("Mars conjunction Mercury (their, 1.4°)");
  });
});

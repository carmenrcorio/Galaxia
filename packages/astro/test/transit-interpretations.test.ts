import type { AspectType, BodyName, TransitHit } from "../src/index";
import { describe, expect, it } from "vitest";
import { interpretTransit, transitNotation } from "../src/transit-interpretations";

const BODIES: BodyName[] = [
  "sun", "moon", "mercury", "venus", "mars",
  "jupiter", "saturn", "uranus", "neptune", "pluto",
];
const ASPECTS: AspectType[] = ["conjunction", "sextile", "square", "trine", "opposition"];

/** Harmony sign mirrors the engine's ASPECT_DEFS so fixtures stay honest. */
const HARMONY: Record<AspectType, number> = {
  conjunction: 0.6, sextile: 1.3, square: -1.2, trine: 1.7, opposition: -1.1,
};

function hit(transitBody: BodyName, natalBody: BodyName, type: AspectType, orb = 0.5): TransitHit {
  return {
    transitBody, natalBody, type, orb,
    harmony: HARMONY[type],
    summary: `${transitBody} ${type} natal ${natalBody}`,
  };
}

describe("interpretTransit — coverage (never fabricates an empty line, §12)", () => {
  it("returns a non-empty, jargon-free short + long for every real transit combination", () => {
    for (const t of BODIES) {
      for (const n of BODIES) {
        for (const a of ASPECTS) {
          const r = interpretTransit(hit(t, n, a));
          expect(r.short.length, `${t} ${a} ${n} short`).toBeGreaterThan(0);
          expect(r.long.length, `${t} ${a} ${n} long`).toBeGreaterThan(0);
          // No unresolved template token leaks to the UI.
          expect(r.short).not.toContain("{poss}");
          expect(r.long).not.toContain("{poss}");
          // Raw engine notation must not appear in the plain-language headline.
          expect(r.short.toLowerCase()).not.toContain("transiting");
          expect(r.short.toLowerCase()).not.toContain("natal");
        }
      }
    }
  });
});

describe("interpretTransit — aspect quality is accurate (§8)", () => {
  it("friction aspects (square/opposition) read as a tension via the composed fallback", () => {
    // sun→jupiter is not a curated pair, so it exercises the composed template.
    expect(interpretTransit(hit("sun", "jupiter", "square")).short).toContain("tests");
    expect(interpretTransit(hit("sun", "jupiter", "opposition")).short).toContain("tests");
  });

  it("flow aspects (trine/sextile) read as an opening via the composed fallback", () => {
    expect(interpretTransit(hit("sun", "jupiter", "trine")).short).toContain("gets a lift");
    expect(interpretTransit(hit("sun", "jupiter", "sextile")).short).toContain("gets a lift");
  });

  it("fusion (conjunction) reads as an amplified theme via the composed fallback", () => {
    expect(interpretTransit(hit("sun", "jupiter", "conjunction")).short).toContain("strong dose");
  });
});

describe("interpretTransit — curated meaning matches the real bodies", () => {
  it("renders the flagship Saturn square Uranus line (the spec example)", () => {
    expect(interpretTransit(hit("saturn", "uranus", "square"), { possessive: "their" }).short).toBe(
      "A day that tests their need for freedom against real limits — patience goes far."
    );
  });

  it("substitutes the possessive for the signed-in person", () => {
    const yours = interpretTransit(hit("saturn", "uranus", "square"), { possessive: "your" }).short;
    expect(yours).toContain("your need for freedom");
    expect(yours).not.toContain("their");
  });

  it("uses distinct wording for a flow vs a friction Saturn→Moon transit", () => {
    const friction = interpretTransit(hit("saturn", "moon", "square")).short;
    const flow = interpretTransit(hit("saturn", "moon", "trine")).short;
    expect(friction).not.toBe(flow);
    expect(friction).toContain("tested");
  });
});

describe("interpretTransit — MINOR SAFETY (§9/§13): never romance-framed for a minor", () => {
  const ROMANTIC = ["attraction", "chemistry", "desire", "seduc", "sexual", "lust", "wanting", "romantic"];

  it("skips the adult-only romantic line and produces a clean line instead", () => {
    const adult = interpretTransit(hit("mars", "venus", "conjunction"), { minorSafe: false }).short;
    const minor = interpretTransit(hit("mars", "venus", "conjunction"), { minorSafe: true }).short;
    expect(adult.toLowerCase()).toContain("attraction");
    expect(minor).not.toBe(adult);
    for (const word of ROMANTIC) expect(minor.toLowerCase()).not.toContain(word);
  });

  it("no minor-safe reading contains romantic/attraction language, across every combination", () => {
    for (const t of BODIES) {
      for (const n of BODIES) {
        for (const a of ASPECTS) {
          const r = interpretTransit(hit(t, n, a), { minorSafe: true });
          for (const word of ROMANTIC) {
            expect(r.short.toLowerCase(), `${t} ${a} ${n}`).not.toContain(word);
          }
        }
      }
    }
  });
});

describe("transitNotation — the small proof line", () => {
  it("title-cases the bodies and keeps the aspect word (no prose)", () => {
    expect(transitNotation(hit("saturn", "uranus", "square"))).toBe("Saturn square Uranus");
    expect(transitNotation(hit("venus", "moon", "trine"))).toBe("Venus trine Moon");
  });
});

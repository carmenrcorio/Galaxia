/**
 * PERMANENT REGRESSION GATE — aspect-summary list
 * (`relationshipAspectFraming` / `aspectSummaryLens` in ../compare-guidance.ts).
 *
 * Live production share (DANIEL & SARAH, platonic, token vvgfUWf_oEKLJu68AEF9rw)
 * rendered Mercury square Mars (0.9°) and Uranus square Jupiter (1.0°) with
 * byte-identical body text, because the lens was RELATION_ASPECT_FRAME[relType]
 * (one catches string per relationship type). Same class of bug as the
 * ASPECT_ACTION leadBody collapse: the lookup ignored the actual unordered pair.
 *
 * This file does not edit ASPECT_ACTION. It asserts the summary table is keyed
 * on PAIR_KEY and that no two distinct pairs share a lens for a given nature.
 */
import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import { computeNatalChart, type BodyName } from "../index";
import {
  aspectSummaryLens,
  relationshipAspectFraming,
  relationshipWatchLine,
  whatTheyNeed,
  RELATION_BODY_PRIORITY,
  type RelationType,
} from "../compare-guidance";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BODIES: BodyName[] = (() => {
  const chart = computeNatalChart({
    dateUTC: "1990-06-15T12:00:00Z",
    precision: "exact",
    lat: 40.7,
    lng: -74.0,
  });
  return [...new Set(chart.placements.map((p) => p.body))];
})();

const RELATION_TYPES = Object.keys(RELATION_BODY_PRIORITY) as RelationType[];

function pairKey(a: string, b: string): string {
  return [a.toLowerCase(), b.toLowerCase()].sort().join("-");
}

describe("aspect-summary pair key (DANIEL & SARAH reproduction)", () => {
  const synastry = {
    aspects: [
      { from: "mercury", to: "mars", type: "square", orb: 0.9, harmony: -1 },
      { from: "uranus", to: "jupiter", type: "square", orb: 1.0, harmony: -1 },
      { from: "moon", to: "jupiter", type: "trine", orb: 2.0, harmony: 0.8 },
    ],
  };

  it("Mercury-Mars and Uranus-Jupiter platonic catches render distinct bodies", () => {
    const framing = relationshipAspectFraming(synastry, "platonic", "DANIEL", "SARAH");
    const mercuryMars = framing.find(
      (f) => pairKey(f.aspect.from, f.aspect.to) === "mars-mercury"
    );
    const uranusJupiter = framing.find(
      (f) => pairKey(f.aspect.from, f.aspect.to) === "jupiter-uranus"
    );
    expect(mercuryMars).toBeDefined();
    expect(uranusJupiter).toBeDefined();
    const lensOf = (text: string) => text.replace(/^.*?°\)\s*/, "");
    expect(lensOf(mercuryMars!.text)).not.toBe(lensOf(uranusJupiter!.text));
    expect(lensOf(mercuryMars!.text)).not.toContain("talk past each other");
    expect(lensOf(uranusJupiter!.text)).not.toContain("talk past each other");
    expect(aspectSummaryLens(mercuryMars!.aspect, "platonic")).not.toBe(
      aspectSummaryLens(uranusJupiter!.aspect, "platonic")
    );
  });
});

describe("aspectSummaryLens never collapses two pairs", () => {
  it("authors a unique flows lens and a unique catches lens per unordered pair", () => {
    for (const flows of [true, false]) {
      const seen = new Map<string, string>();
      for (let i = 0; i < BODIES.length; i++) {
        for (let j = i; j < BODIES.length; j++) {
          const from = BODIES[i]!;
          const to = BODIES[j]!;
          const lens = aspectSummaryLens(
            { from, to, harmony: flows ? 1 : -1 },
            "platonic"
          );
          const key = pairKey(from, to);
          const prev = [...seen.entries()].find(([, v]) => v === lens);
          expect(
            prev,
            `${flows ? "flows" : "catches"} ${key} collided with ${prev?.[0]}`
          ).toBeUndefined();
          seen.set(key, lens);
        }
      }
    }
  });

  it("does not fall through to RELATION_ASPECT_FRAME for any engine body pair", () => {
    const src = fs.readFileSync(path.join(__dirname, "../compare-guidance.ts"), "utf8");
    const start = src.indexOf("const ASPECT_SUMMARY_FRAME:");
    expect(start).toBeGreaterThan(0);
    const authored = new Set<string>();
    const pairPattern = /PAIR_KEY\(\s*"([a-z]+)"\s*,\s*"([a-z]+)"\s*\)/g;
    const table = src.slice(start, src.indexOf("export function aspectSummaryLens"));
    let m: RegExpExecArray | null;
    while ((m = pairPattern.exec(table))) {
      authored.add(pairKey(m[1]!, m[2]!));
    }
    const needed = new Set<string>();
    for (let i = 0; i < BODIES.length; i++) {
      for (let j = i; j < BODIES.length; j++) {
        needed.add(pairKey(BODIES[i]!, BODIES[j]!));
      }
    }
    expect(authored).toEqual(needed);
    expect(RELATION_TYPES.length).toBeGreaterThan(0);
  });
});

describe("relationshipWatchLine is pair-level, not per-person", () => {
  const scores = {
    overall: 55,
    emotional: 48,
    communication: 50,
    warmth: 55,
    values: 60,
    stability: 58,
  };
  const synastry = {
    aspects: [
      { from: "mercury", to: "mars", type: "square", orb: 0.9, harmony: -0.8 },
      { from: "venus", to: "moon", type: "trine", orb: 1.8, harmony: 0.7 },
    ],
    houseOverlays: { aInB: [], bInA: [] },
    elementBalance: {
      a: { fire: 0, earth: 0, air: 0, water: 0 },
      b: { fire: 0, earth: 0, air: 0, water: 0 },
    },
    scores,
  } as never;
  const daniel = { display_name: "DANIEL", moon: "Leo" };
  const sarah = { display_name: "SARAH", moon: "Cancer" };

  it("whatTheyNeed no longer duplicates the platonic closer into each card", () => {
    const d = whatTheyNeed(scores, daniel, "platonic", synastry);
    const s = whatTheyNeed(scores, sarah, "platonic", synastry);
    expect(d).not.toContain("the real signal to watch");
    expect(s).not.toContain("the real signal to watch");
    expect(d).not.toBe(s);
  });

  it("relationshipWatchLine returns that closer once, identical for the pair", () => {
    const line = relationshipWatchLine(scores, "platonic", synastry);
    expect(line).toContain("mercury-mars square (0.9°)");
    expect(line).toContain("the real signal to watch");
    expect(relationshipWatchLine(scores, "friends", synastry)).toBeNull();
  });
});

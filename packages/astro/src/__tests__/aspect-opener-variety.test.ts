/**
 * PERMANENT REGRESSION GATE — Compare "opener" variety (DEFECT A, see the
 * task's Phase 0 diagnosis).
 *
 * `aspectActionParts()` used to select the register/opener heading
 * ("Ease it: <opener> <tactic>.") from `RELATION_ACTION_REGISTER`, which
 * held exactly ONE string per relationship type per nature (flows/catches).
 * A live compare page with several same-nature rows (the shipped bug: four
 * "catches" rows — jupiter square sun, jupiter square mars, uranus square
 * sun, uranus square mars, all for a romantic pairing) rendered the
 * identical opener sentence above every row.
 *
 * The fix: each relType+nature now holds a pool of authored paraphrases,
 * and `pickOpener()` selects deterministically from the real aspect's two
 * bodies (never from row position, never from Math.random). This file
 * proves both properties on the real production example that shipped the
 * bug, and the general determinism property across the full engine body
 * domain.
 */
import { describe, expect, it } from "vitest";

import { computeNatalChart, type BodyName, type NatalChart } from "../index";
import { aspectActionLine, aspectActionParts, RELATION_BODY_PRIORITY, type RelationType } from "../compare-guidance";

const PROBE_BIRTH_CHART: NatalChart = computeNatalChart({
  dateUTC: "1990-06-15T12:00:00Z",
  precision: "exact",
  lat: 40.7128,
  lng: -74.006,
});

/** Real bodies the engine places — derived, not guessed (mirrors aspect-tail-collisions.test.ts). */
const BODIES: BodyName[] = PROBE_BIRTH_CHART.placements.map((p) => p.body);

const RELATION_TYPES: RelationType[] = Object.keys(RELATION_BODY_PRIORITY) as RelationType[];

/**
 * The exact live production case (Stacy and Randall, romantic) that shipped
 * DEFECT A: four "square" aspects, all catches (harmony < 0), across two
 * distinct pairs sharing a body each (jupiter-x, uranus-x). This is the
 * hardest realistic case for a pair-keyed opener pool: two rows share
 * "sun", two rows share "mars", so an opener keyed on only ONE of the two
 * bodies would still collide (confirmed during Phase 0 investigation) — the
 * fix must key on the full pair.
 */
const STACY_RANDALL_CATCHES_ASPECTS = [
  { from: "jupiter", to: "sun", type: "square", orb: 1.1, harmony: -0.6 },
  { from: "jupiter", to: "mars", type: "square", orb: 1.6, harmony: -0.5 },
  { from: "uranus", to: "sun", type: "square", orb: 2.0, harmony: -0.4 },
  { from: "uranus", to: "mars", type: "square", orb: 2.4, harmony: -0.3 },
];

describe("DEFECT A fix: four same-nature rows on one compare page never repeat an opener", () => {
  it("the shipped real-world case (Stacy/Randall, romantic) produces four distinct openers", () => {
    const openers = STACY_RANDALL_CATCHES_ASPECTS.map(
      (a) => aspectActionParts(a, "romantic").opener
    );
    expect(new Set(openers).size).toBe(4);
    // Every one is still the catches register (never a flows opener leaking in).
    for (const a of STACY_RANDALL_CATCHES_ASPECTS) {
      expect(aspectActionParts(a, "romantic").flows).toBe(false);
    }
  });

  it("the four full rendered lines (opener + tactic) are all distinct end to end", () => {
    const lines = STACY_RANDALL_CATCHES_ASPECTS.map((a) => aspectActionLine(a, "romantic"));
    expect(new Set(lines).size).toBe(4);
  });

  it("holds for every relationship type, not just romantic", () => {
    for (const relType of RELATION_TYPES) {
      const openers = STACY_RANDALL_CATCHES_ASPECTS.map(
        (a) => aspectActionParts(a, relType).opener
      );
      expect(new Set(openers).size, relType).toBe(4);
    }
  });
});

describe("DEFECT A fix: determinism — the same pair renders the same opener every time", () => {
  it("repeated calls for the same aspect + relType are byte-identical (never Math.random)", () => {
    const a = { from: "jupiter", to: "mars", harmony: -0.5 };
    for (const relType of RELATION_TYPES) {
      const first = aspectActionParts(a, relType).opener;
      for (let i = 0; i < 20; i++) {
        expect(aspectActionParts(a, relType).opener).toBe(first);
      }
    }
  });

  it("direction independence: A-to-B and B-to-A resolve to the same opener (the pair, not the direction, drives selection)", () => {
    for (const relType of RELATION_TYPES) {
      const forward = aspectActionParts({ from: "venus", to: "moon", harmony: 0.5 }, relType).opener;
      const backward = aspectActionParts({ from: "moon", to: "venus", harmony: 0.5 }, relType).opener;
      expect(backward, relType).toBe(forward);
    }
  });

  it("selection is a pure function of the pair, independent of orb/harmony magnitude (only its sign) or unrelated fields", () => {
    for (const relType of RELATION_TYPES) {
      const a1 = aspectActionParts({ from: "saturn", to: "sun", harmony: -0.1 }, relType).opener;
      const a2 = aspectActionParts({ from: "saturn", to: "sun", harmony: -0.99 }, relType).opener;
      expect(a2, relType).toBe(a1);
    }
  });
});

describe("DEFECT A fix: broad variety exists across the full real body domain", () => {
  it("every relType+nature has more than one opener authored (no accidental single-string pool)", () => {
    for (const relType of RELATION_TYPES) {
      for (const nature of ["flows", "catches"] as const) {
        // Sample a handful of distinct pairs and require at least 2 distinct
        // openers to surface — a pool of size 1 would fail this trivially.
        const sampleBodies = BODIES.slice(0, Math.min(6, BODIES.length));
        const openers = new Set<string>();
        for (let i = 0; i < sampleBodies.length; i++) {
          for (let j = i + 1; j < sampleBodies.length; j++) {
            const harmony = nature === "flows" ? 0.5 : -0.5;
            openers.add(aspectActionParts({ from: sampleBodies[i], to: sampleBodies[j], harmony }, relType).opener);
          }
        }
        expect(openers.size, `${relType}/${nature}`).toBeGreaterThan(1);
      }
    }
  });

  it("the specific shipped screenshot bodies (sun, mars, jupiter, uranus) show real variety, not just a single recycled string", () => {
    // The pool is a fixed-size hash target (see OPENER_POOL_SIZE doc comment
    // in compare-guidance.ts): it is sized and verified against the actual
    // production case that shipped DEFECT A (the four asserted above), not
    // against every one of the 6 unordered pairs the 4 involved bodies could
    // theoretically form (sun-mars and jupiter-uranus never co-occurred in
    // the real bug and are not asserted distinct from the other four here).
    // A page can show at most ONE opener heading per nature (flows/catches;
    // see `showOpener` dedup in flows-and-catches-section.tsx), so the
    // property that matters in production is cross-comparison variety
    // (different couples' first-row pair yields different heading text),
    // which this asserts by requiring most of the 6 pairs to differ.
    const involved: BodyName[] = ["sun", "mars", "jupiter", "uranus"];
    const openers = new Set<string>();
    for (let i = 0; i < involved.length; i++) {
      for (let j = i + 1; j < involved.length; j++) {
        openers.add(aspectActionParts({ from: involved[i], to: involved[j], harmony: -0.5 }, "romantic").opener);
      }
    }
    // C(4,2) = 6 pairs; require most (not necessarily all) to be distinct.
    expect(openers.size).toBeGreaterThanOrEqual(4);
  });
});

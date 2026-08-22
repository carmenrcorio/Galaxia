/**
 * PHASE 0 — build-time collision test for the Compare aspect-tail resolver
 * (`aspectActionParts()` in ../compare-guidance.ts).
 *
 * TEST ONLY. No copy authored, no resolver logic changed. This file only
 * reads ../compare-guidance.ts (never imports its private `ASPECT_ACTION`
 * table, never edits it) and calls the real, exported `computeNatalChart` /
 * `computeSynastry` / `aspectActionParts` functions.
 *
 * WHAT THIS PROVES (see BACKGROUND in the task): `aspectActionParts()`
 * resolves a tactic in two tiers —
 *   Tier 1: ASPECT_ACTION[PAIR_KEY(from,to)]      — authored per body-PAIR.
 *   Tier 2: BODY_FRICTION_ACTION / BODY_FLOW_ACTION[leadBody(from,to,relType)]
 *           — keyed on a SINGLE body (the priority-winning body of the pair).
 * Because Tier 2 keys on one body, every unauthored pair that shares a
 * leadBody winner (under a given relType + flow direction) collapses onto
 * byte-identical tactic text, even though the two pairs are genuinely
 * different aspects.
 *
 * DOMAIN DERIVATION — nothing below is a guessed/hardcoded body or
 * aspect-type list:
 *   - BODIES come from a real `computeNatalChart()` call (the same function
 *     production code uses to build a chart) — whatever bodies the engine
 *     actually places is the domain, not a copied-in array.
 *   - ASPECT_TYPES come from sweeping the full 0-360° separation space
 *     through the real `computeSynastry()` (the exact function that
 *     generates the `aspects[]` a Compare report reads) and recording every
 *     distinct `.type` it resolves, plus the separation at which each type
 *     is closest to exact (orb -> 0). This is where synastry aspects are
 *     generated in the engine (packages/astro/src/index.ts).
 *   - RELATION_TYPES come from `Object.keys(RELATION_BODY_PRIORITY)`, the
 *     exported `Record<RelationType, string[]>` — TypeScript enforces that
 *     record has a key for every RelationType, so this can never silently
 *     drop a relationship type the resolver actually serves.
 *
 * SCOPE OF "DISTINCT ASPECTS" FOR THE COLLISION ASSERTION: within one real
 * Compare report (one fixed pair of charts), the aspect TYPE for a given
 * body PAIR is whatever the two charts' actual angle produces — at most one
 * type per pair per report (the 5 angle windows in ASPECT_DEFS do not
 * overlap). Two aspects are only ever reachable *together* in the same
 * report when they involve DIFFERENT body pairs (e.g. jupiter-mars AND
 * mars-uranus, the confirmed live example). So "distinct aspects reachable
 * in the same report" is scoped to distinct, unordered (from,to) body
 * pairs — never two aspect types of the very same pair (which can't
 * co-occur in one report anyway, and which Tier 1 deliberately renders
 * identically on purpose: one authored `flows` string and one `catches`
 * string per pair, regardless of aspect type — that is documented,
 * intentional behavior, not the structural bug under test here).
 *
 * The full (from,to,type,relType) grid is still built and used for the
 * required counts (Tier-2 fallback volume, Tier-1 authored-vs-possible
 * pairs).
 */
import { beforeAll, describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import {
  computeNatalChart,
  computeSynastry,
  type AspectType,
  type BodyName,
  type NatalChart,
} from "../index";
import {
  aspectActionParts,
  RELATION_BODY_PRIORITY,
  type RelationType,
} from "../compare-guidance";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const COMPARE_GUIDANCE_PATH = path.join(__dirname, "..", "compare-guidance.ts");

// ─────────────────────────────────────────────────────────────────────────
// Domain derivation — real engine output, no guessed lists.
// ─────────────────────────────────────────────────────────────────────────

/** A throwaway "exact" chart used only to read off the engine's real body set. */
const PROBE_BIRTH_CHART: NatalChart = computeNatalChart({
  dateUTC: "1990-06-15T12:00:00Z",
  precision: "exact",
  lat: 40.7128,
  lng: -74.006,
});

/** The real bodies the engine places — pulled from computeNatalChart(), not guessed. */
const BODIES: BodyName[] = PROBE_BIRTH_CHART.placements.map((p) => p.body);

/** Minimal synthetic chart: one placement, one controllable longitude. Only
 * `placements[].{body,lon}` and (unused here) `.cusps` are read by
 * computeSynastry(), so the rest of the fields are inert filler that
 * satisfies the NatalChart/Placement shape. */
function singleBodyChart(body: BodyName, lon: number): NatalChart {
  return {
    placements: [
      {
        body,
        lon: ((lon % 360) + 360) % 360,
        sign: "Aries",
        degree: 0,
        retro: false,
        confident: true,
      },
    ],
    precision: "exact",
    generational: PROBE_BIRTH_CHART.generational,
  };
}

interface TypeRep {
  /** Separation (deg) at which this type is observed closest to exact. */
  sep: number;
  orb: number;
}

/** Sweep the full separation space through the real computeSynastry() and
 * record every distinct AspectType it resolves, plus the closest-to-exact
 * separation for each — this is "derived from the engine", not a copied-in
 * angle table. */
function deriveAspectTypesFromEngine(): Map<AspectType, TypeRep> {
  const found = new Map<AspectType, TypeRep>();
  const probeBody = BODIES[0];
  for (let sep = 0; sep < 360; sep += 0.5) {
    const chartA = singleBodyChart(probeBody, 0);
    const chartB = singleBodyChart(probeBody, sep);
    const { aspects } = computeSynastry(chartA, chartB);
    for (const asp of aspects) {
      const existing = found.get(asp.type);
      if (!existing || asp.orb < existing.orb) {
        found.set(asp.type, { sep, orb: asp.orb });
      }
    }
  }
  return found;
}

const ASPECT_TYPE_REPS = deriveAspectTypesFromEngine();
const ASPECT_TYPES: AspectType[] = Array.from(ASPECT_TYPE_REPS.keys());

/** Every RelationType the resolver serves — derived from the exhaustive,
 * compiler-enforced Record so a new RelationType can never be silently
 * missing from this domain. */
const RELATION_TYPES: RelationType[] = Object.keys(RELATION_BODY_PRIORITY) as RelationType[];

function canonicalPairKey(a: BodyName, b: BodyName): string {
  return [a, b].slice().sort().join("-");
}

/** Every unordered (including same-body) pair the engine's from×to cross
 * product over BODIES can produce. */
const PAIRS: { a: BodyName; b: BodyName; key: string }[] = [];
for (let i = 0; i < BODIES.length; i++) {
  for (let j = i; j < BODIES.length; j++) {
    const a = BODIES[i];
    const b = BODIES[j];
    PAIRS.push({ a, b, key: canonicalPairKey(a, b) });
  }
}
const TOTAL_POSSIBLE_PAIRS = PAIRS.length;

// ─────────────────────────────────────────────────────────────────────────
// Tier-1 authored-pair census — read ../compare-guidance.ts SOURCE TEXT only
// (never imported, never modified) to count which PAIR_KEY(...) pairs are
// currently authored in ASPECT_ACTION. Purely introspective; keeps this
// test honest as the authored table grows without needing to export a
// private resolver constant or duplicate its contents by hand.
// ─────────────────────────────────────────────────────────────────────────
function readAuthoredTier1Pairs(): Set<string> {
  const source = fs.readFileSync(COMPARE_GUIDANCE_PATH, "utf8");
  const startMarker = "const ASPECT_ACTION: Record<string, { flows: string; catches: string }> = {";
  const start = source.indexOf(startMarker);
  if (start === -1) {
    throw new Error(
      "aspect-tail-collisions.test.ts: could not locate the ASPECT_ACTION table in compare-guidance.ts — has it been renamed/restructured?"
    );
  }
  const end = source.indexOf("\n};", start);
  if (end === -1) {
    throw new Error("aspect-tail-collisions.test.ts: could not find the end of the ASPECT_ACTION table.");
  }
  const block = source.slice(start, end);
  const pairPattern = /PAIR_KEY\(\s*"([a-z]+)"\s*,\s*"([a-z]+)"\s*\)/g;
  const authored = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = pairPattern.exec(block)) !== null) {
    authored.add(canonicalPairKey(match[1] as BodyName, match[2] as BodyName));
  }
  return authored;
}

const AUTHORED_TIER1_PAIRS = readAuthoredTier1Pairs();

// ─────────────────────────────────────────────────────────────────────────
// Build the real (from,to,type) Aspect probes via the actual computeSynastry()
// resolver — one per pair × aspect type, at the engine-derived exact-ish
// separation for that type.
// ─────────────────────────────────────────────────────────────────────────
interface ProbeAspect {
  from: BodyName;
  to: BodyName;
  type: AspectType;
  harmony: number;
  orb: number;
}

function buildProbeAspects(): ProbeAspect[] {
  const probes: ProbeAspect[] = [];
  for (const { a, b } of PAIRS) {
    for (const type of ASPECT_TYPES) {
      const rep = ASPECT_TYPE_REPS.get(type)!;
      const chartA = singleBodyChart(a, 0);
      const chartB = singleBodyChart(b, rep.sep);
      const { aspects } = computeSynastry(chartA, chartB);
      const found = aspects.find((asp) => asp.type === type);
      if (!found) {
        // Should not happen: `rep.sep` was derived specifically to produce
        // this type. Surface loudly rather than silently under-counting.
        throw new Error(
          `aspect-tail-collisions.test.ts: expected computeSynastry(${a},${b}) at sep=${rep.sep} to produce a "${type}" aspect, but got: ${JSON.stringify(aspects)}`
        );
      }
      probes.push({ from: a, to: b, type, harmony: found.harmony, orb: found.orb });
    }
  }
  return probes;
}

let PROBE_ASPECTS: ProbeAspect[];

// ─────────────────────────────────────────────────────────────────────────
// Resolve every probe through the REAL aspectActionParts(), for every
// relType, and group by (relType, tactic text) to find collisions.
// ─────────────────────────────────────────────────────────────────────────
interface PairEntry {
  from: BodyName;
  to: BodyName;
  types: Set<AspectType>;
  authoredTier1: boolean;
}

interface CollisionCluster {
  relType: RelationType;
  tactic: string;
  pairs: PairEntry[];
}

let COLLISION_CLUSTERS: CollisionCluster[];
let TOTAL_COMBOS = 0;
let TIER1_COMBOS = 0;
let TIER2_COMBOS = 0;

beforeAll(() => {
  PROBE_ASPECTS = buildProbeAspects();

  const clusters: CollisionCluster[] = [];

  for (const relType of RELATION_TYPES) {
    // tactic text -> canonical pair key -> entry
    const byTactic = new Map<string, Map<string, PairEntry>>();

    for (const probe of PROBE_ASPECTS) {
      TOTAL_COMBOS += 1;
      const pairKey = canonicalPairKey(probe.from, probe.to);
      const authored = AUTHORED_TIER1_PAIRS.has(pairKey);
      if (authored) TIER1_COMBOS += 1;
      else TIER2_COMBOS += 1;

      const { tactic } = aspectActionParts({ from: probe.from, to: probe.to, harmony: probe.harmony }, relType);
      if (!tactic) continue; // no line at all — not a collision, just absent

      let group = byTactic.get(tactic);
      if (!group) {
        group = new Map();
        byTactic.set(tactic, group);
      }
      let entry = group.get(pairKey);
      if (!entry) {
        entry = { from: probe.from, to: probe.to, types: new Set(), authoredTier1: authored };
        group.set(pairKey, entry);
      }
      entry.types.add(probe.type);
    }

    for (const [tactic, group] of byTactic) {
      if (group.size >= 2) {
        clusters.push({ relType, tactic, pairs: Array.from(group.values()) });
      }
    }
  }

  COLLISION_CLUSTERS = clusters;

  // ── Print the full collision + count report (STOP deliverable). ──
  // eslint-disable-next-line no-console
  console.log("\n================ ASPECT-TAIL TACTIC COLLISION REPORT ================\n");
  const byRel = new Map<RelationType, CollisionCluster[]>();
  for (const c of COLLISION_CLUSTERS) {
    const list = byRel.get(c.relType) ?? [];
    list.push(c);
    byRel.set(c.relType, list);
  }
  for (const relType of RELATION_TYPES) {
    const clustersForRel = byRel.get(relType) ?? [];
    // eslint-disable-next-line no-console
    console.log(`--- relType: ${relType} (${clustersForRel.length} collision cluster(s)) ---`);
    for (const c of clustersForRel) {
      // eslint-disable-next-line no-console
      console.log(`  Tactic: "${c.tactic}"`);
      for (const p of c.pairs) {
        // eslint-disable-next-line no-console
        console.log(
          `    - ${p.from}\u2013${p.to} (types: ${Array.from(p.types).join(", ")}; ${p.authoredTier1 ? "Tier 1 (authored)" : "Tier 2 (fallback)"})`
        );
      }
    }
    // eslint-disable-next-line no-console
    if (clustersForRel.length === 0) console.log("  (none)");
  }

  const unauthoredPairs = TOTAL_POSSIBLE_PAIRS - AUTHORED_TIER1_PAIRS.size;
  // eslint-disable-next-line no-console
  console.log("\n================ COUNTS ================\n");
  // eslint-disable-next-line no-console
  console.log(`Total possible unordered body pairs (from ${BODIES.length} bodies): ${TOTAL_POSSIBLE_PAIRS}`);
  // eslint-disable-next-line no-console
  console.log(`Tier-1 authored pairs (ASPECT_ACTION entries): ${AUTHORED_TIER1_PAIRS.size}`);
  // eslint-disable-next-line no-console
  console.log(`Tier-1 UNauthored pairs (fall to Tier 2 fallback): ${unauthoredPairs}`);
  // eslint-disable-next-line no-console
  console.log(`Aspect types derived from the engine: ${ASPECT_TYPES.join(", ")} (${ASPECT_TYPES.length})`);
  // eslint-disable-next-line no-console
  console.log(`RelationTypes served by the resolver: ${RELATION_TYPES.join(", ")} (${RELATION_TYPES.length})`);
  // eslint-disable-next-line no-console
  console.log(`Total (from,to,type,relType) combos in domain: ${TOTAL_COMBOS}`);
  // eslint-disable-next-line no-console
  console.log(`  -> resolved via Tier 1 (authored pair): ${TIER1_COMBOS}`);
  // eslint-disable-next-line no-console
  console.log(`  -> resolved via Tier 2 (single-body fallback): ${TIER2_COMBOS}`);
  // eslint-disable-next-line no-console
  console.log(`Total collision clusters (relType x tactic shared by >=2 distinct body pairs): ${COLLISION_CLUSTERS.length}`);
  // eslint-disable-next-line no-console
  console.log("\n=======================================================================\n");
});

describe("aspectActionParts() collision domain", () => {
  it("derives a non-trivial domain from the real engine (sanity check, not the finding)", () => {
    expect(BODIES.length).toBeGreaterThan(0);
    expect(ASPECT_TYPES.length).toBeGreaterThan(0);
    expect(RELATION_TYPES.length).toBeGreaterThan(0);
    expect(TOTAL_POSSIBLE_PAIRS).toBe((BODIES.length * (BODIES.length + 1)) / 2);
  });

  /**
   * THE FINDING. This is expected to FAIL on the current resolver — that
   * failure IS the deliverable for Phase 0 (see console output above for
   * the full collision report). Do not "fix" this by editing the resolver
   * or authoring copy here; Phase 0 is report-only.
   */
  it("never lets two distinct body pairs collapse onto the same tactic text for a given relType", () => {
    expect(COLLISION_CLUSTERS).toEqual([]);
  });
});

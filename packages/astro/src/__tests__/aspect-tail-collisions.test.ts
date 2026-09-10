/**
 * PERMANENT REGRESSION GATE — build-time collision test for the Compare
 * aspect-tail resolver (`aspectActionParts()` in ../compare-guidance.ts).
 *
 * Originated as a Phase 0 diagnostic that was expected to fail (36 of 55
 * body pairs were unauthored and collapsed onto shared Tier-2 fallback
 * text). Phase 1 authored all 36 remaining ASPECT_ACTION pairs, so this
 * file now asserts the fixed point: every real pair resolves via Tier 1,
 * and no two distinct body pairs ever collapse onto the same tactic text
 * for a given relType. A future PAIR_KEY that loses its ASPECT_ACTION entry
 * (new BodyName added to the engine, or an entry accidentally deleted)
 * fails CI here before it ships.
 *
 * TEST ONLY. No copy authored here, no resolver logic changed. This file
 * only reads ../compare-guidance.ts (never imports its private
 * `ASPECT_ACTION` table, never edits it) and calls the real, exported
 * `computeNatalChart` / `computeSynastry` / `aspectActionParts` /
 * `interpretSynastryAspect` / `selectCompareAspectRows` functions.
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
  interpretSynastryAspect,
  type AspectType,
  type BodyName,
  type NatalChart,
} from "../index";
import { ASPECT_NATURE } from "../interpretations";
import {
  aspectActionLine,
  aspectActionParts,
  RELATION_BODY_PRIORITY,
  selectCompareAspectRows,
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
   * PERMANENT REGRESSION GATE: every enumerated (from,to) pair the engine
   * can produce must be Tier-1 authored, so Tier 2 (BODY_FRICTION_ACTION /
   * BODY_FLOW_ACTION) is unreachable for any pair this grid enumerates.
   * Fails the moment a real pair falls back to Tier 2 — e.g. a new BodyName
   * added to the engine without a matching ASPECT_ACTION entry.
   */
  it("every enumerated (from,to) pair resolves via Tier 1 — Tier 2 fallback is unreachable for real pairs", () => {
    expect(AUTHORED_TIER1_PAIRS.size).toBe(TOTAL_POSSIBLE_PAIRS);
    expect(TIER2_COMBOS).toBe(0);
    expect(TIER1_COMBOS).toBe(TOTAL_COMBOS);
  });

  /**
   * THE GATE. Originated as "THE FINDING" in Phase 0, expected to fail by
   * design (see the collision report printed above). Now that every pair is
   * Tier-1 authored, no two distinct body pairs may collapse onto the same
   * tactic text for a given relType — a future regression (e.g. two
   * ASPECT_ACTION entries copy-pasted identically) fails this assertion.
   */
  it("never lets two distinct body pairs collapse onto the same tactic text for a given relType", () => {
    expect(COLLISION_CLUSTERS).toEqual([]);
  });

  /**
   * Same uniqueness gate, but on the FULL rendered action line
   * (`opener + tactic`, what `aspectActionLine` concatenates) rather than the
   * authored tactic tail alone. The previous gate missed collisions that only
   * appear after the register opener is applied.
   */
  it("never lets two distinct body pairs collapse onto the same full rendered action line for a given relType", () => {
    const clusters: { relType: RelationType; line: string; pairs: string[] }[] = [];
    for (const relType of RELATION_TYPES) {
      const byLine = new Map<string, Set<string>>();
      for (const probe of PROBE_ASPECTS) {
        const pairKey = canonicalPairKey(probe.from, probe.to);
        const line = aspectActionLine(
          { from: probe.from, to: probe.to, harmony: probe.harmony },
          relType
        );
        if (!line.trim()) continue;
        let group = byLine.get(line);
        if (!group) {
          group = new Set();
          byLine.set(line, group);
        }
        group.add(pairKey);
      }
      for (const [line, group] of byLine) {
        if (group.size >= 2) clusters.push({ relType, line, pairs: Array.from(group) });
      }
    }
    expect(clusters).toEqual([]);
  });
});

function renderRowString(
  aspect: { from: string; to: string; type: string; harmony: number },
  relType: RelationType
): { short: string; full: string; fallback: boolean } {
  const type = aspect.type.toLowerCase() as AspectType;
  const reading = interpretSynastryAspect(
    aspect.from.toLowerCase() as BodyName,
    aspect.to.toLowerCase() as BodyName,
    type
  );
  const { flows, tactic } = aspectActionParts(aspect, relType);
  const line = aspectActionLine(aspect, relType);
  const nature = ASPECT_NATURE[type];
  return {
    short: reading.short,
    full: `${reading.short}\n${flows ? "Nurture it: " : "Ease it: "}${tactic}.\n${line}`,
    fallback: Boolean(nature && reading.short === nature.short && reading.long === nature.long),
  };
}

describe("reading-layer collision domain", () => {
  const DISTINCT_PAIRS = PAIRS.filter((p) => p.a !== p.b);

  it("every distinct unordered pair x aspect type resolves to an authored reading, never ASPECT_NATURE", () => {
    for (const { a, b } of DISTINCT_PAIRS) {
      for (const type of ASPECT_TYPES) {
        const reading = interpretSynastryAspect(a, b, type);
        const nature = ASPECT_NATURE[type];
        expect(reading.short, `${a}-${b} ${type}`).not.toBe(nature.short);
        expect(reading.long, `${a}-${b} ${type}`).not.toBe(nature.long);
      }
    }
  });

  it("no two distinct (pair, type) cells share a reading short", () => {
    const seen = new Map<string, string>();
    for (const { a, b, key } of DISTINCT_PAIRS) {
      for (const type of ASPECT_TYPES) {
        const short = interpretSynastryAspect(a, b, type).short;
        const prior = seen.get(short);
        expect(prior, `duplicate short "${short}" at ${key} ${type} (first: ${prior})`).toBeUndefined();
        seen.set(short, `${key} ${type}`);
      }
    }
    expect(seen.size).toBe(DISTINCT_PAIRS.length * ASPECT_TYPES.length);
  });

  it("selectCompareAspectRows drops same-body and keeps the tighter orb of a directed reverse", () => {
    const rows = selectCompareAspectRows(
      [
        { from: "moon", to: "uranus", type: "square", orb: 2.0, harmony: -1 },
        { from: "uranus", to: "moon", type: "square", orb: 0.4, harmony: -1 },
        { from: "sun", to: "sun", type: "conjunction", orb: 0.1, harmony: 1 },
        { from: "venus", to: "mars", type: "trine", orb: 1.0, harmony: 1 },
      ],
      "friends",
      6
    );
    expect(rows.map((r) => `${r.from}-${r.to}-${r.type}-${r.orb}`)).toEqual([
      "uranus-moon-square-0.4",
      "venus-mars-trine-1",
    ]);
  });

  it("selectCompareAspectRows keeps both types when the same unordered pair aspects twice", () => {
    const rows = selectCompareAspectRows(
      [
        { from: "moon", to: "uranus", type: "trine", orb: 1.2, harmony: 1 },
        { from: "uranus", to: "moon", type: "square", orb: 0.8, harmony: -1 },
      ],
      "friends",
      6
    );
    expect(rows).toHaveLength(2);
  });
});

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("200-pair compare report simulation", () => {
  it("renders zero ASPECT_NATURE fallbacks and zero duplicate shorts in a single report", () => {
    const rng = mulberry32(20260910);
    const relCycle = RELATION_TYPES;
    let displayed = 0;
    let fallback = 0;
    let reportsWithDupShort = 0;
    let reportsWithDupFull = 0;

    for (let i = 0; i < 200; i++) {
      const yearA = 1800 + Math.floor(rng() * (2027 - 1800 + 1));
      const yearB = 1800 + Math.floor(rng() * (2027 - 1800 + 1));
      const monthA = 1 + Math.floor(rng() * 12);
      const monthB = 1 + Math.floor(rng() * 12);
      const dayA = 1 + Math.floor(rng() * 28);
      const dayB = 1 + Math.floor(rng() * 28);
      const pad = (n: number) => String(n).padStart(2, "0");
      const chartA = computeNatalChart({
        dateUTC: `${yearA}-${pad(monthA)}-${pad(dayA)}T12:00:00Z`,
        precision: "exact",
        lat: 40.7128,
        lng: -74.006,
      });
      const chartB = computeNatalChart({
        dateUTC: `${yearB}-${pad(monthB)}-${pad(dayB)}T12:00:00Z`,
        precision: "exact",
        lat: 51.5074,
        lng: -0.1278,
      });
      const { aspects } = computeSynastry(chartA, chartB);
      const relType = relCycle[i % relCycle.length]!;
      const rows = selectCompareAspectRows(aspects, relType, 6);
      const shorts: string[] = [];
      const fulls: string[] = [];
      for (const row of rows) {
        displayed += 1;
        const rendered = renderRowString(row, relType);
        if (rendered.fallback) fallback += 1;
        shorts.push(rendered.short);
        fulls.push(rendered.full);
      }
      if (new Set(shorts).size !== shorts.length) reportsWithDupShort += 1;
      if (new Set(fulls).size !== fulls.length) reportsWithDupFull += 1;
    }

    const fallbackPct = displayed === 0 ? 0 : (fallback / displayed) * 100;
    // eslint-disable-next-line no-console
    console.log(
      `\n================ 200-PAIR READING SIMULATION ================\n` +
        `Displayed rows: ${displayed}\n` +
        `ASPECT_NATURE fallback rows: ${fallback} (${fallbackPct.toFixed(1)}%)\n` +
        `Reports with duplicate reading shorts: ${reportsWithDupShort} / 200\n` +
        `Reports with duplicate full row strings: ${reportsWithDupFull} / 200\n` +
        `================================================================\n`
    );

    expect(fallback).toBe(0);
    expect(fallbackPct).toBe(0);
    expect(reportsWithDupShort).toBe(0);
    expect(reportsWithDupFull).toBe(0);
  });
});


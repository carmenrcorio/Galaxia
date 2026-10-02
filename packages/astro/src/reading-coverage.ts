/**
 * Single source for interpretation-library coverage counts (methodology page,
 * CI locks, readings review batches). Counts are always derived from the
 * live tables, never hand-maintained tallies.
 */

import type { AspectKey, BodyKey } from "./interpretations";
import { natalAspectCoverage } from "./interpretations";
import { SYNASTRY_PAIR } from "./synastry-interpretations";

const SYNASTRY_MAJOR_TYPES: AspectKey[] = [
  "conjunction",
  "sextile",
  "square",
  "trine",
  "opposition",
];

/** Bodies that can form a synastry reading with Chiron (compare pool). */
export const CHIRON_SYNASTRY_PARTNERS: BodyKey[] = [
  "sun",
  "moon",
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
  "pluto",
  "north_node",
];

const PAIR = (a: BodyKey, b: BodyKey) => [a, b].sort().join("-");

export interface ReadingCellCoverage {
  authored: number;
  possible: number;
  unauthored: string[];
}

function pairAspectCoverage(
  pairs: string[],
  types: AspectKey[],
  lookup: Record<string, Partial<Record<AspectKey, unknown>>>
): ReadingCellCoverage {
  const unauthored: string[] = [];
  let authored = 0;
  for (const pair of pairs) {
    for (const aspect of types) {
      const key = `${pair}:${aspect}`;
      if (lookup[pair]?.[aspect]) authored += 1;
      else unauthored.push(key);
    }
  }
  return { authored, possible: pairs.length * types.length, unauthored };
}

/** All unordered pairs present in SYNASTRY_PAIR × five major aspects. */
export function synastryTableCoverage(): ReadingCellCoverage {
  const pairs = Object.keys(SYNASTRY_PAIR).sort();
  return pairAspectCoverage(pairs, SYNASTRY_MAJOR_TYPES, SYNASTRY_PAIR);
}

/** Chiron × 11 partners × five majors (Batch 01 target grid). */
export function chironSynastryCoverage(): ReadingCellCoverage {
  const pairs = CHIRON_SYNASTRY_PARTNERS.map((body) => PAIR("chiron", body)).sort();
  return pairAspectCoverage(pairs, SYNASTRY_MAJOR_TYPES, SYNASTRY_PAIR);
}

export interface InterpretationLibraryCoverageSummary {
  natalAspect: ReturnType<typeof natalAspectCoverage>;
  synastryTable: ReadingCellCoverage;
  chironSynastry: ReadingCellCoverage;
}

export function interpretationLibraryCoverageSummary(): InterpretationLibraryCoverageSummary {
  return {
    natalAspect: natalAspectCoverage(),
    synastryTable: synastryTableCoverage(),
    chironSynastry: chironSynastryCoverage(),
  };
}

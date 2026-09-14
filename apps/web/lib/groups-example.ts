/**
 * Curated example group reading for the empty Groups landing page.
 *
 * Fictional names, real birth datetimes at real places. Charts come from
 * `@galaxia/astro` `computeNatalChart` (the same engine a saved group uses).
 * Example ids are prefixed and must never be written to user tables.
 */

import {
  cohortOverlay,
  compareGenerational,
  computeNatalChart,
  type Birth,
  type FamilyComparePersonInput,
  type GenSignature,
  type NatalChart,
} from "@galaxia/astro";
import { GROUPS_EXAMPLE_TITLE } from "./groups-copy";

export const EXAMPLE_ID_PREFIX = "example:";

export interface ExamplePersonDef {
  id: string;
  name: string;
  birth: Birth;
}

/**
 * Four fictional friends spanning a real generational split:
 * Lila, Owen, and Priya share Uranus Capricorn / Neptune Capricorn / Pluto Scorpio.
 * Nate (1997) carries Uranus Aquarius and Pluto Sagittarius, with the same Neptune.
 *
 * Dates are civil birth times converted to UTC with that place's offset
 * (including DST where it applied). Houses use Placidus.
 */
export const EXAMPLE_PEOPLE: readonly ExamplePersonDef[] = [
  {
    id: `${EXAMPLE_ID_PREFIX}lila`,
    name: "Lila",
    birth: {
      dateUTC: "1991-04-12T13:30:00.000Z",
      precision: "exact",
      lat: 40.7128,
      lng: -74.006,
      tzOffsetMin: -240,
    },
  },
  {
    id: `${EXAMPLE_ID_PREFIX}owen`,
    name: "Owen",
    birth: {
      dateUTC: "1993-09-08T21:45:00.000Z",
      precision: "exact",
      lat: 41.8781,
      lng: -87.6298,
      tzOffsetMin: -300,
    },
  },
  {
    id: `${EXAMPLE_ID_PREFIX}priya`,
    name: "Priya",
    birth: {
      dateUTC: "1994-12-03T15:10:00.000Z",
      precision: "exact",
      lat: 34.0522,
      lng: -118.2437,
      tzOffsetMin: -480,
    },
  },
  {
    id: `${EXAMPLE_ID_PREFIX}nate`,
    name: "Nate",
    birth: {
      dateUTC: "1997-07-21T10:20:00.000Z",
      precision: "exact",
      lat: 51.5074,
      lng: -0.1278,
      tzOffsetMin: 60,
    },
  },
];

export interface ExamplePairHighlight {
  pair: string;
  summary: string;
}

export interface ExampleGroupReading {
  groupLabel: string;
  memberNames: string[];
  memberIds: string[];
  overlay: ReturnType<typeof cohortOverlay>;
  pairHighlights: ExamplePairHighlight[];
  chartGridMembers: FamilyComparePersonInput[];
}

function pairSummary(a: { name: string; gen: GenSignature }, b: { name: string; gen: GenSignature }): ExamplePairHighlight {
  const rel = compareGenerational(a.gen, b.gen);
  return {
    pair: `${a.name} × ${b.name}`,
    summary: rel.sameGeneration
      ? `Same generation (${rel.shared.map((s) => `${s.planet} ${s.sign}`).join(", ")}).`
      : `Fault line: ${rel.diverged.map((d) => `${d.planet} ${d.signA}/${d.signB}`).join(" · ")}.`,
  };
}

function buildExampleGroupReading(): ExampleGroupReading {
  const computed = EXAMPLE_PEOPLE.map((person) => {
    const chart: NatalChart = computeNatalChart(person.birth);
    return {
      id: person.id,
      name: person.name,
      chart,
      gen: chart.generational,
    };
  });

  const overlay = cohortOverlay(computed.map((row) => ({ name: row.name, gen: row.gen })));
  const pairHighlights: ExamplePairHighlight[] = [];
  for (let i = 0; i < computed.length; i++) {
    for (let j = i + 1; j < computed.length; j++) {
      pairHighlights.push(pairSummary(computed[i]!, computed[j]!));
    }
  }

  return {
    groupLabel: GROUPS_EXAMPLE_TITLE,
    memberNames: computed.map((row) => row.name),
    memberIds: computed.map((row) => row.id),
    overlay,
    pairHighlights: pairHighlights.slice(0, 3),
    chartGridMembers: computed.map((row) => ({
      id: row.id,
      name: row.name,
      chart: row.chart,
    })),
  };
}

let cachedReading: ExampleGroupReading | null = null;

/** Computed once on first use: four natal charts, then the same overlay a live group uses. */
export function exampleGroupReading(): ExampleGroupReading {
  if (!cachedReading) cachedReading = buildExampleGroupReading();
  return cachedReading;
}

export function isExampleId(id: string): boolean {
  return id.startsWith(EXAMPLE_ID_PREFIX);
}

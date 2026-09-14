/**
 * Curated example group reading for the empty Groups landing page.
 *
 * Fictional names, real birth datetimes at real places. Charts come from
 * `@galaxia/astro` `computeNatalChart` (the same engine a saved group uses).
 * The empty-state UI reads a precomputed snapshot so first paint does not
 * run four natal computes. Tests recompute live and assert the snapshot
 * still matches. Example ids are prefixed and must never be written to
 * user tables.
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
import snapshot from "./groups-example-reading.json";

export const EXAMPLE_ID_PREFIX = "example:";

export interface ExamplePersonDef {
  id: string;
  name: string;
  birth: Birth;
}

/**
 * Four fictional people spanning a real generational spread, shaped like
 * the founder's own saved group reading: no whole-group shared sky, fault
 * lines on Uranus, Neptune, and Pluto, and one same-generation pair.
 *
 * Noor (2001) and Theo (2003) share Uranus Aquarius / Neptune Aquarius /
 * Pluto Sagittarius. Jonah (1976) and Mira (1954) sit in earlier signs.
 *
 * Dates are civil birth times converted to UTC with that place's offset
 * (including DST where it applied). Houses use Placidus.
 *
 * Member order is load-bearing: live Groups keeps the first three pair
 * highlights, so Noor and Theo are first so that pair is visible.
 */
export const EXAMPLE_PEOPLE: readonly ExamplePersonDef[] = [
  {
    id: `${EXAMPLE_ID_PREFIX}noor`,
    name: "Noor",
    birth: {
      dateUTC: "2001-03-14T21:10:00.000Z",
      precision: "exact",
      lat: 30.2672,
      lng: -97.7431,
      tzOffsetMin: -360,
    },
  },
  {
    id: `${EXAMPLE_ID_PREFIX}theo`,
    name: "Theo",
    birth: {
      dateUTC: "2003-09-30T10:20:00.000Z",
      precision: "exact",
      lat: 51.5074,
      lng: -0.1278,
      tzOffsetMin: 60,
    },
  },
  {
    id: `${EXAMPLE_ID_PREFIX}jonah`,
    name: "Jonah",
    birth: {
      dateUTC: "1976-05-18T14:40:00.000Z",
      precision: "exact",
      lat: 41.8781,
      lng: -87.6298,
      tzOffsetMin: -300,
    },
  },
  {
    id: `${EXAMPLE_ID_PREFIX}mira`,
    name: "Mira",
    birth: {
      dateUTC: "1954-08-22T18:30:00.000Z",
      precision: "exact",
      lat: 42.3601,
      lng: -71.0589,
      tzOffsetMin: -240,
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

/**
 * Live engine path. Used to generate and verify the snapshot. The empty
 * Groups page must not call this; it reads `exampleGroupReading()`.
 */
export function buildExampleGroupReading(): ExampleGroupReading {
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

/** Precomputed once from `buildExampleGroupReading`. Not user data. */
export function exampleGroupReading(): ExampleGroupReading {
  return snapshot as ExampleGroupReading;
}

export function isExampleId(id: string): boolean {
  return id.startsWith(EXAMPLE_ID_PREFIX);
}

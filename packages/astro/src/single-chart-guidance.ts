/**
 * Galaxia — single-chart guidance.
 *
 * One true statement about one person, from one computed natal chart, with no
 * second chart and no synastry.
 *
 * WHY THIS EXISTS SEPARATELY FROM compare-guidance.ts
 * `whatTheyNeed()` is the pair-level generator: it reads a SynastryResult and
 * the six synastry scores, so it cannot run until both people have charts. The
 * first-run orientation flow shows the reader something true about the other
 * person *before* the reader has entered their own birth details, which is the
 * whole point of leading with the other person. Calling `whatTheyNeed()` there
 * with invented scores would be the exact failure ENGINEERING.md §12 forbids:
 * a confident answer computed from data we do not have.
 *
 * NO NEW COPY IS AUTHORED HERE. Every sentence is PLANET_IN_SIGN copy from
 * interpretations.ts, read through `interpretPlacement`. This module only
 * decides which real placement the reader's birth data can actually support.
 *
 * PRECISION LADDER (ENGINEERING.md §12: never interpret a guess)
 *   1. Moon, when confident       — needs `date` or `exact`. Its domain is
 *                                   literally "Emotional needs", so it is the
 *                                   closest the library gets to what a person
 *                                   needs from you.
 *   2. Sun, when confident        — needs `date` or `exact`. The Moon changes
 *                                   sign every two and a half days, so at
 *                                   `date` precision it is genuinely ambiguous
 *                                   on a large share of birthdays and the
 *                                   engine says so.
 *   3. Pluto / Neptune / Uranus   — the only bodies a bare birth *year* can
 *                                   settle, and only when the engine reports
 *                                   the sign did not change during that year.
 *   4. null                       — nothing is confident. The caller must say
 *                                   so plainly and show nothing, never fall
 *                                   back to a generic line.
 *
 * MINOR SAFETY: this module never reads Venus or Mars, so no attraction or
 * romantic register exists on any path. `minorSafe` is still threaded into
 * every `interpretPlacement` call because that is the module contract in
 * interpretations.ts, and so a body added to the ladder later cannot skip it.
 */
import type { NatalChart, Placement, Precision } from "./index";
import {
  bodyDomain,
  interpretPlacement,
  type BodyKey,
  type PlacementSafetyOpts,
  type SignKey,
} from "./interpretations";

/** Bodies this module may speak from, in the order it tries them. */
export type SingleChartNeedBody = "moon" | "sun" | "pluto" | "neptune" | "uranus";

export interface SingleChartNeed {
  /** The real placement the statement was drawn from. */
  body: SingleChartNeedBody;
  sign: SignKey;
  /** Provenance caption, e.g. "Maya's Cancer Moon". Always names real data. */
  lead: string;
  /** The statement itself: curated copy, rendered verbatim. */
  statement: string;
  /** Row label for the placement, e.g. "Emotional needs". */
  domain: string;
  /** Precision of the chart the statement came from. */
  precision: Precision;
  /**
   * True when the statement came from a slow outer planet, so it describes a
   * cohort rather than this person alone. The UI must say so: presenting a
   * generational line as a personal one would be a label on the wrong data.
   */
  generational: boolean;
}

/** Order matters: the first confident hit wins. See the precision ladder above. */
const LADDER: SingleChartNeedBody[] = ["moon", "sun", "pluto", "neptune", "uranus"];

const GENERATIONAL_BODIES = new Set<SingleChartNeedBody>(["pluto", "neptune", "uranus"]);

const BODY_LABEL: Record<SingleChartNeedBody, string> = {
  moon: "Moon",
  sun: "Sun",
  pluto: "Pluto",
  neptune: "Neptune",
  uranus: "Uranus",
};

function confidentPlacement(chart: NatalChart, body: SingleChartNeedBody): Placement | null {
  const found = chart.placements.find((p) => p.body === body);
  // `confident: false` carries possibleSigns, meaning the engine is telling us
  // the sign could be one of several. Reading copy off the sampled sign would
  // be interpreting a guess.
  if (!found || !found.confident) return null;
  return found;
}

export interface SingleChartNeedOptions extends PlacementSafetyOpts {
  /** Display name, used only to address the reader. Never invented. */
  name: string;
}

/**
 * The one true statement to show a reader about a person they just added.
 *
 * Returns `null` when the chart supports no confident statement at all (a
 * person saved with no birth data has no chart, and a bare year whose outer
 * planets all changed sign that year settles nothing). A caller must render
 * that as "we cannot say yet", never as a stand-in line.
 */
export function singleChartNeed(
  chart: NatalChart | null | undefined,
  opts: SingleChartNeedOptions
): SingleChartNeed | null {
  if (!chart) return null;
  const name = opts.name.trim();
  if (!name) return null;

  for (const body of LADDER) {
    const placement = confidentPlacement(chart, body);
    if (!placement) continue;

    const sign = placement.sign as SignKey;
    const { long } = interpretPlacement(body as BodyKey, sign, { minorSafe: opts.minorSafe });
    // An unauthored cell returns empty strings rather than throwing. Skip to
    // the next rung instead of rendering a blank card.
    if (!long) continue;

    return {
      body,
      sign,
      lead: `${name}'s ${sign} ${BODY_LABEL[body]}`,
      statement: long,
      domain: bodyDomain(body as BodyKey, { minorSafe: opts.minorSafe }),
      precision: chart.precision,
      generational: GENERATIONAL_BODIES.has(body),
    };
  }

  return null;
}

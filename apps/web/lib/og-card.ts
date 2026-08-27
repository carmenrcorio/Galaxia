/**
 * Pure, server-safe data shaping for the `/s/[token]` OG image cards.
 *
 * Everything here operates only on the already-stripped `SingleSharePayload`
 * / `CompareSharePayload` shapes (see `./quick-share` — birth time, lat, lng
 * are never present on those types), and never reads `synastry.scores` or
 * calls `whatTheyNeed`. No import here pulls in `server-only` (no DB, no
 * node:crypto), so this module — and its safety properties — are directly
 * unit-testable without route-level plumbing.
 *
 * The opengraph-image route imports these builders instead of re-deriving
 * card data inline, so the safety guarantees below (confident-only
 * placements, no scores, no romantic summary) hold for the actual rendered
 * card, not just a parallel implementation.
 */

import { isRomanticRelation, type NatalChart, type RelationType, type Sign } from "@galaxia/astro";
import { effectiveCompareFraming, type CompareSharePayload, type SingleSharePayload } from "./quick-share";

export type OgBigThree = {
  sun?: Sign;
  moon?: Sign;
  /** Present only when the chart has a real exact-time Ascendant. Never fabricated. */
  rising?: Sign;
};

/**
 * Sun/Moon sign, filtered by the same `confident !== false` guard as
 * `getSign` in `share-snapshot-view.tsx` — an uncertain sign is never shown.
 * Rising is `chart.asc`, which is only ever set when a real exact-time chart
 * computed it (see `NatalChart.asc`) — never inferred or guessed here.
 */
export function extractOgBigThree(chart: NatalChart): OgBigThree {
  const findSign = (body: string): Sign | undefined => {
    const placement = chart.placements.find((p) => p.body === body);
    return placement && placement.confident !== false ? placement.sign : undefined;
  };
  return {
    sun: findSign("sun"),
    moon: findSign("moon"),
    rising: chart.asc,
  };
}

export type OgSingleCard = {
  name?: string;
  bigThree: OgBigThree;
};

export function buildOgSingleCard(payload: SingleSharePayload): OgSingleCard {
  return {
    name: payload.name?.trim() || undefined,
    bigThree: extractOgBigThree(payload.chart),
  };
}

/**
 * FOUNDER-REVIEW: authored — one-line neutral summary for the OG card when
 * the relationship is romantic (`isRomanticRelation` true). The card never
 * shows a relationship read, a warmth level, or an attraction score for a
 * romantic pairing — only this neutral line, matching the existing
 * "A shared compatibility reading" framing already used by
 * `share-snapshot-view.tsx`'s title for every compare kind.
 */
export const OG_NEUTRAL_COMPARE_SUBTITLE = "A shared compatibility reading. Open the link for the full reading.";

/**
 * FOUNDER-REVIEW: authored — the one non-romantic relationship type
 * `RELATION_HEADLINE` (@galaxia/astro) does not cover. Matches the voice and
 * length of the existing entries there (two short sentences, no scores, no
 * attraction language). Used only as a last-resort per-type line; if
 * `RELATION_HEADLINE` ever gains a "platonic" entry, that one wins instead
 * (see `resolveOgCompareSummary`).
 */
export const OG_PLATONIC_SUMMARY =
  "This is a connection you have chosen to read together, kept easy by staying open with each other. Here is what comes easy, and where it needs a little care.";

export type OgCompareSummary =
  | { kind: "relationship"; text: string }
  | { kind: "neutral"; text: string };

/**
 * The OG card's relationship summary line. NEVER reads `synastry.scores` and
 * NEVER calls `whatTheyNeed`/`compareHeadline` — `compareHeadline`'s
 * fallback for an uncovered type reads a score-derived `overall`, so this
 * indexes `RELATION_HEADLINE` directly instead (per the non-negotiable gate).
 *
 * - Romantic types (`isRomanticRelation` true): no relationship read at all,
 *   just the neutral subtitle.
 * - Non-romantic types: `RELATION_HEADLINE[type]`, then the authored
 *   `OG_PLATONIC_SUMMARY` for "platonic" (the one type that table omits),
 *   then `generational.theme` as a last-resort fallback if a table entry is
 *   somehow still missing — never a score-band line.
 */
export function resolveOgCompareSummary(
  relationHeadline: Partial<Record<RelationType, string>>,
  relationType: RelationType,
  generationalTheme: string,
  blockRomanticMinorRender = false
): OgCompareSummary {
  if (blockRomanticMinorRender || isRomanticRelation(relationType)) {
    return { kind: "neutral", text: OG_NEUTRAL_COMPARE_SUBTITLE };
  }
  const direct = relationHeadline[relationType];
  if (direct) return { kind: "relationship", text: direct };
  if (relationType === "platonic") return { kind: "relationship", text: OG_PLATONIC_SUMMARY };
  return { kind: "relationship", text: generationalTheme };
}

export type OgComparePerson = {
  name: string;
  bigThree: OgBigThree;
};

export type OgCompareCard = {
  personA: OgComparePerson;
  personB: OgComparePerson;
  relationType: RelationType;
  summary: OgCompareSummary;
};

/**
 * Runs the same render-time backstop the live `/s` page uses
 * (`effectiveCompareFraming`) before building the card, so a bad
 * romantic+minor row (persist should already refuse this — see
 * `validateQuickSharePersistBody`) still renders as platonic here too, not
 * as romantic.
 */
export function buildOgCompareCard(
  payload: CompareSharePayload,
  relationHeadline: Partial<Record<RelationType, string>>
): OgCompareCard {
  const framing = effectiveCompareFraming(payload);
  return {
    personA: { name: payload.nameA?.trim() || "Person A", bigThree: extractOgBigThree(payload.chartA) },
    personB: { name: payload.nameB?.trim() || "Person B", bigThree: extractOgBigThree(payload.chartB) },
    relationType: framing.relationType,
    summary: resolveOgCompareSummary(
      relationHeadline,
      framing.relationType,
      payload.generational.theme,
      framing.blockRomanticMinorRender
    ),
  };
}

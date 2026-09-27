/**
 * Planet glyph tooltip content for the natal wheel: the web hover card and the
 * mobile tap sheet read the same lines from here, so the two surfaces cannot
 * drift.
 *
 * Astro-free on purpose (this package never imports the engine). The caller
 * passes the already-resolved display name and domain line from
 * `@galaxia/astro` (`bodyDisplayName` / `bodyDomain`); this module only orders
 * and formats what a tooltip shows.
 */

import { RETROGRADE_BADGE_ARIA_LABEL, RETROGRADE_BADGE_LABEL } from "./retrograde";

/** FOUNDER-REVIEW: web wheel tooltip link into the placement list below. */
export const PLANET_TOOLTIP_FULL_READING_WEB = "See full reading below";

/** FOUNDER-REVIEW: mobile wheel sheet button into the placement list. */
export const PLANET_TOOLTIP_FULL_READING_MOBILE = "See full reading";

/** FOUNDER-REVIEW: accessible name for dismissing the placement sheet. */
export const PLANET_TOOLTIP_DISMISS_LABEL = "Close placement details";

/**
 * Hover dismiss grace period. Long enough to read the card and reach the
 * link, short enough that a pointer sweeping the wheel does not trail cards.
 */
export const PLANET_TOOLTIP_CLOSE_DELAY_MS = 300;

/**
 * DOM id of a body's card in the placement list. The wheel tooltip link and
 * the placement row both derive the id from this, so a rename can never leave
 * the link pointing at nothing.
 */
export function placementAnchorId(body: string): string {
  return `placement-${body.toLowerCase()}`;
}

const HOUSE_ORDINAL: Record<number, string> = {
  1: "1st",
  2: "2nd",
  3: "3rd",
  4: "4th",
  5: "5th",
  6: "6th",
  7: "7th",
  8: "8th",
  9: "9th",
  10: "10th",
  11: "11th",
  12: "12th",
};

/**
 * "10th House". Null for anything outside 1 to 12 so a malformed house number
 * is left out of the card rather than rendered as a confident fact (§12).
 */
export function houseTooltipLabel(house: number | null | undefined): string | null {
  if (house == null || !Number.isInteger(house)) return null;
  const ordinal = HOUSE_ORDINAL[house];
  return ordinal ? `${ordinal} House` : null;
}

/**
 * "Gemini 14°". Whole degrees within the sign, the conventional wheel
 * shorthand. A placement with no degree shows the sign alone instead of a
 * made-up zero.
 */
export function signDegreeLabel(sign: string, degree: number | null | undefined): string {
  if (degree == null || !Number.isFinite(degree)) return sign;
  return `${sign} ${Math.floor(degree)}\u00B0`;
}

export type PlanetTooltipInput = {
  /** Display name from `bodyDisplayName`, e.g. "Venus". */
  name: string;
  /** Domain line from `bodyDomain`, e.g. "How they love". */
  domain: string;
  sign: string;
  degree?: number | null;
  house?: number | null;
  retro?: boolean;
  /**
   * Whether the chart actually has house cusps. A house number computed
   * without them is never labelled (§12).
   */
  hasHouses: boolean;
};

export type PlanetTooltipContent = {
  name: string;
  domain: string;
  signLine: string;
  houseLine: string | null;
  retroLabel: string | null;
  retroAriaLabel: string;
};

export function planetTooltipContent(input: PlanetTooltipInput): PlanetTooltipContent {
  return {
    name: input.name,
    domain: input.domain,
    signLine: signDegreeLabel(input.sign, input.degree),
    houseLine: input.hasHouses ? houseTooltipLabel(input.house) : null,
    retroLabel: input.retro === true ? RETROGRADE_BADGE_LABEL : null,
    retroAriaLabel: RETROGRADE_BADGE_ARIA_LABEL,
  };
}

/**
 * One-line spoken form of the card, for the glyph's accessible name and the
 * mobile sheet. Screen-reader users get the same facts as the visual card.
 */
export function planetTooltipSummary(content: PlanetTooltipContent): string {
  const parts = [content.name, content.signLine];
  if (content.houseLine) parts.push(content.houseLine);
  if (content.retroLabel) parts.push(content.retroAriaLabel);
  parts.push(content.domain);
  return `${parts.join(". ")}.`;
}

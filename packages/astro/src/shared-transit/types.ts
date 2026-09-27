/**
 * Canonical contract for the This Week shared-transit feed.
 *
 * `TransitHit` in `index.ts` is the older single-chart transit row. This
 * module uses `SharedTransitHit` for one transiting body aspecting one
 * natal point of one person, and `SharedTransitEvent` for the deduped
 * feed item. A relational event has exactly two members.
 */

import type { AspectType, BodyName, NatalChart, Precision, Sign } from "../index";

export type SharedTransitRole = "partners" | "parent-child" | "siblings" | "friends" | "circle";

/** One computed transit hit: one transiting body aspecting one natal point of one person. */
export interface SharedTransitHit {
  transiting: BodyName;
  aspect: AspectType;
  personId: string;
  personName: string;
  natalPoint: BodyName;
  /** Omitted when the source row has no sign. Copy must not invent one. */
  natalSign?: Sign;
  /** Ecliptic longitude of the natal point. Used for the synastry-link test. */
  natalLon: number;
  /** House already on the chart. Omitted when the chart has no house. Never invented. */
  natalHouse?: number;
  /** Absolute orb in degrees. */
  orb: number;
  /** True when the contact is still tightening (exactness is now or ahead). */
  applying: boolean;
  /** ISO instant of exactness. */
  exactAt: string;
  /** Degrees per day of the transiting body. Negative when retrograde. */
  transitingSpeed: number;
}

export interface SharedTransitSynastryLink {
  aspectBetweenNatalPoints: AspectType;
  orb: number;
}

/**
 * A canonical, deduplicated feed item.
 * `kind: "relational"` always has exactly two members.
 */
export interface SharedTransitEvent {
  /** Stable canonical key. Dedup and copy selection both use it. */
  id: string;
  kind: "relational" | "individual";
  transiting: BodyName;
  aspect: AspectType;
  /** 1 (individual) or 2 (relational pair). Never 3+. */
  members: SharedTransitHit[];
  /** Present only when `kind === "relational"`. */
  synastryLink?: SharedTransitSynastryLink;
  /** 0..1. Higher is sharper. */
  salience: number;
  relationshipRole?: SharedTransitRole;
}

export interface SharedTransitPersonInput {
  id: string;
  name: string;
  chart: NatalChart;
  birthDate?: string | null;
  birthPrecision?: Precision | "none" | null;
  relation?: string | null;
  isSelf?: boolean;
}

/** A card the old feed could emit, including 3+ person clusters and reordered duplicates. */
export interface EnumeratedSharedCard {
  transiting: BodyName;
  aspect: AspectType;
  members: Array<{
    personId: string;
    personName: string;
    natalPoint: BodyName;
    natalSign?: Sign;
    natalLon?: number;
    natalHouse?: number;
    orb: number;
    applying?: boolean;
    exactAt?: string;
    transitingSpeed?: number;
  }>;
}

export interface ShownSharedTransit {
  id: string;
  /** Earliest member exactness, ISO. */
  exactAt: string;
  /** UTC day the card was shown, YYYY-MM-DD. */
  shownOn: string;
}

export interface SharedWeekFeed {
  /** Top N novel relational events for the weekly surface. */
  weekly: SharedTransitEvent[];
  /** Slow events that did not make the weekly cut. Not rendered until the long-arcs surface. */
  longArcs: SharedTransitEvent[];
  /**
   * Hits that shared a transiting planet and aspect with someone else, but
   * whose natal points do not aspect each other. They belong on each
   * person's own sky (Today in your sky already computes personal transits).
   * They are never assembled into a shared card.
   */
  individual: SharedTransitHit[];
  /** Relational events worth persisting (fast and slow), ranked. */
  relational: SharedTransitEvent[];
}

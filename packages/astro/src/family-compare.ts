/**
 * Galaxia Generations — Family Chart Comparison (Feature 2).
 *
 * Pure, deterministic reads over already-computed NatalCharts: no new
 * astrology, no AI, no network. "Rising" is `chart.asc` (a Sign), never a
 * `placements` entry — same distinction the rest of the app already makes
 * (see `apps/web/lib/og-card.ts` extractOgBigThree). A placement is only
 * used when `confident !== false`, exactly like every other reader of
 * `chart.placements` in this codebase — a year-only birth's guessed Sun
 * sign never counts toward a "shared placement" claim (ENGINEERING.md §12).
 */

import { elementForSign, modalityForSign, type BodyName, type NatalChart, type Sign } from "./index";

export type FamilyPlanet = "sun" | "moon" | "rising" | "mercury" | "venus" | "mars";

export const FAMILY_COMPARE_PLANETS: readonly FamilyPlanet[] = ["sun", "moon", "rising", "mercury", "venus", "mars"];

export const FAMILY_PLANET_LABEL: Record<FamilyPlanet, string> = {
  sun: "Sun",
  moon: "Moon",
  rising: "Rising",
  mercury: "Mercury",
  venus: "Venus",
  mars: "Mars",
};

export type Element = "fire" | "earth" | "air" | "water";
export type Modality = "cardinal" | "fixed" | "mutable";

export interface FamilyPlacementCell {
  sign: Sign | null;
  house?: number;
  /** False when the sign is a guess (year-only birth) or unavailable (Rising without an exact birth time+place). */
  confident: boolean;
}

/** Reads the six personal-planet placements the comparison grid shows, respecting the app-wide confidence rule. */
export function extractFamilyPlacements(chart: NatalChart): Record<FamilyPlanet, FamilyPlacementCell> {
  const find = (body: BodyName) => chart.placements.find((p) => p.body === body);
  const cell = (body: BodyName): FamilyPlacementCell => {
    const p = find(body);
    if (!p) return { sign: null, confident: false };
    return { sign: p.sign, house: p.house, confident: p.confident !== false };
  };
  return {
    sun: cell("sun"),
    moon: cell("moon"),
    rising: chart.asc ? { sign: chart.asc, confident: true } : { sign: null, confident: false },
    mercury: cell("mercury"),
    venus: cell("venus"),
    mars: cell("mars"),
  };
}

export interface FamilyComparePersonInput {
  id: string;
  name: string;
  chart: NatalChart;
  /** For the "remembered" note next to shared placements, per the spec's memorial-star requirement. */
  passed?: boolean;
}

export interface FamilyComparePerson extends FamilyComparePersonInput {
  placements: Record<FamilyPlanet, FamilyPlacementCell>;
}

export interface SharedPlacementPattern {
  planet: FamilyPlanet;
  sign: Sign;
  personIds: string[];
  personNames: string[];
}

export interface ElementClusterPattern {
  element: Element;
  count: number;
  /** Count of all confident personal-planet placements considered (denominator for `count`). */
  total: number;
}

export interface FamilyPatternResult {
  people: FamilyComparePerson[];
  /** 2+ people sharing the same sign in the same placement, sorted by group size (desc), then planet order. */
  sharedPlacements: SharedPlacementPattern[];
  elementCounts: Record<Element, number>;
  modalityCounts: Record<Modality, number>;
  /** Set only when one element clearly leads (see detectFamilyPatterns for the threshold). */
  dominantElement: ElementClusterPattern | null;
  /** Elements with zero confident placements anywhere in the group. */
  missingElements: Element[];
  /** Modalities with zero confident placements anywhere in the group. */
  missingModalities: Modality[];
}

const PLANET_ORDER: Record<FamilyPlanet, number> = { sun: 0, moon: 1, rising: 2, mercury: 3, venus: 4, mars: 5 };

/**
 * Detects family-level patterns across 2+ people's charts (the UI gates this
 * to 3-8 selected people, but the function itself has no such floor).
 * Everything here is a plain count over real, confident placements —
 * nothing is inferred or fabricated when data is thin.
 */
export function detectFamilyPatterns(peopleInput: FamilyComparePersonInput[]): FamilyPatternResult {
  const people: FamilyComparePerson[] = peopleInput.map((p) => ({ ...p, placements: extractFamilyPlacements(p.chart) }));

  const sharedPlacements: SharedPlacementPattern[] = [];
  for (const planet of FAMILY_COMPARE_PLANETS) {
    const bySign = new Map<Sign, { ids: string[]; names: string[] }>();
    for (const person of people) {
      const cell = person.placements[planet];
      if (!cell.sign || !cell.confident) continue;
      const entry = bySign.get(cell.sign) ?? { ids: [], names: [] };
      entry.ids.push(person.id);
      entry.names.push(person.name);
      bySign.set(cell.sign, entry);
    }
    for (const [sign, entry] of bySign) {
      if (entry.ids.length >= 2) {
        sharedPlacements.push({ planet, sign, personIds: entry.ids, personNames: entry.names });
      }
    }
  }
  sharedPlacements.sort((a, b) => b.personIds.length - a.personIds.length || PLANET_ORDER[a.planet] - PLANET_ORDER[b.planet]);

  const elementCounts: Record<Element, number> = { fire: 0, earth: 0, air: 0, water: 0 };
  const modalityCounts: Record<Modality, number> = { cardinal: 0, fixed: 0, mutable: 0 };
  let totalConfident = 0;
  for (const person of people) {
    for (const planet of FAMILY_COMPARE_PLANETS) {
      const cell = person.placements[planet];
      if (!cell.sign || !cell.confident) continue;
      elementCounts[elementForSign(cell.sign)]++;
      modalityCounts[modalityForSign(cell.sign)]++;
      totalConfident++;
    }
  }

  // "Skews heavily" — the leading element holds a real plurality (40%+ of
  // all confident placements) with at least 3 supporting placements, so a
  // 5-person group where one person happens to be a Leo doesn't get labeled
  // a "fire family." Ties (including an even 25/25/25/25 split) mean none.
  let dominantElement: ElementClusterPattern | null = null;
  if (totalConfident > 0) {
    const sorted = (Object.entries(elementCounts) as [Element, number][]).sort((a, b) => b[1] - a[1]);
    const [topElement, topCount] = sorted[0]!;
    const runnerUpCount = sorted[1]?.[1] ?? 0;
    if (topCount >= 3 && topCount > runnerUpCount && topCount / totalConfident >= 0.4) {
      dominantElement = { element: topElement, count: topCount, total: totalConfident };
    }
  }

  // With no confident placements at all there is nothing to say is "missing"
  // — that would just describe the data gap, not an astrological pattern.
  const missingElements = totalConfident === 0
    ? []
    : (Object.entries(elementCounts) as [Element, number][]).filter(([, c]) => c === 0).map(([e]) => e);
  const missingModalities = totalConfident === 0
    ? []
    : (Object.entries(modalityCounts) as [Modality, number][]).filter(([, c]) => c === 0).map(([m]) => m);

  return { people, sharedPlacements, elementCounts, modalityCounts, dominantElement, missingElements, missingModalities };
}

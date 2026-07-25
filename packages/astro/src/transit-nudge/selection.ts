import type { BodyName } from "../index";
import { romanticLensAllowed, weightedDomainsForFraming } from "./framing";
import type { EnrichedTransitHit, NudgeFraming, TransitPhase } from "./types";
import { exactnessWindowDeg } from "./windows";

function phaseBonus(phase: TransitPhase): number {
  switch (phase) {
    case "exact":
      return 1.25;
    case "applying":
      return 1.15;
    case "separating":
      return 0.85;
  }
}

/**
 * Domain weight from the shared Compare priority band.
 * Index 0 = strongest. Bodies outside the band get a small baseline so they
 * can still win when they are the only eligible hit — but framing-weighted
 * domains outrank them.
 */
export function relationshipDomainWeight(framing: NudgeFraming, natalBody: BodyName): number {
  const band = weightedDomainsForFraming(framing);
  if (band.length === 0) return 1;
  const idx = band.indexOf(natalBody);
  if (idx === -1) return 0.35;
  return 1.4 - idx * 0.15;
}

function tightness(hit: EnrichedTransitHit): number {
  const window = exactnessWindowDeg(hit.transitBody);
  if (window <= 0) return 0;
  return Math.max(0, 1 - hit.orb / window);
}

function novelty(passId: string, recentPassIds: ReadonlySet<string>): number {
  return recentPassIds.has(passId) ? 0.25 : 1;
}

export interface ScoredHit {
  hit: EnrichedTransitHit;
  score: number;
  parts: {
    domain: number;
    phase: number;
    tightness: number;
    novelty: number;
  };
}

export function scoreHit(
  hit: EnrichedTransitHit,
  framing: NudgeFraming,
  recentPassIds: ReadonlySet<string>
): ScoredHit {
  const domain = relationshipDomainWeight(framing, hit.natalBody);
  const phase = phaseBonus(hit.phase);
  const tight = tightness(hit);
  const nov = novelty(hit.passId, recentPassIds);
  return {
    hit,
    score: domain * phase * tight * nov,
    parts: { domain, phase, tightness: tight, novelty: nov },
  };
}

/**
 * Pick the single highest-scoring eligible hit for the day.
 * Romantic-lens hits (partner Venus/Mars friction/fusion with adultOnly copy)
 * are filtered when romanticLensAllowed is false — selection still may pick
 * Venus/Mars with non-romantic care copy via the resolver.
 */
export function selectDailyHit(
  hits: EnrichedTransitHit[],
  framing: NudgeFraming,
  minorSafe: boolean,
  recentPassIds: ReadonlySet<string> = new Set()
): ScoredHit | null {
  if (hits.length === 0) return null;

  // When romantic lens is closed, we still allow partner-weighted Venus/Mars
  // geometry — copy resolver will refuse adult keys. No geometry filter here
  // beyond what eligibility already did.
  void romanticLensAllowed(framing, minorSafe);

  let best: ScoredHit | null = null;
  for (const hit of hits) {
    const scored = scoreHit(hit, framing, recentPassIds);
    if (!best || scored.score > best.score) best = scored;
  }
  return best;
}

/**
 * Home lead ordering: pinned person/pair with any eligible (non-empty) nudge
 * sorts first. Does not change which transit was chosen for that person.
 */
export function orderSkyRowsForHome<T extends { person_id: string; copy_tier: string }>(
  rows: T[],
  pinnedPersonId: string | null | undefined,
  pinnedPairIds: readonly string[] | null | undefined = null
): T[] {
  if (!pinnedPersonId && (!pinnedPairIds || pinnedPairIds.length === 0)) return rows;
  const pinSet = new Set<string>([
    ...(pinnedPersonId ? [pinnedPersonId] : []),
    ...(pinnedPairIds ?? []),
  ]);
  const scored = rows.map((row, i) => {
    const pinned = pinSet.has(row.person_id);
    const hasNudge = row.copy_tier !== "empty_hedge";
    const lead = pinned && hasNudge ? 0 : pinned ? 1 : 2;
    return { row, lead, i };
  });
  scored.sort((a, b) => a.lead - b.lead || a.i - b.i);
  return scored.map((s) => s.row);
}

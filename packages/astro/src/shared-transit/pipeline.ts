/**
 * Join: hits → pairs → canonical id → synastry classify → salience → novelty → top N.
 * Individual co-transits are returned separately and are never rendered as a shared card.
 */

import { eclipticLongitude, longitudeToSign, type BodyName, type Sign } from "../index";
import { exactnessWindowDeg } from "../transit-nudge";
import { dedupeSharedTransitPairs, pairSharedTransitHits, suppressSubsetEvents } from "./canonicalize";
import { sharedTransitRole, synastryLinkForLongitudes } from "./classify";
import { collectSharedTransitHits } from "./collect";
import {
  isSlowWeeklyBody,
  SHARED_WEEK_STORE_PER_CADENCE,
  SYNASTRY_LINK_ORB_DEG,
  WEEKLY_FEED_LIMIT,
  WEEKLY_TRANSIT_BODIES,
} from "./constants";
import {
  applySharedTransitNovelty,
  rankSharedTransitEvents,
  scoreSharedTransitSalience,
  splitWeeklyAndLongArcs,
} from "./salience";
import type { SharedTransitEvent, SharedTransitHit, SharedTransitPersonInput, SharedWeekFeed, ShownSharedTransit } from "./types";

const MS_PER_DAY = 86_400_000;

const EMPTY_FEED: SharedWeekFeed = { weekly: [], longArcs: [], individual: [], relational: [] };

export interface BuildSharedWeekFeedOptions {
  bodies?: readonly BodyName[];
  previouslyShown?: readonly ShownSharedTransit[];
  limit?: number;
  synastryOrbDeg?: number;
}

export function assembleSharedWeekFeed(
  hits: readonly SharedTransitHit[],
  people: readonly SharedTransitPersonInput[],
  whenUTC: string,
  options?: BuildSharedWeekFeedOptions
): SharedWeekFeed {
  const limit = options?.limit ?? WEEKLY_FEED_LIMIT;
  const synastryOrb = options?.synastryOrbDeg ?? SYNASTRY_LINK_ORB_DEG;
  const today = whenUTC.slice(0, 10);
  const peopleById = new Map(people.map((person) => [person.id, person]));

  const deduped = dedupeSharedTransitPairs(pairSharedTransitHits(hits));
  const individual: SharedTransitHit[] = [];
  const seenIndividual = new Set<string>();
  const relational: SharedTransitEvent[] = [];

  for (const event of deduped) {
    const [a, b] = event.members;
    if (!a || !b) continue;
    const link = synastryLinkForLongitudes(a.natalLon, b.natalLon, synastryOrb);
    if (!link) {
      for (const hit of event.members) {
        const key = `${hit.personId}:${hit.transiting}:${hit.aspect}:${hit.natalPoint}`;
        if (seenIndividual.has(key)) continue;
        seenIndividual.add(key);
        individual.push(hit);
      }
      continue;
    }
    const personA = peopleById.get(a.personId);
    const personB = peopleById.get(b.personId);
    const next: SharedTransitEvent = {
      ...event,
      kind: "relational",
      synastryLink: link,
      relationshipRole: sharedTransitRole(
        { isSelf: personA?.isSelf, relation: personA?.relation },
        { isSelf: personB?.isSelf, relation: personB?.relation }
      ),
      salience: 0,
    };
    next.salience = scoreSharedTransitSalience(next);
    relational.push(next);
  }

  const suppressed = suppressSubsetEvents(relational);
  const novel = applySharedTransitNovelty(suppressed, options?.previouslyShown ?? [], today);
  const { weekly, longArcs } = splitWeeklyAndLongArcs(rankSharedTransitEvents(novel), limit);

  const rankedAll = rankSharedTransitEvents(suppressed);
  const slow = rankedAll.filter((event) => isSlowWeeklyBody(event.transiting)).slice(0, SHARED_WEEK_STORE_PER_CADENCE);
  const fast = rankedAll.filter((event) => !isSlowWeeklyBody(event.transiting)).slice(0, SHARED_WEEK_STORE_PER_CADENCE);
  const stored = new Map<string, SharedTransitEvent>();
  for (const event of [...slow, ...fast]) stored.set(event.id, event);

  return { weekly, longArcs, individual, relational: [...stored.values()] };
}

export function buildSharedWeekFeed(
  people: readonly SharedTransitPersonInput[],
  whenUTC: string,
  options?: BuildSharedWeekFeedOptions
): SharedWeekFeed {
  if (people.length < 2) return EMPTY_FEED;
  const bodies = options?.bodies ?? WEEKLY_TRANSIT_BODIES;
  const hits = collectSharedTransitHits(people, whenUTC, bodies);
  return assembleSharedWeekFeed(hits, people, whenUTC, options);
}

/**
 * Next instant a real relational pair is in orb. Returns null when the
 * horizon is empty. Never invents a date the classifier would reject.
 */
export function findNextSharedWeekDate(
  people: readonly SharedTransitPersonInput[],
  fromUTC: string,
  options?: {
    horizonDays?: number;
    stepDays?: number;
    bodies?: readonly BodyName[];
  }
): string | null {
  if (people.length < 2) return null;
  const horizonDays = options?.horizonDays ?? 28;
  const stepDays = options?.stepDays ?? 7;
  const fromMs = Date.parse(fromUTC);
  if (Number.isNaN(fromMs) || stepDays < 1 || horizonDays < stepDays) return null;

  for (let day = stepDays; day <= horizonDays; day += stepDays) {
    const when = new Date(fromMs + day * MS_PER_DAY).toISOString();
    const feed = buildSharedWeekFeed(people, when, { bodies: options?.bodies, limit: 1 });
    const pool = [...feed.weekly, ...feed.longArcs];
    if (pool.length === 0) continue;
    const futureExacts = pool
      .flatMap((event) => event.members.map((member) => member.exactAt))
      .filter((iso) => Date.parse(iso) > fromMs)
      .sort();
    return futureExacts[0] ?? when;
  }
  return null;
}

export function sharedTransitStorageKey(event: Pick<SharedTransitEvent, "id" | "members">): string {
  const earliest = Math.min(...event.members.map((member) => Date.parse(member.exactAt)));
  const weekBucket = Number.isNaN(earliest) ? 0 : Math.floor(earliest / (7 * MS_PER_DAY));
  return `${event.id}:${weekBucket}`;
}

export function sharedTransitActiveWindow(event: SharedTransitEvent): { activeFromUTC: string; activeToUTC: string } {
  const speed = Math.max(...event.members.map((member) => Math.abs(member.transitingSpeed)), 0.0005);
  const windowDays = Math.min(60, exactnessWindowDeg(event.transiting) / (speed || 0.0005));
  const exacts = event.members.map((member) => Date.parse(member.exactAt)).filter((time) => !Number.isNaN(time));
  const anchor = exacts.length ? exacts : [Date.now()];
  return {
    activeFromUTC: new Date(Math.min(...anchor) - windowDays * MS_PER_DAY).toISOString(),
    activeToUTC: new Date(Math.max(...anchor) + windowDays * MS_PER_DAY).toISOString(),
  };
}

export function sharedTransitSign(event: Pick<SharedTransitEvent, "transiting">, whenUTC: string): Sign {
  return longitudeToSign(eclipticLongitude(event.transiting, whenUTC));
}

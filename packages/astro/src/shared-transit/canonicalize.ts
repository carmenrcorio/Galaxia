/**
 * WS-A. One distinct event, one id, once.
 * Order of names does not create a second card. A pair already contained
 * in a larger same-sky cluster is not emitted beside that cluster.
 */

import type { AspectType, BodyName } from "../index";
import type { EnumeratedSharedCard, SharedTransitEvent, SharedTransitHit } from "./types";
import { PAIR_EXACTNESS_WINDOW_DAYS } from "./constants";

const MS_PER_DAY = 86_400_000;

export function sortSharedMembers<T extends { personId: string; natalPoint: string }>(members: readonly T[]): T[] {
  return [...members].sort((a, b) => {
    if (a.personId !== b.personId) return a.personId < b.personId ? -1 : 1;
    if (a.natalPoint !== b.natalPoint) return a.natalPoint < b.natalPoint ? -1 : 1;
    return 0;
  });
}

export function sharedMemberKey(member: { personId: string; natalPoint: string }): string {
  return `${member.personId}:${member.natalPoint}`;
}

/** Stable id. `{CS.Jupiter, Hubs.Moon}` and `{Hubs.Moon, CS.Jupiter}` match. */
export function sharedTransitCanonicalId(
  transiting: string,
  aspect: string,
  members: readonly { personId: string; natalPoint: string }[]
): string {
  const keys = sortSharedMembers(members).map(sharedMemberKey);
  return `${transiting}:${aspect}:${keys.join("|")}`;
}

function minOrb(members: readonly { orb: number }[]): number {
  return members.reduce((min, member) => Math.min(min, member.orb), Number.POSITIVE_INFINITY);
}

export function pairSharedTransitHits(hits: readonly SharedTransitHit[]): Array<[SharedTransitHit, SharedTransitHit]> {
  const groups = new Map<string, SharedTransitHit[]>();
  for (const hit of hits) {
    const key = `${hit.transiting}:${hit.aspect}`;
    const list = groups.get(key);
    if (list) list.push(hit);
    else groups.set(key, [hit]);
  }

  const pairs: Array<[SharedTransitHit, SharedTransitHit]> = [];
  for (const [key, list] of groups) {
    const body = key.slice(0, key.indexOf(":"));
    const windowMs = (PAIR_EXACTNESS_WINDOW_DAYS[body] ?? 7) * MS_PER_DAY;
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i]!;
        const b = list[j]!;
        if (a.personId === b.personId) continue;
        const dt = Math.abs(Date.parse(a.exactAt) - Date.parse(b.exactAt));
        if (Number.isNaN(dt) || dt > windowMs) continue;
        pairs.push([a, b]);
      }
    }
  }
  return pairs;
}

/** Same canonical id keeps the tighter orb. */
export function dedupeSharedTransitPairs(pairs: readonly (readonly [SharedTransitHit, SharedTransitHit])[]): SharedTransitEvent[] {
  const byId = new Map<string, SharedTransitEvent>();
  for (const [a, b] of pairs) {
    const members = sortSharedMembers([a, b]);
    const id = sharedTransitCanonicalId(a.transiting, a.aspect, members);
    const orb = minOrb(members);
    const existing = byId.get(id);
    if (existing && minOrb(existing.members) <= orb) continue;
    byId.set(id, {
      id,
      kind: "individual",
      transiting: a.transiting,
      aspect: a.aspect,
      members,
      salience: 0,
    });
  }
  return [...byId.values()];
}

/**
 * Drop an event whose members are a proper subset of a higher-salience
 * event with the same transiting body and aspect.
 */
export function suppressSubsetEvents<T extends Pick<SharedTransitEvent, "id" | "transiting" | "aspect" | "members" | "salience">>(
  events: readonly T[]
): T[] {
  const ranked = [...events].sort((a, b) => b.salience - a.salience || a.id.localeCompare(b.id));
  const kept: T[] = [];
  for (const event of ranked) {
    const keys = event.members.map(sharedMemberKey);
    const covered = kept.some((parent) => {
      if (parent.transiting !== event.transiting || parent.aspect !== event.aspect) return false;
      if (parent.members.length <= event.members.length) return false;
      const parentKeys = new Set(parent.members.map(sharedMemberKey));
      return keys.every((key) => parentKeys.has(key));
    });
    if (!covered) kept.push(event);
  }
  return kept;
}

function cardMinOrb(card: EnumeratedSharedCard): number {
  return minOrb(card.members);
}

/**
 * Collapse an enumerated feed (triples, subset pairs, reordered pairs)
 * to distinct astronomical clusters. Larger same-sky clusters outrank
 * the pairs copied out of them. This is the pre-ranking acceptance step.
 */
export function collapseEnumeratedSharedCards(cards: readonly EnumeratedSharedCard[]): EnumeratedSharedCard[] {
  const byId = new Map<string, EnumeratedSharedCard>();
  for (const card of cards) {
    const members = sortSharedMembers(card.members);
    const id = sharedTransitCanonicalId(card.transiting, card.aspect, members);
    const existing = byId.get(id);
    if (!existing || cardMinOrb(card) < cardMinOrb(existing)) {
      byId.set(id, { ...card, members });
    }
  }

  const ranked = [...byId.values()].sort((a, b) => {
    if (b.members.length !== a.members.length) return b.members.length - a.members.length;
    return cardMinOrb(a) - cardMinOrb(b);
  });

  const kept: EnumeratedSharedCard[] = [];
  for (const card of ranked) {
    const keys = card.members.map(sharedMemberKey);
    const covered = kept.some((parent) => {
      if (parent.transiting !== card.transiting || parent.aspect !== card.aspect) return false;
      if (parent.members.length <= card.members.length) return false;
      const parentKeys = new Set(parent.members.map(sharedMemberKey));
      return keys.every((key) => parentKeys.has(key));
    });
    if (!covered) kept.push(card);
  }
  return kept;
}

function asHit(
  transiting: BodyName,
  aspect: AspectType,
  member: EnumeratedSharedCard["members"][number]
): SharedTransitHit {
  return {
    transiting,
    aspect,
    personId: member.personId,
    personName: member.personName,
    natalPoint: member.natalPoint,
    natalSign: member.natalSign,
    natalLon: member.natalLon ?? 0,
    natalHouse: member.natalHouse,
    orb: member.orb,
    applying: member.applying ?? false,
    exactAt: member.exactAt ?? "1970-01-01T00:00:00.000Z",
    transitingSpeed: member.transitingSpeed ?? 0,
  };
}

/** One card per collapsed cluster. A 3+ cluster becomes its tightest pair, never a group card. */
export function pairEventsFromCollapsedCards(cards: readonly EnumeratedSharedCard[]): SharedTransitEvent[] {
  const events: SharedTransitEvent[] = [];
  for (const card of cards) {
    const hits = card.members.map((member) => asHit(card.transiting, card.aspect, member));
    let chosen: SharedTransitHit[];
    if (hits.length <= 2) {
      chosen = hits;
    } else {
      let best: SharedTransitHit[] | null = null;
      let bestSum = Number.POSITIVE_INFINITY;
      let bestId = "";
      for (let i = 0; i < hits.length; i++) {
        for (let j = i + 1; j < hits.length; j++) {
          const pair = sortSharedMembers([hits[i]!, hits[j]!]);
          const sum = pair[0]!.orb + pair[1]!.orb;
          const id = sharedTransitCanonicalId(card.transiting, card.aspect, pair);
          if (sum < bestSum || (sum === bestSum && (bestId === "" || id < bestId))) {
            best = pair;
            bestSum = sum;
            bestId = id;
          }
        }
      }
      chosen = best ?? hits.slice(0, 2);
    }
    const members = sortSharedMembers(chosen);
    events.push({
      id: sharedTransitCanonicalId(card.transiting, card.aspect, members),
      kind: "relational",
      transiting: card.transiting,
      aspect: card.aspect,
      members,
      salience: 0,
    });
  }
  return events;
}

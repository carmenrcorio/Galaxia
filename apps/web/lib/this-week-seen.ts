/**
 * Cross-day novelty ledger for This Week. Per owner, in localStorage.
 * Same-day reloads still show the cards. An earlier day suppresses an
 * event until its exactness moves. Not an astrology fact and not access control.
 */

import { mergeShownSharedTransits, type SharedTransitEvent, type ShownSharedTransit } from "@galaxia/astro";

export const THIS_WEEK_SEEN_KEY_PREFIX = "galaxia.thisWeek.shown.v1.";

const PREFIX = THIS_WEEK_SEEN_KEY_PREFIX;

export function readShownSharedTransits(ownerId: string): ShownSharedTransit[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PREFIX + ownerId);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ShownSharedTransit[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Drop every This Week novelty entry in this browser. Call after sign-out completes. */
export function clearShownSharedTransits(): void {
  if (typeof window === "undefined") return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key?.startsWith(PREFIX)) keys.push(key);
    }
    for (const key of keys) window.localStorage.removeItem(key);
  } catch {
    // Private mode. A later visit may still see the previous ledger.
  }
}

export function rememberShownSharedTransits(ownerId: string, events: readonly SharedTransitEvent[], todayYYYYMMDD: string): void {
  if (typeof window === "undefined" || events.length === 0) return;
  try {
    const next = mergeShownSharedTransits(readShownSharedTransits(ownerId), events, todayYYYYMMDD);
    window.localStorage.setItem(PREFIX + ownerId, JSON.stringify(next));
  } catch {
    // Private mode or quota. The card may repeat next visit. That is honest.
  }
}

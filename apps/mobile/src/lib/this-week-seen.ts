/**
 * Cross-day novelty ledger for This Week. Per owner, in AsyncStorage.
 * Same-day reloads still show the cards. An earlier day suppresses an
 * event until its exactness moves.
 */

import { mergeShownSharedTransits, type SharedTransitEvent, type ShownSharedTransit } from "@galaxia/astro";
import { cacheGet, cacheSet } from "./cache";

const PREFIX = "galaxia.thisWeek.shown.v1.";

export async function readShownSharedTransits(ownerId: string): Promise<ShownSharedTransit[]> {
  const parsed = await cacheGet<ShownSharedTransit[]>(PREFIX + ownerId);
  return Array.isArray(parsed) ? parsed : [];
}

export async function rememberShownSharedTransits(
  ownerId: string,
  events: readonly SharedTransitEvent[],
  todayYYYYMMDD: string
): Promise<void> {
  if (events.length === 0) return;
  const next = mergeShownSharedTransits(await readShownSharedTransits(ownerId), events, todayYYYYMMDD);
  await cacheSet(PREFIX + ownerId, next);
}

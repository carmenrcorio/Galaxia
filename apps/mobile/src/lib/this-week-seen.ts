/**
 * Cross-day novelty ledger for This Week. Per owner, in AsyncStorage.
 * Same-day reloads still show the cards. An earlier day suppresses an
 * event until its exactness moves.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { mergeShownSharedTransits, type SharedTransitEvent, type ShownSharedTransit } from "@galaxia/astro";
import { cacheGet, cacheSet } from "./cache";

export const THIS_WEEK_SEEN_KEY_PREFIX = "galaxia.thisWeek.shown.v1.";

const PREFIX = THIS_WEEK_SEEN_KEY_PREFIX;

export async function readShownSharedTransits(ownerId: string): Promise<ShownSharedTransit[]> {
  const parsed = await cacheGet<ShownSharedTransit[]>(PREFIX + ownerId);
  return Array.isArray(parsed) ? parsed : [];
}

/** Drop every This Week novelty entry on this device. Call after sign-out completes. */
export async function clearShownSharedTransits(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const matched = keys.filter((key) => key.startsWith(PREFIX));
    if (matched.length > 0) await AsyncStorage.multiRemove([...matched]);
  } catch {
    // A later visit may still see the previous ledger.
  }
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

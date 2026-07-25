/** Owner-local calendar day YYYY-MM-DD from a Date in the runtime TZ. */
export function ownerLocalDate(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Ephemeris instant for an owner-local day — local noon expressed as UTC ISO.
 * Callers in a known offset may pass their own whenUTC instead.
 */
export function whenUTCForOwnerLocalDate(dateYYYYMMDD: string, now: Date = new Date()): string {
  const [y, m, d] = dateYYYYMMDD.slice(0, 10).split("-").map(Number);
  // Construct in local TZ (same as ownerLocalDate), noon.
  const localNoon = new Date(y!, m! - 1, d!, 12, 0, 0, 0);
  // Preserve the intent even if `now` is unused — keeps signature stable for tests.
  void now;
  return localNoon.toISOString();
}

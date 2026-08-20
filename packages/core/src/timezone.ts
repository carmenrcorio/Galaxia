/**
 * Shared decision logic for capturing the account owner's current-residence
 * IANA timezone into `profiles.timezone` (nudge-delivery Phase A — see
 * `supabase/migrations/20260726010000_profiles_timezone_capture.sql`). This
 * is the one prerequisite input the Phase B server nudge job will need to
 * compute `ownerLocalDate()` for an owner instead of relying on the
 * runtime's local tz; this module does not touch `ownerLocalDate()` itself.
 *
 * Pure decision logic only — no Supabase I/O — so apps/web and apps/mobile
 * (and any future caller) share one rule and cannot drift on the null-guard
 * or the IANA validity check.
 */

/**
 * Validates a candidate IANA timezone string by round-tripping it through
 * `Intl.DateTimeFormat` itself: an invalid zone throws `RangeError`, so
 * returning it here means the runtime that produced it also accepts it back
 * as a `timeZone` option. Returns the value on success, `null` otherwise —
 * callers should never write a value this rejects.
 */
export function validateIanaTimezone(candidate: string | null | undefined): string | null {
  if (!candidate) return null;
  try {
    // Constructing (not just calling resolvedOptions on) is what throws for
    // an unrecognized zone.
    new Intl.DateTimeFormat(undefined, { timeZone: candidate });
    return candidate;
  } catch {
    return null;
  }
}

/**
 * profiles.timezone is captured once and never chased after: a traveling
 * user's changed tz is a Phase B/future concern, not this prerequisite.
 * Callers should write ONLY when this returns true, so navigating /
 * reloading after a value is already stored never re-writes it (the
 * write-amplification guard).
 */
export function shouldBackfillTimezone(storedTimezone: string | null | undefined): boolean {
  return !storedTimezone || storedTimezone.trim().length === 0;
}

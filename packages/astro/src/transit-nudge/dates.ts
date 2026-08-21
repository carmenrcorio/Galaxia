/**
 * Owner-local calendar day + ephemeris instant for the daily nudge.
 *
 * Nudge delivery Phase B1: both functions gained an OPTIONAL trailing
 * `timezone` param (IANA string, e.g. "America/Los_Angeles") so the
 * server-side cron job (apps/web/app/api/cron/nudge-compute/route.ts) can
 * compute a user's real owner-local day from `profiles.timezone` instead of
 * the runtime's local tz. Omitting the param (every existing client caller —
 * web home, web person page, mobile home) is byte-identical to the pre-B1
 * behavior: the runtime-tz path below is untouched, just gated behind
 * "no valid timezone was passed." An invalid/unparseable IANA string falls
 * back to the same runtime-tz path rather than throwing — never fabricate a
 * day for a broken tz string; skip-null/skip-invalid is the caller's job
 * (the cron route skips users with no stored timezone entirely).
 */

/** True when `Intl.DateTimeFormat` itself accepts `tz` as a `timeZone` option. */
function isValidIanaTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Owner-local calendar day (YYYY-MM-DD) for `now`, as seen from `timezone`. */
function localDateInTimezone(now: Date, timezone: string): string {
  // en-CA's default date format is ISO-shaped (YYYY-MM-DD) — no manual
  // part-assembly, and no risk of locale-dependent separators/ordering.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/**
 * UTC offset (minutes, e.g. -480 for PST) of `timezone` at the instant
 * `atUtcMs`. DST-correct because the offset is looked up for that specific
 * instant, not a fixed constant — a zone can be UTC-8 or UTC-7 depending on
 * the date.
 */
function utcOffsetMinutesAt(timezone: string, atUtcMs: number): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    timeZoneName: "longOffset",
  }).formatToParts(new Date(atUtcMs));
  const offsetLabel = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT+00:00";
  const match = /GMT([+-])(\d{2}):(\d{2})/.exec(offsetLabel);
  if (!match) return 0;
  const sign = match[1] === "-" ? -1 : 1;
  const hours = Number(match[2]);
  const minutes = Number(match[3]);
  return sign * (hours * 60 + minutes);
}

/**
 * UTC instant for local noon on `dateYYYYMMDD` in `timezone`. Guess-then-
 * correct: first guess noon as if it were UTC, look up that zone's real
 * offset at the guessed instant (accurate for the date because a zone has
 * at most one DST transition per day and none occur at noon in practice),
 * then apply the offset to get the true UTC instant for local noon.
 */
function utcNoonForDateInTimezone(dateYYYYMMDD: string, timezone: string): string {
  const [y, m, d] = dateYYYYMMDD.slice(0, 10).split("-").map(Number);
  const guessUtcMs = Date.UTC(y!, m! - 1, d!, 12, 0, 0, 0);
  const offsetMin = utcOffsetMinutesAt(timezone, guessUtcMs);
  // local = UTC + offset  =>  UTC = local - offset
  const actualUtcMs = guessUtcMs - offsetMin * 60_000;
  return new Date(actualUtcMs).toISOString();
}

/**
 * Owner-local calendar day YYYY-MM-DD.
 *
 * No `timezone` (or an invalid one): the pre-B1 runtime-local-tz path,
 * unchanged — correct by accident for a browser/device where the runtime tz
 * is the user's real tz.
 *
 * A valid IANA `timezone`: the owner's real calendar day in that zone,
 * independent of the runtime the code happens to execute in (the point of
 * the server job — Vercel's Node runtime is UTC, not the owner's tz).
 */
export function ownerLocalDate(now: Date = new Date(), timezone?: string | null): string {
  if (timezone && isValidIanaTimezone(timezone)) {
    return localDateInTimezone(now, timezone);
  }
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Ephemeris instant for an owner-local day — local noon expressed as UTC ISO.
 * Callers in a known offset may pass their own whenUTC instead.
 *
 * Same optional-`timezone` shape as `ownerLocalDate`: omitted/invalid falls
 * back to the pre-B1 runtime-tz path unchanged; a valid IANA zone computes
 * the DST-correct UTC instant for that zone's local noon on `dateYYYYMMDD`
 * (not noon-in-the-runtime's-tz, which would be wrong on a UTC server).
 */
export function whenUTCForOwnerLocalDate(
  dateYYYYMMDD: string,
  now: Date = new Date(),
  timezone?: string | null
): string {
  if (timezone && isValidIanaTimezone(timezone)) {
    return utcNoonForDateInTimezone(dateYYYYMMDD, timezone);
  }
  const [y, m, d] = dateYYYYMMDD.slice(0, 10).split("-").map(Number);
  // Construct in local TZ (same as ownerLocalDate), noon.
  const localNoon = new Date(y!, m! - 1, d!, 12, 0, 0, 0);
  // Preserve the intent even if `now` is unused — keeps signature stable for tests.
  void now;
  return localNoon.toISOString();
}

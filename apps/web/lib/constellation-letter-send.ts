/**
 * Pure helpers for the weekly constellation-letter cron. No `server-only`,
 * so vitest can import this directly.
 */

/**
 * Owner-local weekday (0 = Sunday ... 6 = Saturday) in their stored IANA
 * timezone, or null when the timezone cannot be resolved. Never fabricates
 * a UTC fallback.
 */
export function ownerLocalWeekday(now: Date, timezone: string): number | null {
  try {
    const weekday = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "short"
    }).format(now);
    const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return map[weekday] ?? null;
  } catch {
    return null;
  }
}

/**
 * True when this owner's local calendar day is Sunday. The workflow runs
 * daily after the relational-transit scan; this check is what narrows
 * each run to one letter per owner per local week.
 */
export function isDueForConstellationLetter(now: Date, timezone: string): boolean {
  return ownerLocalWeekday(now, timezone) === 0;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isLetterTrackingId(value: string | null | undefined): value is string {
  return Boolean(value && UUID_RE.test(value));
}

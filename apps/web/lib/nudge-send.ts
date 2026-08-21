import { orderSkyRowsForHome } from "@galaxia/astro";

/**
 * Pure, testable helpers for the nudge-send cron (Phase B2). Deliberately
 * has NO `server-only` import (unlike route.ts files) so this is directly
 * unit-testable in vitest — see nudge-send.test.ts.
 */

/** Target local hour (24h, "just turned") the "your sky today" email aims to land. */
export const NUDGE_SEND_TARGET_HOUR = 9;

/**
 * The owner's current local hour (0–23) in their stored IANA timezone, or
 * null when the timezone string can't be resolved by `Intl`. Never
 * fabricates a UTC fallback — same ENGINEERING.md §12 posture
 * `ownerLocalDate` already takes for the calendar day: skip rather than
 * guess a wrong hour.
 */
export function ownerLocalHour(now: Date, timezone: string): number | null {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "2-digit",
      hourCycle: "h23"
    }).formatToParts(now);
    const hourPart = parts.find((p) => p.type === "hour")?.value;
    const hour = hourPart === undefined ? NaN : Number(hourPart);
    return Number.isFinite(hour) ? hour : null;
  } catch {
    return null;
  }
}

/**
 * True when this owner's local time has just reached the target send hour.
 * Meant to be checked on an HOURLY cron — a single daily UTC cron cannot
 * send "9am local" to every timezone at once (Phase 0 diagnosis), so this
 * check runs every hour and only matches the subset of owners whose LOCAL
 * hour is currently the target — one true hour per owner per calendar day.
 */
export function isDueForNudgeSend(now: Date, timezone: string, targetHour: number = NUDGE_SEND_TARGET_HOUR): boolean {
  return ownerLocalHour(now, timezone) === targetHour;
}

/** A person_daily_nudges row, reduced to the fields the send job's gates need. */
export interface SendableNudgeRow {
  person_id: string;
  copy_tier: string;
  minor_safe: boolean;
  /** Defensive only — B1's peopleForTodaySky should already exclude passed people. */
  passed?: boolean;
}

/**
 * Minor-exclusion gate: drops any row whose SUBJECT PERSON is a minor.
 * `minor_safe` is the frozen, unmodified `isMinorForSafety` result the B1
 * compute job wrote at generation time
 * (packages/astro/src/transit-nudge/build-record.ts) — trusted here rather
 * than recomputed (Phase 0 diagnosis: the row is same-day and the safety
 * doctrine is "never read `is_minor` directly", not "never trust a frozen
 * `isMinorForSafety` result"). Also drops any row flagged `passed`,
 * belt-and-suspenders only.
 *
 * MUST run before `pickLeadNudgeRow` — the email subject line names
 * whichever row survives lead selection, so a minor's row must never even
 * reach that step, regardless of whether it would have "won" the lead.
 */
export function eligibleForEmailSend<T extends SendableNudgeRow>(rows: readonly T[]): T[] {
  return rows.filter((row) => row.minor_safe !== true && row.passed !== true);
}

/**
 * One nudge leads the email per owner per day — never a digest (Phase 0
 * diagnosis, founder-approved). Reuses `orderSkyRowsForHome` UNMODIFIED,
 * the exact function `/app` home uses to decide whose sky leads on the
 * constellation (apps/web/app/app/page.tsx), so the emailed lead always
 * matches what home would show as the lead that same day.
 *
 * `rows` must already be:
 *   1. Filtered through `eligibleForEmailSend` (no minor/passed rows).
 *   2. Ordered self-first-then-others (the same convention home uses before
 *      calling `orderSkyRowsForHome`, which only reorders for a pin — it
 *      does not establish the base order).
 *
 * Returns null when every eligible row that day is `empty_hedge` (nothing
 * notable to say) — the caller must skip sending rather than send an empty
 * email or fall back to a filtered-out row.
 */
export function pickLeadNudgeRow<T extends { person_id: string; copy_tier: string }>(
  rows: readonly T[],
  pinnedPersonId: string | null | undefined
): T | null {
  const ordered = orderSkyRowsForHome(rows as T[], pinnedPersonId);
  return ordered.find((row) => row.copy_tier !== "empty_hedge") ?? null;
}

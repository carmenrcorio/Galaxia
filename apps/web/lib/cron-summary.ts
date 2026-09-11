/**
 * Shared cron-summary accounting. Every `app/api/cron/*` route must return
 * `evaluated === sent + sum(skips)` so a silent lost-row run cannot look
 * green in the Actions log. Pure — no `server-only`, no email, no DB.
 */

export type CronTally = {
  evaluated: number;
  sent: number;
  skipped: Record<string, number>;
};

export function sumSkipCounts(skipped: Record<string, number>): number {
  return Object.values(skipped).reduce((sum, n) => sum + n, 0);
}

export function accountedFor(tally: CronTally): number {
  return tally.sent + sumSkipCounts(tally.skipped);
}

export type CronSummaryBody<T extends CronTally> =
  | (T & { ok: true })
  | (T & { ok: false; mismatch: number });

/**
 * `mismatch` is the accounted total (`sent + sum(skips)`) when it does not
 * equal `evaluated`. HTTP 500 so `curl --fail-with-body` in the GitHub
 * Actions cron workflows turns red instead of logging a quiet 200.
 */
export function cronSummaryResponse<T extends CronTally>(
  summary: T
): { body: CronSummaryBody<T>; status: number } {
  const accounted = accountedFor(summary);
  if (accounted === summary.evaluated) {
    return { body: { ...summary, ok: true }, status: 200 };
  }
  return { body: { ...summary, ok: false, mismatch: accounted }, status: 500 };
}

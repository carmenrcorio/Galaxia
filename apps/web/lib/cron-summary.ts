/**
 * Shared cron-summary accounting. Every `app/api/cron/*` route must return
 * `evaluated === sent + sum(skips)` so a silent lost-row run cannot look
 * green in the Actions log. Pure — no `server-only`, no email, no DB.
 *
 * Also owns the cursor pager every cron route uses so a capped
 * `.limit(1000)` cannot silently drop the rest of the table while still
 * reporting `ok: true`.
 */

/** Page size for id-cursor walks. 200 keeps each PostgREST round-trip small. */
export const CRON_PAGE_SIZE = 200;

/**
 * Soft deadline inside the 800s Vercel `maxDuration`. Break, log, and
 * return `ok: true` with `truncated: true` so GitHub Actions stays green
 * and the next scheduled run continues from the start (every job is
 * idempotent via its ledger / upsert).
 */
export const CRON_TIME_BUDGET_MS = 700_000;

export type CronTally = {
  evaluated: number;
  sent: number;
  skipped: Record<string, number>;
  pages?: number;
  truncated?: boolean;
};

export type CronPageRow = { id: string };

export type WalkCronPagesResult = {
  pages: number;
  truncated: boolean;
  evaluated: number;
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

export function isCronTallyMismatch<T extends CronTally>(
  body: CronSummaryBody<T>
): body is T & { ok: false; mismatch: number } {
  return body.ok === false;
}

export function cronTimeBudgetExceeded(
  startedAtMs: number,
  timeBudgetMs: number = CRON_TIME_BUDGET_MS,
  now: () => number = Date.now
): boolean {
  return now() - startedAtMs > timeBudgetMs;
}

/**
 * Walk every matching row via `id > lastId` pages of `pageSize`. Stops
 * cleanly on an empty page, a short last page, or the time budget.
 * `evaluated` is the number of rows actually visited — never the size of
 * a capped first page — so the summary invariant holds across pages.
 */
export async function walkCronPages<T extends CronPageRow>(args: {
  fetchPage: (lastId: string | null, pageSize: number) => Promise<T[]>;
  visit: (row: T) => Promise<void> | void;
  pageSize?: number;
  startedAtMs?: number;
  timeBudgetMs?: number;
  now?: () => number;
}): Promise<WalkCronPagesResult> {
  const pageSize = args.pageSize ?? CRON_PAGE_SIZE;
  const startedAtMs = args.startedAtMs ?? Date.now();
  const timeBudgetMs = args.timeBudgetMs ?? CRON_TIME_BUDGET_MS;
  const now = args.now ?? Date.now;

  let lastId: string | null = null;
  let pages = 0;
  let evaluated = 0;
  let truncated = false;

  for (;;) {
    if (cronTimeBudgetExceeded(startedAtMs, timeBudgetMs, now)) {
      truncated = true;
      break;
    }

    const page = await args.fetchPage(lastId, pageSize);
    if (page.length === 0) break;
    pages += 1;

    for (const row of page) {
      if (cronTimeBudgetExceeded(startedAtMs, timeBudgetMs, now)) {
        truncated = true;
        break;
      }
      await args.visit(row);
      evaluated += 1;
    }

    if (truncated) break;
    if (page.length < pageSize) break;
    lastId = page[page.length - 1]!.id;
  }

  if (truncated) {
    console.warn("cron pagination truncated by time budget", { pages, evaluated });
  }

  return { pages, truncated, evaluated };
}

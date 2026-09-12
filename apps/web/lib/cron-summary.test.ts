import { describe, expect, it, vi } from "vitest";
import {
  accountedFor,
  cronSummaryResponse,
  isCronTallyMismatch,
  sumSkipCounts,
  walkCronPages
} from "./cron-summary";
import { assertDisposableDbTarget } from "./test-utils/assert-not-prod";

const DISPOSABLE_URL = "https://abcdefghijklmnopqrst.supabase.co";

describe("cron-summary tests never open a database", () => {
  it("still go behind assertDisposableDbTarget against a non-prod placeholder", () => {
    const prev = process.env.ALLOW_LIVE_DB_TESTS_AGAINST;
    process.env.ALLOW_LIVE_DB_TESTS_AGAINST = "abcdefghijklmnopqrst";
    try {
      expect(assertDisposableDbTarget(DISPOSABLE_URL)).toBe("abcdefghijklmnopqrst");
    } finally {
      if (prev === undefined) delete process.env.ALLOW_LIVE_DB_TESTS_AGAINST;
      else process.env.ALLOW_LIVE_DB_TESTS_AGAINST = prev;
    }
  });
});

describe("cronSummaryResponse — evaluated must equal sent + sum(skips)", () => {
  it("returns ok:true and HTTP 200 when the tally reconciles, including zeroed skip keys", () => {
    const skipped = { noEmail: 0, notDue: 1, alreadySent: 0, noResendKey: 14, sendFailed: 0 };
    const result = cronSummaryResponse({ evaluated: 15, sent: 0, skipped });
    expect(sumSkipCounts(skipped)).toBe(15);
    expect(accountedFor({ evaluated: 15, sent: 0, skipped })).toBe(15);
    expect(result.status).toBe(200);
    expect(result.body).toEqual({
      ok: true,
      evaluated: 15,
      sent: 0,
      skipped
    });
  });

  it("fires ok:false with a named mismatch field and HTTP 500 when a row is deliberately dropped", () => {
    // The production trial-emails run: 15 evaluated, only notDue:1 counted.
    const skipped = { noEmail: 0, notDue: 1, alreadySent: 0, noResendKey: 0, sendFailed: 0 };
    const result = cronSummaryResponse({ evaluated: 15, sent: 0, skipped });
    expect(result.status).toBe(500);
    expect(isCronTallyMismatch(result.body)).toBe(true);
    if (!isCronTallyMismatch(result.body)) throw new Error("expected mismatch");
    expect(result.body.mismatch).toBe(1);
    expect(result.body.evaluated).toBe(15);
    expect(result.body.sent).toBe(0);
  });

  it("passes extra fields through on both the ok and mismatch bodies", () => {
    const ok = cronSummaryResponse({
      evaluated: 2,
      sent: 1,
      skipped: { noPeople: 1 },
      usersProcessed: 1,
      rowsWritten: 3
    });
    expect(ok.body).toMatchObject({ ok: true, usersProcessed: 1, rowsWritten: 3 });

    const bad = cronSummaryResponse({
      evaluated: 2,
      sent: 0,
      skipped: { noPeople: 1 },
      ownersScanned: 0
    });
    expect(bad.body).toMatchObject({ ok: false, mismatch: 1, ownersScanned: 0 });
  });
});

describe("cronSummaryResponse — same invariant for the other four cron skip shapes", () => {
  it("nudge-compute: usersProcessed-as-sent plus nullTimezone/noPeople reconciles", () => {
    const skipped = { nullTimezone: 0, noPeople: 3 };
    const result = cronSummaryResponse({
      evaluated: 8,
      sent: 5,
      skipped,
      usersProcessed: 5,
      rowsWritten: 12
    });
    expect(result.status).toBe(200);
    expect(result.body.ok).toBe(true);
  });

  it("nudge-compute: fires when a processed owner is dropped from both sent and skips", () => {
    const result = cronSummaryResponse({
      evaluated: 8,
      sent: 4,
      skipped: { nullTimezone: 0, noPeople: 3 },
      usersProcessed: 4,
      rowsWritten: 12
    });
    expect(isCronTallyMismatch(result.body)).toBe(true);
    if (!isCronTallyMismatch(result.body)) throw new Error("expected mismatch");
    expect(result.body.mismatch).toBe(7);
  });

  it("nudge-send: sent plus every gate, including noResendKey/sendFailed, reconciles", () => {
    const skipped = {
      nullTimezone: 0,
      notDueThisHour: 6,
      noRowsToday: 0,
      noEligibleAfterMinorExclusion: 0,
      noLeadContent: 0,
      alreadySentToday: 0,
      noEmail: 0,
      noResendKey: 0,
      sendFailed: 0
    };
    const result = cronSummaryResponse({ evaluated: 6, sent: 0, skipped, usersProcessed: 0 });
    expect(result.status).toBe(200);
    expect(result.body.ok).toBe(true);
  });

  it("nudge-send: fires when sendEmail-false rows are omitted from the tally", () => {
    const skipped = {
      nullTimezone: 0,
      notDueThisHour: 0,
      noRowsToday: 0,
      noEligibleAfterMinorExclusion: 0,
      noLeadContent: 0,
      alreadySentToday: 0,
      noEmail: 0,
      noResendKey: 0,
      sendFailed: 0
    };
    const result = cronSummaryResponse({ evaluated: 3, sent: 0, skipped, usersProcessed: 0 });
    expect(isCronTallyMismatch(result.body)).toBe(true);
    if (!isCronTallyMismatch(result.body)) throw new Error("expected mismatch");
    expect(result.body.mismatch).toBe(0);
  });

  it("relational-transit-scan: ownersScanned-as-sent plus noPeople/singlePerson reconciles", () => {
    const skipped = { noPeople: 7, singlePerson: 1 };
    const result = cronSummaryResponse({
      evaluated: 16,
      sent: 8,
      skipped,
      ownersScanned: 8,
      eventsUpserted: 2
    });
    expect(result.status).toBe(200);
    expect(result.body.ok).toBe(true);
  });

  it("relational-transit-scan: fires when a scanned owner is dropped", () => {
    const result = cronSummaryResponse({
      evaluated: 16,
      sent: 7,
      skipped: { noPeople: 7, singlePerson: 1 },
      ownersScanned: 7,
      eventsUpserted: 2
    });
    expect(isCronTallyMismatch(result.body)).toBe(true);
    if (!isCronTallyMismatch(result.body)) throw new Error("expected mismatch");
    expect(result.body.mismatch).toBe(15);
  });

  it("relational-transit-push: pushed-as-sent plus preference/token/pushFailed reconciles", () => {
    const skipped = { noTokens: 2, preferenceOff: 1, majorOnlyFiltered: 1, pushFailed: 0 };
    const result = cronSummaryResponse({ evaluated: 6, sent: 2, skipped, pushed: 2 });
    expect(result.status).toBe(200);
    expect(result.body.ok).toBe(true);
  });

  it("relational-transit-push: fires when a caught push failure is uncounted", () => {
    const dropped = cronSummaryResponse({
      evaluated: 6,
      sent: 1,
      skipped: { noTokens: 2, preferenceOff: 1, majorOnlyFiltered: 1, pushFailed: 0 },
      pushed: 1
    });
    expect(isCronTallyMismatch(dropped.body)).toBe(true);
    if (!isCronTallyMismatch(dropped.body)) throw new Error("expected mismatch");
    expect(dropped.body.mismatch).toBe(5);
  });
});

describe("walkCronPages — cursor pages accumulate and the tally still reconciles", () => {
  it("walks two pages, threads lastId, and cronSummaryResponse stays ok:true", async () => {
    const pages: Array<{ id: string }[]> = [
      [{ id: "aaa" }, { id: "bbb" }],
      [{ id: "ccc" }, { id: "ddd" }]
    ];
    const cursors: Array<string | null> = [];
    let pageIdx = 0;
    const skipped = { noPeople: 0 };
    let sent = 0;

    const walk = await walkCronPages({
      pageSize: 2,
      fetchPage: async (lastId) => {
        cursors.push(lastId);
        return pages[pageIdx++] ?? [];
      },
      visit: async (row) => {
        if (row.id === "bbb") skipped.noPeople += 1;
        else sent += 1;
      }
    });

    expect(cursors).toEqual([null, "bbb", "ddd"]);
    expect(walk.pages).toBe(2);
    expect(walk.evaluated).toBe(4);
    expect(walk.truncated).toBe(false);
    expect(sent + skipped.noPeople).toBe(walk.evaluated);

    const result = cronSummaryResponse({
      evaluated: walk.evaluated,
      sent,
      skipped,
      pages: walk.pages,
      truncated: walk.truncated
    });
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      ok: true,
      evaluated: 4,
      sent: 3,
      skipped: { noPeople: 1 },
      pages: 2,
      truncated: false
    });
  });

  it("stops mid-page when the time budget fires, logs, and still returns ok:true with truncated", async () => {
    let t = 0;
    const skipped = { leftover: 0 };
    let sent = 0;
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const walk = await walkCronPages({
        pageSize: 2,
        startedAtMs: 0,
        timeBudgetMs: 50,
        now: () => t,
        fetchPage: async (lastId) => {
          if (!lastId) return [{ id: "a" }, { id: "b" }];
          return [{ id: "c" }, { id: "d" }];
        },
        visit: async () => {
          sent += 1;
          t = 100;
        }
      });
      expect(walk.evaluated).toBe(1);
      expect(walk.pages).toBe(1);
      expect(walk.truncated).toBe(true);
      expect(warn).toHaveBeenCalled();
      const result = cronSummaryResponse({
        evaluated: walk.evaluated,
        sent,
        skipped,
        pages: walk.pages,
        truncated: walk.truncated
      });
      expect(result.status).toBe(200);
      expect(result.body.ok).toBe(true);
      expect(result.body).toMatchObject({ truncated: true, pages: 1, evaluated: 1, sent: 1 });
    } finally {
      warn.mockRestore();
    }
  });
});

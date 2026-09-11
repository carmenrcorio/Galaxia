import { describe, expect, it } from "vitest";
import { cronSummaryResponse, isCronTallyMismatch } from "./cron-summary";
import {
  classifyTrialEmailRow,
  emptyTrialEmailSkipped,
  pickTrialEmailKind,
  tallyTrialEmailRows,
  trialEmailAlreadyKeys,
  type TrialEmailRowFacts
} from "./trial-emails";
import { assertDisposableDbTarget } from "./test-utils/assert-not-prod";

const DISPOSABLE_URL = "https://abcdefghijklmnopqrst.supabase.co";

describe("trial-emails tests never open a database or send mail", () => {
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

const sendable = {
  alreadyCount: 0,
  hasEmail: true,
  hasResendKey: true,
  sendSucceeded: true
} as const;

function row(partial: Partial<TrialEmailRowFacts> & Pick<TrialEmailRowFacts, "ageDays" | "daysToEnd" | "peopleCount">): TrialEmailRowFacts {
  return { ...sendable, ...partial };
}

/**
 * One row per skip reason and per sendable kind — the production-shaped
 * mix plus the gates the 2026-09-11 run never reached (alreadySent / noEmail /
 * sendFailed, day4_one, and the notDue gaps).
 */
const EVERY_BRANCH: TrialEmailRowFacts[] = [
  // notDue: age past day4, daysToEnd just outside the day11 window (prod row)
  row({ ageDays: 9.66, daysToEnd: 4.34, peopleCount: 3 }),
  // notDue: day4 window but no people
  row({ ageDays: 5, daysToEnd: 9, peopleCount: 0 }),
  // notDue: day1 window but no people
  row({ ageDays: 1, daysToEnd: 13, peopleCount: 0 }),
  // notDue: daysToEnd in the (0, 2) gap
  row({ ageDays: 12, daysToEnd: 1, peopleCount: 4 }),
  // alreadySent
  row({ ageDays: 1.5, daysToEnd: 12, peopleCount: 1, alreadyCount: 1 }),
  // noEmail
  row({ ageDays: 1.5, daysToEnd: 12, peopleCount: 1, hasEmail: false }),
  // noResendKey (the 14 uncounted production rows)
  row({ ageDays: 1.56, daysToEnd: 12.44, peopleCount: 3, hasResendKey: false }),
  // sendFailed
  row({ ageDays: 11, daysToEnd: 3, peopleCount: 2, sendSucceeded: false }),
  // sent: day1
  row({ ageDays: 1.56, daysToEnd: 12.44, peopleCount: 3 }),
  // sent: day4_one
  row({ ageDays: 5, daysToEnd: 9, peopleCount: 1 }),
  // sent: day4_multi
  row({ ageDays: 5.42, daysToEnd: 8.58, peopleCount: 2 }),
  // sent: day11
  row({ ageDays: 11, daysToEnd: 3, peopleCount: 0 }),
  // sent: day14
  row({ ageDays: 22, daysToEnd: -8, peopleCount: 15 })
];

describe("pickTrialEmailKind", () => {
  it("returns day14 when the trial has already ended", () => {
    expect(pickTrialEmailKind(22, -8, 15)).toBe("day14");
    expect(pickTrialEmailKind(14, 0, 0)).toBe("day14");
  });

  it("returns day11 when days-to-end is in [2, 4], even if age would also match day4", () => {
    expect(pickTrialEmailKind(5, 3, 2)).toBe("day11");
    expect(pickTrialEmailKind(11, 2, 0)).toBe("day11");
    expect(pickTrialEmailKind(11, 4, 4)).toBe("day11");
  });

  it("returns day4_one / day4_multi / null from people count in the day-4 age window", () => {
    expect(pickTrialEmailKind(5, 9, 1)).toBe("day4_one");
    expect(pickTrialEmailKind(5.42, 8.58, 2)).toBe("day4_multi");
    expect(pickTrialEmailKind(5, 9, 0)).toBeNull();
  });

  it("returns day1 only when age < 3 and they have at least one person", () => {
    expect(pickTrialEmailKind(1.56, 12.44, 3)).toBe("day1");
    expect(pickTrialEmailKind(1, 13, 0)).toBeNull();
  });

  it("returns null in the production notDue gap (age past day4, daysToEnd just above 4)", () => {
    expect(pickTrialEmailKind(9.66, 4.34, 3)).toBeNull();
  });
});

describe("trialEmailAlreadyKeys", () => {
  it("treats the two day4 variants as one idempotency group", () => {
    expect(trialEmailAlreadyKeys("day4_one")).toEqual(["day4_one", "day4_multi"]);
    expect(trialEmailAlreadyKeys("day4_multi")).toEqual(["day4_one", "day4_multi"]);
    expect(trialEmailAlreadyKeys("day1")).toEqual(["day1"]);
    expect(trialEmailAlreadyKeys("day11")).toEqual(["day11"]);
    expect(trialEmailAlreadyKeys("day14")).toEqual(["day14"]);
  });
});

describe("classifyTrialEmailRow — every skip and send branch", () => {
  it("classifies each skip reason and each sendable kind", () => {
    expect(classifyTrialEmailRow(EVERY_BRANCH[0]!)).toEqual({ sent: false, skip: "notDue" });
    expect(classifyTrialEmailRow(EVERY_BRANCH[4]!)).toEqual({ sent: false, skip: "alreadySent" });
    expect(classifyTrialEmailRow(EVERY_BRANCH[5]!)).toEqual({ sent: false, skip: "noEmail" });
    expect(classifyTrialEmailRow(EVERY_BRANCH[6]!)).toEqual({ sent: false, skip: "noResendKey" });
    expect(classifyTrialEmailRow(EVERY_BRANCH[7]!)).toEqual({ sent: false, skip: "sendFailed" });
    expect(classifyTrialEmailRow(EVERY_BRANCH[8]!)).toEqual({ sent: true, kind: "day1" });
    expect(classifyTrialEmailRow(EVERY_BRANCH[9]!)).toEqual({ sent: true, kind: "day4_one" });
    expect(classifyTrialEmailRow(EVERY_BRANCH[10]!)).toEqual({ sent: true, kind: "day4_multi" });
    expect(classifyTrialEmailRow(EVERY_BRANCH[11]!)).toEqual({ sent: true, kind: "day11" });
    expect(classifyTrialEmailRow(EVERY_BRANCH[12]!)).toEqual({ sent: true, kind: "day14" });
  });
});

describe("tallyTrialEmailRows — invariant holds across every branch", () => {
  it("increments exactly one counter per row and reconciles", () => {
    const summary = tallyTrialEmailRows(EVERY_BRANCH);
    expect(summary).toEqual({
      evaluated: 13,
      sent: 5,
      skipped: {
        noEmail: 1,
        notDue: 4,
        alreadySent: 1,
        noResendKey: 1,
        sendFailed: 1
      }
    });
    expect(emptyTrialEmailSkipped()).toEqual({
      noEmail: 0,
      notDue: 0,
      alreadySent: 0,
      noResendKey: 0,
      sendFailed: 0
    });
    const result = cronSummaryResponse(summary);
    expect(result.status).toBe(200);
    expect(result.body.ok).toBe(true);
    expect(result.body.sent + Object.values(result.body.skipped).reduce((a, n) => a + n, 0)).toBe(
      summary.evaluated
    );
  });

  it("matches the 2026-09-11 production distribution once sendEmail-false is counted", () => {
    const prodLike: TrialEmailRowFacts[] = [
      row({ ageDays: 9.66, daysToEnd: 4.34, peopleCount: 3 }), // notDue
      row({ ageDays: 1.56, daysToEnd: 12.44, peopleCount: 3, hasResendKey: false }), // day1
      ...Array.from({ length: 4 }, () => row({ ageDays: 11, daysToEnd: 3, peopleCount: 2, hasResendKey: false })),
      ...Array.from({ length: 8 }, () => row({ ageDays: 22, daysToEnd: -8, peopleCount: 1, hasResendKey: false })),
      row({ ageDays: 5.42, daysToEnd: 8.58, peopleCount: 2, hasResendKey: false }) // day4_multi
    ];
    const summary = tallyTrialEmailRows(prodLike);
    expect(summary).toEqual({
      evaluated: 15,
      sent: 0,
      skipped: { noEmail: 0, notDue: 1, alreadySent: 0, noResendKey: 14, sendFailed: 0 }
    });
    const result = cronSummaryResponse(summary);
    expect(result.status).toBe(200);
    expect(result.body.ok).toBe(true);
  });

  it("fires ok:false when a due row is deliberately dropped from the tally", () => {
    const summary = tallyTrialEmailRows(EVERY_BRANCH);
    const dropped = {
      ...summary,
      skipped: { ...summary.skipped, sendFailed: 0 }
    };
    const result = cronSummaryResponse(dropped);
    expect(result.status).toBe(500);
    expect(isCronTallyMismatch(result.body)).toBe(true);
    if (!isCronTallyMismatch(result.body)) throw new Error("expected mismatch");
    expect(result.body.mismatch).toBe(summary.evaluated - 1);
    expect(result.body.evaluated).toBe(13);
  });
});

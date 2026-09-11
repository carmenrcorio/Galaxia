/**
 * Pure trial-email due/skip decision. The cron route (`app/api/cron/trial-emails`)
 * uses these helpers so every branch is unit-testable without sending mail or
 * opening a database. No `server-only` import.
 */

import type { TrialEmailKind } from "./emails";

export type TrialEmailSkipReason = "notDue" | "alreadySent" | "noEmail" | "noResendKey" | "sendFailed";

export type TrialEmailSkipped = Record<TrialEmailSkipReason, number>;

export function emptyTrialEmailSkipped(): TrialEmailSkipped {
  return { noEmail: 0, notDue: 0, alreadySent: 0, noResendKey: 0, sendFailed: 0 };
}

/**
 * Which lifecycle email is due this run, or null when none is. Priority
 * matches the route: ended trial, then ~3 days out, then day-4 variants,
 * then day-1. One kind per user per run.
 */
export function pickTrialEmailKind(
  ageDays: number,
  daysToEnd: number | null,
  peopleCount: number
): TrialEmailKind | null {
  if (daysToEnd !== null && daysToEnd <= 0) return "day14";
  if (daysToEnd !== null && daysToEnd >= 2 && daysToEnd <= 4) return "day11";
  if (ageDays >= 3 && ageDays < 8) {
    if (peopleCount === 1) return "day4_one";
    if (peopleCount >= 2) return "day4_multi";
    return null;
  }
  if (ageDays < 3 && peopleCount >= 1) return "day1";
  return null;
}

/** day4 has two variants — never send both. */
export function trialEmailAlreadyKeys(kind: TrialEmailKind): TrialEmailKind[] {
  return kind === "day4_one" || kind === "day4_multi" ? ["day4_one", "day4_multi"] : [kind];
}

export type TrialEmailRowFacts = {
  ageDays: number;
  daysToEnd: number | null;
  peopleCount: number;
  alreadyCount: number;
  hasEmail: boolean;
  hasResendKey: boolean;
  sendSucceeded: boolean;
};

export type TrialEmailOutcome =
  | { sent: true; kind: TrialEmailKind }
  | { sent: false; skip: TrialEmailSkipReason };

/**
 * Full per-row decision given already-fetched facts. `sendSucceeded` is
 * only consulted when the row would otherwise send.
 */
export function classifyTrialEmailRow(facts: TrialEmailRowFacts): TrialEmailOutcome {
  const kind = pickTrialEmailKind(facts.ageDays, facts.daysToEnd, facts.peopleCount);
  if (!kind) return { sent: false, skip: "notDue" };
  if (facts.alreadyCount > 0) return { sent: false, skip: "alreadySent" };
  if (!facts.hasEmail) return { sent: false, skip: "noEmail" };
  if (!facts.hasResendKey) return { sent: false, skip: "noResendKey" };
  if (!facts.sendSucceeded) return { sent: false, skip: "sendFailed" };
  return { sent: true, kind };
}

export function tallyTrialEmailRows(rows: TrialEmailRowFacts[]): {
  evaluated: number;
  sent: number;
  skipped: TrialEmailSkipped;
} {
  const skipped = emptyTrialEmailSkipped();
  let sent = 0;
  for (const row of rows) {
    const outcome = classifyTrialEmailRow(row);
    if (outcome.sent === false) {
      skipped[outcome.skip] += 1;
    } else {
      sent += 1;
    }
  }
  return { evaluated: rows.length, sent, skipped };
}

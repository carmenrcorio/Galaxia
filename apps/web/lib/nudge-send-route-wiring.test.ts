import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Source-level guards for nudge-delivery Phase B2's send job
 * (apps/web/app/api/cron/nudge-send/route.ts). Same reasoning as
 * nudge-compute-route-wiring.test.ts: the route imports lib/env.server.ts
 * (server-only), so this reads the actual source instead of importing it.
 */

const REPO_ROOT = join(__dirname, "..", "..", "..");
const ROUTE_PATH = "apps/web/app/api/cron/nudge-send/route.ts";

function readRoute(): string {
  return readFileSync(join(REPO_ROOT, ROUTE_PATH), "utf8");
}

describe("nudge-send route — fails closed like nudge-compute/trial-emails", () => {
  const src = readRoute();

  it("503s when CRON_SECRET is unset, 401s on a wrong/missing bearer header", () => {
    expect(src).toContain("const secret = process.env.CRON_SECRET;");
    expect(src).toMatch(/if\s*\(\s*!secret\s*\)\s*\{[\s\S]{0,200}status:\s*503/);
    expect(src).toContain('req.headers.get("authorization")');
    expect(src).toMatch(/auth !== `Bearer \$\{secret\}`[\s\S]{0,200}status:\s*401/);
  });

  it("uses a service-role client with persistSession: false", () => {
    expect(src).toContain("privateEnv.serviceRole");
    expect(src).toMatch(/createClient\([^)]*persistSession:\s*false/);
  });

  it("is a Node-runtime route (no `export const runtime = \"edge\"`)", () => {
    expect(src).not.toMatch(/export const runtime\s*=\s*["']edge["']/);
  });
});

describe("nudge-send route — separate from B1 compute, read-only against person_daily_nudges", () => {
  const src = readRoute();

  it("touches only the expected tables — profiles, person_daily_nudges, people, daily_nudge_emails", () => {
    const tableCalls = [...src.matchAll(/\.from\("([a-z_]+)"\)/g)].map((m) => m[1]);
    expect(new Set(tableCalls)).toEqual(new Set(["profiles", "daily_nudge_emails", "person_daily_nudges", "people"]));
  });

  it("only ever .select()s person_daily_nudges — every write call chained off it is disqualified", () => {
    const afterEachFrom = [...src.matchAll(/\.from\("person_daily_nudges"\)([\s\S]{0,40})/g)].map((m) => m[1]);
    for (const following of afterEachFrom) {
      expect(following).toMatch(/\.select\(/);
      expect(following).not.toMatch(/\.(upsert|insert|update)\(/);
    }
  });

  it("does not import or call B1's row-writing or selection/copy internals (not B2's job — doc-comment mentions of the name are fine, calls/imports are not)", () => {
    for (const forbidden of ["planDailyNudgeWrites", "buildPersonDailyNudge", "eligibleNudgeHits", "selectDailyHit", "resolveNudgeCopy"]) {
      expect(src).not.toMatch(new RegExp(`(import[^;]*${forbidden}|${forbidden}\\()`));
    }
  });

  it("filters person_daily_nudges to the owner and today's local date before reading", () => {
    expect(src).toContain('.eq("owner_id", profile.id)');
    expect(src).toMatch(/\.eq\("date",\s*localDate\)/);
  });
});

describe("nudge-send route — gate order: consent, then local-hour, then ledger, then minor-exclusion, then lead pick", () => {
  const src = readRoute();

  it("filters consent at the query level", () => {
    expect(src).toContain('.eq("daily_nudge_emails_enabled", true)');
  });

  it("checks isDueForNudgeSend before touching person_daily_nudges or the ledger", () => {
    const dueIdx = src.indexOf("isDueForNudgeSend(");
    const nudgeRowsIdx = src.indexOf('.from("person_daily_nudges")');
    const ledgerIdx = src.indexOf('.from("daily_nudge_emails")');
    expect(dueIdx).toBeGreaterThan(-1);
    expect(dueIdx).toBeLessThan(ledgerIdx);
    expect(dueIdx).toBeLessThan(nudgeRowsIdx);
  });

  it("calls eligibleForEmailSend strictly before pickLeadNudgeRow, source-order", () => {
    const eligibleIdx = src.indexOf("eligibleForEmailSend(");
    const pickIdx = src.indexOf("pickLeadNudgeRow(");
    expect(eligibleIdx).toBeGreaterThan(-1);
    expect(pickIdx).toBeGreaterThan(-1);
    expect(eligibleIdx).toBeLessThan(pickIdx);
  });

  it("skips the owner entirely (continue) when nothing survives minor-exclusion — never falls back to a filtered row", () => {
    expect(src).toMatch(/if\s*\(\s*!eligible\.length\s*\)\s*\{[\s\S]{0,120}continue;/);
  });

  it("imports pickLeadNudgeRow / eligibleForEmailSend / isDueForNudgeSend from the pure lib, not re-derived inline", () => {
    expect(src).toMatch(/from\s*"\.\.\/\.\.\/\.\.\/\.\.\/lib\/nudge-send"/);
    for (const fn of ["eligibleForEmailSend", "isDueForNudgeSend", "pickLeadNudgeRow"]) {
      expect(src).toContain(fn);
    }
  });
});

describe("nudge-send route — one email per owner per day, ledger idempotency", () => {
  const src = readRoute();

  it("upserts the ledger with onConflict owner_id,date and ignoreDuplicates true", () => {
    expect(src).toMatch(/onConflict:\s*"owner_id,date"/);
    expect(src).toMatch(/ignoreDuplicates:\s*true/);
  });

  it("checks the ledger for today's date before sending", () => {
    expect(src).toContain('.from("daily_nudge_emails")');
    expect(src).toMatch(/\.eq\("date",\s*localDate\)/);
  });

  it("only inserts the ledger row after sendEmail resolves ok", () => {
    expect(src).toMatch(/if\s*\(\s*ok\s*\)\s*\{[\s\S]{0,200}daily_nudge_emails/);
  });
});

describe("nudge-send route — subject line inputs are structurally minor-safe", () => {
  const src = readRoute();

  it("builds the email from the post-exclusion lead row, not a raw/unfiltered row", () => {
    expect(src).toContain("subjectPersonName");
    // subjectPersonName is derived from lead.person_id, and lead comes from
    // pickLeadNudgeRow(eligible, ...) — eligible is the minor-filtered set.
    expect(src).toMatch(/pickLeadNudgeRow\(eligible,/);
  });

  it("never passes copy_resolved or a theme/domain field into a subject builder", () => {
    expect(src).not.toMatch(/nudgeEmailSubject\(/);
  });
});

describe("nudge-send route — greets via resolveAccountName, never an email fragment", () => {
  const src = readRoute();

  it("imports resolveAccountName from @galaxia/core", () => {
    expect(src).toContain('import { resolveAccountName } from "@galaxia/core"');
  });

  it("never splits the recipient email to derive a name", () => {
    expect(src).not.toMatch(/to\s*\.\s*split\s*\(\s*["'`]@/);
  });
});

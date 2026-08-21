import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Source-level guards for nudge-delivery Phase B1's server compute job
 * (apps/web/app/api/cron/nudge-compute/route.ts). Importing the route
 * module directly isn't viable in this suite — it pulls in
 * `lib/env.server.ts`, which imports the `server-only` package that throws
 * unconditionally outside a Next.js server-bundle context (Next aliases it
 * away at build time; plain vitest/Node has no such alias). Same class of
 * constraint `timezone-wiring.test.ts` already documents for capture-point
 * files, so this reads the actual source instead — proves the wiring
 * without needing a live Supabase-backed request. The genuine end-to-end
 * proof (real writes, real tz, real safety filtering) is
 * `scripts/verify-nudge-compute-job.mjs`, run against the live project.
 */

const REPO_ROOT = join(__dirname, "..", "..", "..");
const ROUTE_PATH = "apps/web/app/api/cron/nudge-compute/route.ts";

function readRoute(): string {
  return readFileSync(join(REPO_ROOT, ROUTE_PATH), "utf8");
}

describe("nudge-compute route — fails closed like trial-emails", () => {
  const src = readRoute();

  it("503s when CRON_SECRET is unset, 401s on a wrong/missing bearer header", () => {
    expect(src).toContain('const secret = process.env.CRON_SECRET;');
    expect(src).toMatch(/if\s*\(\s*!secret\s*\)\s*\{[\s\S]{0,200}status:\s*503/);
    expect(src).toContain('req.headers.get("authorization")');
    expect(src).toMatch(/auth !== `Bearer \$\{secret\}`[\s\S]{0,200}status:\s*401/);
  });

  it("uses a service-role client with persistSession: false, same as trial-emails", () => {
    expect(src).toContain("privateEnv.serviceRole");
    expect(src).toMatch(/createClient\([^)]*persistSession:\s*false/);
  });

  it("is a Node-runtime route (no `export const runtime = \"edge\"`)", () => {
    expect(src).not.toMatch(/export const runtime\s*=\s*["']edge["']/);
  });
});

describe("nudge-compute route — reuses the unmodified safety/selection functions, never re-derives them", () => {
  const src = readRoute();

  it("imports peopleForTodaySky and isMinorForSafety from @galaxia/core", () => {
    expect(src).toMatch(/import\s*\{[^}]*isMinorForSafety[^}]*peopleForTodaySky[^}]*\}\s*from\s*"@galaxia\/core"|import\s*\{[^}]*peopleForTodaySky[^}]*isMinorForSafety[^}]*\}\s*from\s*"@galaxia\/core"/);
  });

  it("imports ownerLocalDate, whenUTCForOwnerLocalDate, planDailyNudgeWrites, coerceDailyNudgeRow from @galaxia/astro", () => {
    expect(src).toContain('"@galaxia/astro"');
    for (const fn of ["ownerLocalDate", "whenUTCForOwnerLocalDate", "planDailyNudgeWrites", "coerceDailyNudgeRow"]) {
      expect(src).toContain(fn);
    }
  });

  it("threads the per-user timezone into both date functions (the new Phase B1 input)", () => {
    expect(src).toMatch(/ownerLocalDate\(new Date\(\),\s*timezone\)/);
    expect(src).toMatch(/whenUTCForOwnerLocalDate\(localDate,\s*new Date\(\),\s*timezone\)/);
  });

  it("does not re-derive minor/passed filtering inline (no raw is_minor/passed_at branching outside the imported helpers)", () => {
    expect(src).not.toMatch(/\.is_minor\s*===\s*(true|false)/);
    expect(src).not.toMatch(/\.passed_at\s*(!=|==)=?\s*null/);
  });
});

describe("nudge-compute route — skip-null-tz, never fabricate a timezone", () => {
  const src = readRoute();

  it("queries only profiles with a non-null timezone", () => {
    expect(src).toMatch(/\.not\("timezone",\s*"is",\s*null\)/);
  });

  it("explicitly skips (does not process) a falsy timezone value even if it slipped past the query filter", () => {
    expect(src).toMatch(/if\s*\(\s*!timezone\s*\)\s*\{/);
    expect(src).toContain("skipped.nullTimezone");
  });

  it("never hardcodes a UTC/fabricated fallback tz string", () => {
    expect(src).not.toMatch(/timezone\s*(\?\?|\|\|)\s*["']UTC["']/);
    expect(src).not.toContain('"UTC"');
  });
});

describe("nudge-compute route — idempotent write, first-write-wins", () => {
  const src = readRoute();

  it("upserts with onConflict person_id,date and ignoreDuplicates: true, same as every client caller", () => {
    expect(src).toMatch(/onConflict:\s*"person_id,date"/);
    expect(src).toMatch(/ignoreDuplicates:\s*true/);
  });
});

describe("nudge-compute route — no email, no consent, no sending (Phase B1 scope)", () => {
  const src = readRoute();

  it("does not import or reference any email-sending code", () => {
    for (const forbidden of ["sendEmail", "renderTrialEmail", "RESEND_API_KEY", "resendApiKey", "lib/emails"]) {
      expect(src).not.toContain(forbidden);
    }
  });

  it("only writes to person_daily_nudges — no insert/update against trial_emails, notes, or any consent table", () => {
    const tableCalls = [...src.matchAll(/\.from\("([a-z_]+)"\)/g)].map((m) => m[1]);
    expect(new Set(tableCalls)).toEqual(new Set(["profiles", "people", "charts", "person_daily_nudges"]));
  });
});

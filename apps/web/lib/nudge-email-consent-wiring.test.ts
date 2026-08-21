import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Source-level guards for nudge-delivery Phase B2's consent column, the
 * settings toggle that writes it, and the unsubscribe-token schema. Same
 * "read the actual source" precedent as timezone-wiring.test.ts.
 */

const REPO_ROOT = join(__dirname, "..", "..", "..");

function read(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), "utf8");
}

describe("the consent migration grants daily_nudge_emails_enabled the same way timezone was granted", () => {
  const src = read("supabase/migrations/20260821020000_nudge_email_consent_and_unsubscribe.sql");

  it("extends both insert and update column grants to include daily_nudge_emails_enabled", () => {
    expect(src).toMatch(
      /grant insert \(id, display_name, house_system, timezone, daily_nudge_emails_enabled\)\s*\n\s*on table public\.profiles to authenticated;/
    );
    expect(src).toMatch(
      /grant update \(id, display_name, house_system, timezone, daily_nudge_emails_enabled\)\s*\n\s*on table public\.profiles to authenticated;/
    );
  });

  it("defaults daily_nudge_emails_enabled to true — opt-out, default-on, the locked decision", () => {
    expect(src).toMatch(/daily_nudge_emails_enabled boolean not null default true/);
  });

  it("adds no new row policy — profiles RLS already scopes every write to the owner", () => {
    expect(src).not.toContain("create policy");
  });

  it("never grants unsubscribe_token to anon/authenticated (service-role only, by omission from both grant lists)", () => {
    for (const grantLine of src.match(/^grant (insert|update) \([^)]*\).*$/gm) ?? []) {
      expect(grantLine).not.toContain("unsubscribe_token");
    }
  });

  it("unsubscribe_token is a unique, randomly-defaulted uuid — unguessable and per-user by construction", () => {
    expect(src).toMatch(/unsubscribe_token uuid not null default gen_random_uuid\(\)/);
    expect(src).toContain("create unique index if not exists profiles_unsubscribe_token_idx");
  });
});

describe("the ledger migration mirrors trial_emails' idempotency shape", () => {
  const src = read("supabase/migrations/20260821030000_daily_nudge_emails_ledger.sql");

  it("primary keys on (owner_id, date) — not per-person — enforcing one email per owner per day at the DB level", () => {
    expect(src).toMatch(/primary key \(owner_id, date\)/);
  });

  it("enables RLS with no client policies (service-role only, same as trial_emails)", () => {
    expect(src).toContain("alter table daily_nudge_emails enable row level security;");
    expect(src).not.toContain("create policy");
  });

  it("clears the ledger on account purge, additive to purge_own_account_data", () => {
    expect(src).toContain("delete from daily_nudge_emails where owner_id = uid;");
  });
});

describe("Settings page — the consent toggle is a plain owner-row write, same pattern as house_system", () => {
  const src = read("apps/web/app/app/settings/page.tsx");

  it("selects daily_nudge_emails_enabled alongside the other profile fields it already reads", () => {
    expect(src).toMatch(/\.select\("house_system, subscription_status, trial_ends_at, current_period_end, cancel_at_period_end, comped, daily_nudge_emails_enabled"\)/);
  });

  it("writes via a direct .update on profiles, own row only (id = userId), no API route", () => {
    expect(src).toMatch(/supabase\.from\("profiles"\)\.update\(\{\s*daily_nudge_emails_enabled:\s*next\s*\}\)\.eq\("id",\s*userId\)/);
  });

  it("treats a null/undefined stored value as on, matching the column's own default", () => {
    expect(src).toMatch(/daily_nudge_emails_enabled\s*!==\s*false/);
  });
});

describe("nudge delivery Phase B2 does not touch the untouchable selection/entitlement internals", () => {
  for (const surface of [
    "apps/web/app/app/settings/page.tsx",
    "apps/web/app/api/nudge-email/unsubscribe/route.ts",
    "apps/web/lib/emails.ts",
    "apps/web/lib/nudge-send.ts"
  ]) {
    it(`${surface} never imports hasAccess/isMinorForSafety internals or the copy resolver`, () => {
      const src = read(surface);
      expect(src).not.toContain("hasAccess");
      expect(src).not.toMatch(/isMinorForSafety\(/);
      expect(src).not.toContain("resolveNudgeCopy");
    });
  }
});

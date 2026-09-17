import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = join(__dirname, "..", "..", "..");
const MIGRATION = "supabase/migrations/20260917035202_email_admin_templates_campaigns_sends.sql";

function read(rel: string): string {
  return readFileSync(join(REPO_ROOT, rel), "utf8");
}

describe("email admin migration — service-role only, seeded catalog", () => {
  const sql = read(MIGRATION);

  it("creates templates, campaigns, and sends with RLS and no client policies", () => {
    expect(sql).toContain("create table if not exists email_templates");
    expect(sql).toContain("create table if not exists email_campaigns");
    expect(sql).toContain("create table if not exists email_sends");
    expect(sql).toContain("alter table email_templates enable row level security");
    expect(sql).toContain("alter table email_campaigns enable row level security");
    expect(sql).toContain("alter table email_sends enable row level security");
    expect(sql).toContain("revoke all on table public.email_templates from anon, authenticated");
    expect(sql).toContain("revoke all on table public.email_campaigns from anon, authenticated");
    expect(sql).toContain("revoke all on table public.email_sends from anon, authenticated");
    expect(sql).toContain("No client policies");
    expect(sql).not.toMatch(/create policy/i);
  });

  it("seeds every automation and system kind", () => {
    for (const kind of [
      "trial.day1",
      "trial.day4_one",
      "trial.day4_multi",
      "trial.day11",
      "trial.day14",
      "nudge.sky_today",
      "letter.weekly",
      "chart.reading",
      "auth.signup",
      "auth.magic_link",
      "auth.recovery"
    ]) {
      expect(sql).toContain(`'${kind}'`);
    }
  });

  it("adds campaign opt-out and blog unsubscribed_at without granting them to authenticated", () => {
    expect(sql).toContain("campaign_emails_opted_out");
    expect(sql).toContain("unsubscribed_at");
    expect(sql).not.toMatch(/grant (insert|update) \([^)]*campaign_emails_opted_out/);
  });

  it("authors no em dash", () => {
    expect(sql).not.toContain("\u2014");
  });
});

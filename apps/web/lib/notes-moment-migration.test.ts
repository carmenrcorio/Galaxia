import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = join(__dirname, "..", "..", "..");
const MIGRATION = join(REPO_ROOT, "supabase/migrations/20260914270000_notes_moment_kind.sql");
const WRAP = join(REPO_ROOT, "supabase/migrations/20260913030100_wrap_auth_uid_in_rls_policies.sql");
const RETEST = join(REPO_ROOT, "docs/notes-moment-rls-retest.sql");

function stripSqlComments(sql: string): string {
  return sql.replace(/\/\*[\s\S]*?\*\//g, "").replace(/--[^\n]*/g, "");
}

describe("20260914270000_notes_moment_kind.sql", () => {
  const sql = readFileSync(MIGRATION, "utf8");
  const body = stripSqlComments(sql).toLowerCase();

  it("adds moment kind and silence tag without touching RLS", () => {
    expect(sql).toContain("Safe to apply via `supabase db push`");
    expect(sql).toContain("Does not need autocommit");
    expect(body).toContain("'moment'");
    expect(body).toContain("silence_needed_filling");
    expect(body).toContain("notes_kind_check");
    expect(body).toContain("notes_tags_allowed");
    expect(body).not.toContain("create table");
    expect(body).not.toContain("concurrently");
    expect(body).not.toContain("create policy");
    expect(body).not.toContain("drop policy");
    expect(body).not.toContain("enable row level security");
    expect(body).not.toContain("force row level security");
  });

  it("keeps notes owner all exactly as wrapped in 20260913030100", () => {
    const wrap = readFileSync(WRAP, "utf8");
    expect(wrap).toContain(`create policy "notes owner all"
on public.notes for all
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));`);
    expect(body).not.toContain("create policy");
    expect(body).not.toContain("drop policy");
  });
});

describe("docs/notes-moment-rls-retest.sql", () => {
  const sql = readFileSync(RETEST, "utf8");

  it("probes a second user SELECT on notes including moment rows", () => {
    expect(sql).toContain("FROM public.notes");
    expect(sql).toContain("notes_visible_to_B");
    expect(sql).toContain("moments_visible_to_B");
    expect(sql).toContain("expect 0");
    expect(sql).toContain("ROLLBACK");
    expect(sql).toContain("SET LOCAL ROLE authenticated");
    expect(sql).not.toContain("drop policy");
  });
});

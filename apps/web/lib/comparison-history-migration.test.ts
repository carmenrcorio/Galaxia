import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = join(__dirname, "..", "..", "..");
const MIGRATION = join(REPO_ROOT, "supabase/migrations/20260914240000_comparison_history.sql");

function stripSqlComments(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => !/^[ \t]*--/.test(line))
    .join("\n");
}

describe("20260914240000_comparison_history.sql", () => {
  const sql = readFileSync(MIGRATION, "utf8");
  const body = stripSqlComments(sql);

  it("stores the pair and last_viewed_at only, never a rendered reading", () => {
    expect(body).toContain("create table if not exists public.comparison_history");
    expect(body).toContain("last_viewed_at timestamptz not null default now()");
    expect(body).toContain("unique (owner_id, person_low, person_high)");
    expect(body).toContain("check (person_low < person_high)");
    expect(body).not.toMatch(/data jsonb/);
    expect(body).not.toMatch(/scores jsonb/);
    expect(body).not.toMatch(/payload jsonb/);
  });

  it("is owner-only RLS with wrapped auth.uid(), no anon grant", () => {
    expect(body).toContain("alter table public.comparison_history enable row level security");
    expect(body).toContain('create policy "comparison_history owner all"');
    expect(body).toContain("using (owner_id = (select auth.uid()))");
    expect(body).toContain("with check (owner_id = (select auth.uid()))");
    expect(body).toContain("revoke all on table public.comparison_history from public, anon");
    expect(body).toContain(
      "grant select, insert, update, delete on table public.comparison_history to authenticated"
    );
  });

  it("clears rows from purge and delete_own_person", () => {
    expect(body).toContain("delete from comparison_history where owner_id = uid;");
    expect(body).toContain(
      "delete from comparison_history\n    where owner_id = uid\n      and (person_low = p_person_id or person_high = p_person_id);"
    );
  });
});

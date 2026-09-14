import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { RELATIONSHIP_EDGE_TYPES } from "@galaxia/core";

const REPO_ROOT = join(__dirname, "..", "..", "..");
const MIGRATION = join(
  REPO_ROOT,
  "supabase/migrations/20260914280000_relationships_edge_constraints.sql"
);
const WRAP = join(REPO_ROOT, "supabase/migrations/20260913030100_wrap_auth_uid_in_rls_policies.sql");
const RETEST = join(REPO_ROOT, "docs/relationships-edge-cascade-retest.sql");

function stripSqlComments(sql: string): string {
  return sql.replace(/\/\*[\s\S]*?\*\//g, "").replace(/--[^\n]*/g, "");
}

describe("20260914280000_relationships_edge_constraints.sql", () => {
  const sql = readFileSync(MIGRATION, "utf8");
  const body = stripSqlComments(sql).toLowerCase();

  it("adds vocabulary, self-loop, canonical order, unique, and cascade without touching RLS", () => {
    expect(sql).toContain("Safe to apply via `supabase db push`");
    expect(sql).toContain("Does not need autocommit");
    for (const value of RELATIONSHIP_EDGE_TYPES) {
      expect(body).toContain(`'${value}'`);
    }
    expect(body).toContain("person_a <> person_b");
    expect(body).toContain("person_a < person_b");
    expect(body).toContain("relationships_owner_canonical_pair_type_key");
    expect(body).toContain("on delete cascade");
    expect(body).toContain("drop index if exists public.relationships_owner_pair_type_uidx");
    expect(body).not.toContain("create policy");
    expect(body).not.toContain("drop policy");
    expect(body).not.toContain("enable row level security");
    expect(body).not.toContain("force row level security");
    expect(body).not.toContain("concurrently");
  });

  it("keeps relationships owner all exactly as wrapped in 20260913030100", () => {
    const wrap = readFileSync(WRAP, "utf8");
    expect(wrap).toContain(`create policy "relationships owner all"
on public.relationships for all
using (owner_id = (select auth.uid()))
with check (
  owner_id = (select auth.uid())
  and exists (
    select 1 from people
    where people.id = relationships.person_a
      and people.owner_id = (select auth.uid())
  )
  and exists (
    select 1 from people
    where people.id = relationships.person_b
      and people.owner_id = (select auth.uid())
  )
);`);
    expect(body).not.toContain("create policy");
    expect(body).not.toContain("drop policy");
  });
});

describe("docs/relationships-edge-cascade-retest.sql", () => {
  const sql = readFileSync(RETEST, "utf8");

  it("deletes a test person and asserts the edge is gone without touching the 21 remembrance rows", () => {
    expect(sql).toContain("ON DELETE CASCADE");
    expect(sql).toContain("expected 21 remembrance rows");
    expect(sql).toContain("DELETE FROM public.people WHERE id = p_drop");
    expect(sql).toContain("edge % still present after deleting person");
    expect(sql).toContain("relationships-edge-cascade-retest@example.com");
    expect(sql).toContain("DELETE FROM public.profiles WHERE id = owner_t");
    expect(sql).toContain("DELETE FROM auth.users WHERE id = owner_t");
  });
});

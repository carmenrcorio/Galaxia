import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Source-level guard for 20260914023000_people_notes_messages_indexes.sql.
 * Same "read the actual source" precedent as rls-indexes-purge-migrations.test.ts.
 * Does not open a database.
 */

const REPO_ROOT = join(__dirname, "..", "..", "..");
const MIGRATION = join(
  REPO_ROOT,
  "supabase/migrations/20260914023000_people_notes_messages_indexes.sql"
);

function stripSqlComments(sql: string): string {
  return sql.replace(/--[^\n]*/g, "");
}

describe("20260914023000_people_notes_messages_indexes.sql", () => {
  const sql = readFileSync(MIGRATION, "utf8");
  const body = stripSqlComments(sql).toLowerCase();

  it("uses CREATE INDEX CONCURRENTLY IF NOT EXISTS and names the transaction restriction", () => {
    expect(sql.toLowerCase()).toContain("create index concurrently cannot run inside a transaction");
    expect(sql.toLowerCase()).toContain("supabase db push");
    expect([...sql.matchAll(/create index concurrently if not exists/gi)]).toHaveLength(5);
    expect(body).not.toMatch(/create index if not exists/);
  });

  it("covers people(owner_id), notes(owner_id), messages(thread_id)", () => {
    expect(body).toContain("people_owner_id_idx");
    expect(body).toMatch(/on public\.people \(owner_id\)/);
    expect(body).toContain("notes_owner_id_idx");
    expect(body).toMatch(/on public\.notes \(owner_id\)/);
    expect(body).toContain("messages_thread_id_idx");
    expect(body).toMatch(/on public\.messages \(thread_id\)/);
  });

  it("adds only the two composites the query patterns justify", () => {
    expect(body).toContain("notes_about_person_created_at_idx");
    expect(body).toMatch(/on public\.notes \(about_person, created_at desc\)/);
    expect(body).toContain("messages_thread_id_created_at_idx");
    expect(body).toMatch(/on public\.messages \(thread_id, created_at desc\)/);
    expect([...sql.matchAll(/create index concurrently if not exists/gi)]).toHaveLength(5);
  });

  it("does not touch RLS or table definitions", () => {
    expect(body).not.toContain("create policy");
    expect(body).not.toContain("alter table");
    expect(body).not.toContain("enable row level security");
    expect(body).not.toContain("create table");
  });
});

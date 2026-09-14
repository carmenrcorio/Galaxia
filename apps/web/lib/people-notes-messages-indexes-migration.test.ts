import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Source-level guard for the people/notes/messages index migrations.
 * Same "read the actual source" precedent as rls-indexes-purge-migrations.test.ts.
 * Does not open a database.
 *
 * CREATE INDEX CONCURRENTLY cannot run inside a transaction. MCP
 * apply_migration and supabase db push wrap each file in one, so no
 * committed migration may use CONCURRENTLY.
 */

const REPO_ROOT = join(__dirname, "..", "..", "..");
const MIGRATIONS = join(REPO_ROOT, "supabase/migrations");
const ORIGINAL = join(MIGRATIONS, "20260914023000_people_notes_messages_indexes.sql");
const TXN = join(MIGRATIONS, "20260914130000_people_notes_messages_indexes_txn.sql");

function stripSqlComments(sql: string): string {
  return sql.replace(/--[^\n]*/g, "");
}

function assertIndexSet(sql: string) {
  const body = stripSqlComments(sql).toLowerCase();
  expect(body).toContain("people_owner_id_idx");
  expect(body).toMatch(/on public\.people \(owner_id\)/);
  expect(body).toContain("notes_owner_id_idx");
  expect(body).toMatch(/on public\.notes \(owner_id\)/);
  expect(body).toContain("messages_thread_id_idx");
  expect(body).toMatch(/on public\.messages \(thread_id\)/);
  expect(body).toContain("notes_about_person_created_at_idx");
  expect(body).toMatch(/on public\.notes \(about_person, created_at desc\)/);
  expect(body).toContain("messages_thread_id_created_at_idx");
  expect(body).toMatch(/on public\.messages \(thread_id, created_at desc\)/);
  expect([...body.matchAll(/create index if not exists/g)]).toHaveLength(5);
  expect(body).not.toContain("concurrently");
  expect(body).not.toContain("create policy");
  expect(body).not.toContain("alter table");
  expect(body).not.toContain("enable row level security");
  expect(body).not.toContain("create table");
}

describe("20260914023000_people_notes_messages_indexes.sql", () => {
  const sql = readFileSync(ORIGINAL, "utf8");

  it("uses CREATE INDEX IF NOT EXISTS and names why CONCURRENTLY is forbidden", () => {
    expect(sql.toLowerCase()).toContain("create index concurrently cannot run inside a transaction");
    expect(sql.toLowerCase()).toContain("supabase db push");
    expect(sql.toLowerCase()).toContain("apply_migration");
    assertIndexSet(sql);
  });
});

describe("20260914130000_people_notes_messages_indexes_txn.sql", () => {
  const sql = readFileSync(TXN, "utf8");

  it("restates the same five indexes without CONCURRENTLY so transactional apply can land them", () => {
    expect(sql.toLowerCase()).toContain("create index concurrently");
    expect(sql.toLowerCase()).toContain("mcp apply_migration");
    assertIndexSet(sql);
  });
});

describe("supabase/migrations", () => {
  it("never uses CREATE INDEX CONCURRENTLY (apply paths wrap each file in a transaction)", () => {
    const files = readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql"));
    const offenders: string[] = [];
    for (const file of files) {
      const body = stripSqlComments(readFileSync(join(MIGRATIONS, file), "utf8")).toLowerCase();
      if (body.includes("concurrently")) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });
});

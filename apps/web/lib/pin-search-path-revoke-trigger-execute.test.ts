import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Source-level guards for 20260914140000. Live behavioral proof lives in
 * docs/rls-deny-all-advisor-retest.sql and is run against a disposable
 * Supabase branch, never eigfvribtntbxyjutsma.
 */

const REPO_ROOT = join(__dirname, "..", "..", "..");
const MIGRATION =
  "supabase/migrations/20260914140000_pin_search_path_and_revoke_trigger_execute.sql";

const TRIGGER_FNS = [
  "set_memorial_milestones_updated_at",
  "sync_linked_chart_mirrors",
  "sync_linked_person_mirrors"
] as const;

const PRODUCT_RPCS = [
  "create_connect_invite",
  "accept_connect_invite",
  "connect_invite_preview",
  "revoke_connect_invite",
  "add_sender_to_constellation",
  "set_connection_share_level",
  "revoke_connection",
  "approve_reverse_grant",
  "acknowledge_connect_accept",
  "delete_own_group",
  "delete_own_person",
  "purge_own_account_data",
  "check_and_increment_vela_rate"
] as const;

function readMigration(): string {
  return readFileSync(join(REPO_ROOT, MIGRATION), "utf8");
}

function stripSqlComments(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => !/^[ \t]*--/.test(line))
    .join("\n");
}

describe("20260914140000_pin_search_path_and_revoke_trigger_execute.sql", () => {
  const sql = readMigration();
  const body = stripSqlComments(sql);

  it("declares itself safe for supabase db push (transactional, no autocommit)", () => {
    expect(sql).toMatch(/Safe to apply via `supabase db push`/);
    expect(sql).toMatch(/Does not need autocommit/);
    expect(body).not.toMatch(/CONCURRENTLY/i);
  });

  it("creates no policies and does not alter tables or columns", () => {
    expect(body).not.toMatch(/create\s+policy/i);
    expect(body).not.toMatch(/alter\s+table/i);
    expect(body).not.toMatch(/drop\s+table/i);
    expect(body).not.toMatch(/add\s+column/i);
  });

  it("pins search_path on set_memorial_milestones_updated_at and keeps it a trigger", () => {
    expect(body).toMatch(
      /create or replace function public\.set_memorial_milestones_updated_at\(\)\s+returns trigger\s+language plpgsql\s+set search_path = ''/i
    );
    expect(body).toContain("new.updated_at = now();");
    expect(body).not.toMatch(/security definer/i);
  });

  it("revokes EXECUTE from public, anon, and authenticated on exactly the three trigger functions", () => {
    for (const fn of TRIGGER_FNS) {
      expect(body).toMatch(
        new RegExp(
          `revoke execute on function public\\.${fn}\\(\\)\\s+from public, anon, authenticated;`,
          "i"
        )
      );
    }
    const revoked = [...body.matchAll(/revoke execute on function public\.(\w+)\s*\(/gi)].map(
      (m) => m[1]
    );
    expect(revoked.sort()).toEqual([...TRIGGER_FNS].sort());
  });

  it("does not revoke EXECUTE on the authenticated product RPCs", () => {
    for (const fn of PRODUCT_RPCS) {
      expect(body).not.toMatch(new RegExp(`revoke execute on function public\\.${fn}\\b`, "i"));
    }
  });

  it("authors no em dash", () => {
    expect(sql).not.toContain("\u2014");
  });
});

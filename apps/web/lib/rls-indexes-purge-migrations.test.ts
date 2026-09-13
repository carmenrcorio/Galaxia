import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Source-level guards for the four 2026-09-13 migrations: owner/thread
 * indexes, wrapping auth.uid() in 31 RLS policies, actor_id nullability,
 * and the purge_own_account_data FK gap. Same "read the actual source"
 * precedent as nudge-email-consent-wiring.test.ts. Live behavioral proof
 * lives in purge-account-thread-participants.live.test.ts and stays
 * quarantined behind assertDisposableDbTarget.
 */

const REPO_ROOT = join(__dirname, "..", "..", "..");
const MIGRATIONS = join(REPO_ROOT, "supabase/migrations");

const INDEXES = "20260913030000_add_owner_and_thread_indexes.sql";
const WRAP = "20260913030100_wrap_auth_uid_in_rls_policies.sql";
const ACTOR_NULLABLE = "20260913030150_admin_audit_log_actor_id_nullable.sql";
const PURGE = "20260913030200_fix_purge_account_thread_participants.sql";
const PRIOR_PURGE = "20260909040000_push_tokens.sql";

const POLICY_NAMES = [
  "charts via owned person read",
  "charts via owned person update",
  "charts via owned person write",
  "group members via owner group delete",
  "group members via owner group read",
  "group members via owner group write",
  "groups owner all",
  "invites owner manage",
  "memorial_milestones owner all",
  "messages via participant read",
  "messages via participant write",
  "notes owner all",
  "people owner all",
  "person_daily_nudges owner all",
  "profiles owner read",
  "profiles owner update",
  "profiles owner upsert",
  "push_tokens owner all",
  "relational_transits owner all",
  "relationships owner all",
  "support_requests owner insert",
  "synastry owner all",
  "thread participants own or owner delete",
  "thread participants own row read",
  "thread participants own row update",
  "thread participants owner insert",
  "threads owner all",
  "transits via owned person read",
  "transits via owned person update",
  "transits via owned person write",
  "vela_rate_limits owner read"
] as const;

function readMigration(name: string): string {
  return readFileSync(join(MIGRATIONS, name), "utf8");
}

function stripSqlComments(sql: string): string {
  return sql.replace(/--[^\n]*/g, "");
}

function functionBody(sql: string): string {
  const start = sql.indexOf("as $$");
  const end = sql.indexOf("$$;", start);
  if (start < 0 || end <= start) {
    throw new Error("could not find plpgsql body");
  }
  // 20260909040000_push_tokens.sql has leftover editor line-number prefixes
  // (`    50|`) inside the function; production's applied body does not. Strip them
  // so we compare SQL, not the polluted file markup.
  return sql.slice(start + "as $$".length, end).replace(/^\s*\d+\|/gm, "");
}

function ltrimPrefix(line: string): string {
  return line.replace(/^\s*\d+\|/, "");
}

function latestPurgeSource(): string {
  const files = readdirSync(MIGRATIONS)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  let latest = "";
  for (const file of files) {
    const src = readMigration(file);
    if (/create or replace function public\.purge_own_account_data\s*\(/i.test(src)) {
      latest = src;
    }
  }
  if (!latest) throw new Error("no purge_own_account_data definition found");
  return latest;
}

describe("20260913030000_add_owner_and_thread_indexes.sql", () => {
  const sql = readMigration(INDEXES);

  it("creates exactly the five named indexes, none CONCURRENTLY", () => {
    expect(sql).toContain("create index if not exists people_owner_id_idx on public.people (owner_id);");
    expect(sql).toContain("create index if not exists notes_owner_id_idx on public.notes (owner_id);");
    expect(sql).toContain("create index if not exists messages_thread_id_idx on public.messages (thread_id);");
    expect(sql).toContain("create index if not exists thread_participants_user_id_idx");
    expect(sql).toContain("on public.thread_participants (user_id);");
    expect(sql).toContain("create index if not exists thread_participants_thread_id_idx");
    expect(sql).toContain("on public.thread_participants (thread_id);");
    expect(stripSqlComments(sql).toLowerCase()).not.toContain("concurrently");
    expect([...sql.matchAll(/create index if not exists/gi)]).toHaveLength(5);
  });
});

describe("20260913030100_wrap_auth_uid_in_rls_policies.sql", () => {
  const sql = readMigration(WRAP);
  const body = stripSqlComments(sql);

  it("drops and recreates exactly the 31 named policies, no extras", () => {
    const dropped = [...sql.matchAll(/drop policy if exists "([^"]+)"/g)].map((m) => m[1]);
    const created = [...sql.matchAll(/create policy "([^"]+)"/g)].map((m) => m[1]);
    expect(dropped).toEqual([...POLICY_NAMES]);
    expect(created).toEqual([...POLICY_NAMES]);
  });

  it("wraps every auth.uid() as (select auth.uid()) and leaves no bare calls", () => {
    expect(body).not.toMatch(/(?<!select )auth\.uid\(\)/);
    expect([...body.matchAll(/\(select auth\.uid\(\)\)/g)]).toHaveLength(62);
  });

  it("keeps invites and support_requests scoped to authenticated", () => {
    expect(sql).toMatch(
      /create policy "invites owner manage"\s*\n\s*on public\.invites for all to authenticated/
    );
    expect(sql).toMatch(
      /create policy "support_requests owner insert"\s*\n\s*on public\.support_requests for insert\s*\n\s*to authenticated/
    );
  });

  it("does not rename commands: select/insert/update/delete/all stay on the same policies", () => {
    expect(sql).toMatch(/"charts via owned person read"[\s\S]*?for select/);
    expect(sql).toMatch(/"charts via owned person update"[\s\S]*?for update/);
    expect(sql).toMatch(/"charts via owned person write"[\s\S]*?for insert/);
    expect(sql).toMatch(/"group members via owner group delete"[\s\S]*?for delete/);
    expect(sql).toMatch(/"group members via owner group read"[\s\S]*?for select/);
    expect(sql).toMatch(/"group members via owner group write"[\s\S]*?for insert/);
    expect(sql).toMatch(/"groups owner all"[\s\S]*?for all/);
    expect(sql).toMatch(/"messages via participant read"[\s\S]*?for select/);
    expect(sql).toMatch(/"messages via participant write"[\s\S]*?for insert/);
    expect(sql).toMatch(/"profiles owner read"[\s\S]*?for select/);
    expect(sql).toMatch(/"profiles owner update"[\s\S]*?for update/);
    expect(sql).toMatch(/"profiles owner upsert"[\s\S]*?for insert/);
    expect(sql).toMatch(/"support_requests owner insert"[\s\S]*?for insert/);
    expect(sql).toMatch(/"thread participants own or owner delete"[\s\S]*?for delete/);
    expect(sql).toMatch(/"thread participants own row read"[\s\S]*?for select/);
    expect(sql).toMatch(/"thread participants own row update"[\s\S]*?for update/);
    expect(sql).toMatch(/"thread participants owner insert"[\s\S]*?for insert/);
    expect(sql).toMatch(/"transits via owned person read"[\s\S]*?for select/);
    expect(sql).toMatch(/"transits via owned person update"[\s\S]*?for update/);
    expect(sql).toMatch(/"transits via owned person write"[\s\S]*?for insert/);
    expect(sql).toMatch(/"vela_rate_limits owner read"[\s\S]*?for select/);
  });
});

describe("20260913030150_admin_audit_log_actor_id_nullable.sql", () => {
  const sql = readMigration(ACTOR_NULLABLE);

  it("only drops NOT NULL on actor_id", () => {
    expect(sql).toContain(
      "alter table public.admin_audit_log alter column actor_id drop not null;"
    );
    expect(stripSqlComments(sql)).not.toMatch(/\bdrop column\b/i);
    expect(stripSqlComments(sql)).not.toMatch(/\badd column\b/i);
    expect(stripSqlComments(sql)).not.toMatch(/\btarget_user_id\b/);
  });
});

describe("20260913030200_fix_purge_account_thread_participants.sql", () => {
  const sql = readMigration(PURGE);
  const prior = readMigration(PRIOR_PURGE);
  const newBody = functionBody(sql);
  const oldBody = functionBody(prior);

  it("preserves SECURITY DEFINER and SET search_path TO 'public'", () => {
    expect(sql).toMatch(/security definer/i);
    expect(sql).toMatch(/set search_path TO 'public'/);
  });

  it("deletes thread_participants before owned threads", () => {
    const tp = newBody.indexOf("delete from thread_participants where user_id = uid;");
    const threads = newBody.indexOf("delete from threads where owner_id = uid;");
    expect(tp).toBeGreaterThan(-1);
    expect(threads).toBeGreaterThan(tp);
  });

  it("nulls admin_audit_log FKs after the existing deletes, and does not delete the rows", () => {
    expect(newBody).toContain(
      "update public.admin_audit_log set actor_id = null where actor_id = uid;"
    );
    expect(newBody).toContain(
      "update public.admin_audit_log set target_user_id = null where target_user_id = uid;"
    );
    expect(newBody).not.toMatch(/delete from admin_audit_log/i);
    expect(newBody.indexOf("delete from profiles where id = uid;")).toBeGreaterThan(-1);
    expect(newBody.indexOf("update public.admin_audit_log set actor_id = null")).toBeGreaterThan(
      newBody.indexOf("delete from profiles where id = uid;")
    );
  });

  it("changes nothing else in the prior body besides those two additions", () => {
    const statements = (body: string) =>
      body
        .split("\n")
        .map((line) => ltrimPrefix(line).trim())
        .filter((line) => line.length > 0 && !line.startsWith("--"));

    const extra = [
      "delete from thread_participants where user_id = uid;",
      "update public.admin_audit_log set actor_id = null where actor_id = uid;",
      "update public.admin_audit_log set target_user_id = null where target_user_id = uid;"
    ];
    expect(statements(newBody).filter((line) => !extra.includes(line))).toEqual(statements(oldBody));
  });
});

describe("the latest purge_own_account_data definition keeps the FK-gap fix", () => {
  it("wins over earlier CREATE OR REPLACE recreations", () => {
    const latest = latestPurgeSource();
    const body = functionBody(latest);
    const tp = body.indexOf("delete from thread_participants where user_id = uid;");
    const threads = body.indexOf("delete from threads where owner_id = uid;");
    expect(tp).toBeGreaterThan(-1);
    expect(threads).toBeGreaterThan(tp);
    expect(body).toContain(
      "update public.admin_audit_log set actor_id = null where actor_id = uid;"
    );
    expect(body).toContain(
      "update public.admin_audit_log set target_user_id = null where target_user_id = uid;"
    );
  });
});

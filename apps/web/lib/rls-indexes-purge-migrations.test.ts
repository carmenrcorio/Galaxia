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
const CONNECT = "20260913160000_constellation_connect_schema.sql";

/**
 * The one statement 20260913160000 replaces rather than carries forward. It
 * is superseded by a strict superset that also strips the mirrored chart and
 * the shared birth columns.
 */
const REPLACED_BY_CONNECT = "update people set linked_user_id = null where linked_user_id = uid;";

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
  // Anchor on purge_own_account_data's own declaration rather than the first
  // dollar-quoted block in the file. 20260913160000 defines two trigger
  // functions ahead of the purge, so "the first body" is not this one.
  const decl = sql.search(/create or replace function public\.purge_own_account_data\s*\(/i);
  if (decl < 0) {
    throw new Error("could not find purge_own_account_data declaration");
  }
  const start = sql.indexOf("as $$", decl);
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

/** Non-blank, non-comment lines of a plpgsql body, trimmed. */
function statements(body: string): string[] {
  return body
    .split("\n")
    .map((line) => ltrimPrefix(line).trim())
    .filter((line) => line.length > 0 && !line.startsWith("--"));
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
    const extra = [
      "delete from thread_participants where user_id = uid;",
      "update public.admin_audit_log set actor_id = null where actor_id = uid;",
      "update public.admin_audit_log set target_user_id = null where target_user_id = uid;"
    ];
    expect(statements(newBody).filter((line) => !extra.includes(line))).toEqual(statements(oldBody));
  });
});

describe("20260913160000_constellation_connect_schema.sql", () => {
  const sql = readMigration(CONNECT);
  const body = stripSqlComments(sql);

  it("adds the four invites columns and the third kind", () => {
    for (const column of ["accepted_by", "accepted_at", "sender_shares_back", "sender_ack_at"]) {
      expect(body).toContain(`add column if not exists ${column}`);
    }
    expect(body).toMatch(/accepted_by uuid references auth\.users\(id\) on delete set null/);
    expect(body).toContain("sender_shares_back boolean not null default false");
    expect(body).toMatch(
      /invites_kind_check\s*\n?\s*check \(kind in \('shared_space', 'birth_data', 'constellation_connect'\)\)/
    );
  });

  it("makes a connect invite impossible to insert without an expiry", () => {
    expect(body).toContain(
      "check (kind <> 'constellation_connect' or expires_at is not null)"
    );
    // Written so existing shared_space and birth_data rows satisfy it, and
    // added validated rather than NOT VALID.
    expect(body).not.toMatch(/invites_connect_requires_expiry[\s\S]{0,200}not valid/i);
  });

  it("keeps the accept-fields CHECK one-directional so ON DELETE SET NULL survives it", () => {
    // The symmetric form the plan proposed is unsatisfiable alongside
    // accepted_by's ON DELETE SET NULL: dropping the accepting user's
    // auth.users row nulls accepted_by while accepted_at stays set.
    expect(body).toContain("check (accepted_by is null or accepted_at is not null)");
    expect(body).not.toContain("check ((accepted_by is null) = (accepted_at is null))");
  });

  it("does not broaden invites RLS", () => {
    expect(body).not.toMatch(/(create|drop) policy[^\n]*on public\.invites/i);
    expect(body).not.toMatch(/alter table public\.invites[^;]*row level security/i);
  });

  it("creates connection_grants with a unique pair and no write policy", () => {
    expect(body).toContain("create table if not exists public.connection_grants");
    expect(body).toMatch(/subject_user uuid not null references auth\.users\(id\) on delete cascade/);
    expect(body).toMatch(/viewer_user uuid not null references auth\.users\(id\) on delete cascade/);
    expect(body).toMatch(/viewer_person_id uuid not null references public\.people\(id\) on delete cascade/);
    expect(body).toContain("check (share_level in ('chart', 'details'))");
    expect(body).toContain("check (status in ('pending', 'active', 'revoked'))");
    expect(body).toContain("constraint connection_grants_not_self check (subject_user <> viewer_user)");
    expect(body).toMatch(
      /create unique index if not exists connection_grants_pair_idx\s*\n\s*on public\.connection_grants \(subject_user, viewer_user\);/
    );
    expect(body).toContain("alter table public.connection_grants enable row level security;");

    const created = [...body.matchAll(/create policy "([^"]+)"\s*\n\s*on public\.connection_grants for (\w+)/g)];
    expect(created.map((m) => [m[1], m[2]])).toEqual([
      ["connection_grants subject read", "select"],
      ["connection_grants viewer read", "select"]
    ]);
    expect(body).toContain(
      "revoke insert, update, delete on table public.connection_grants from anon, authenticated;"
    );
  });

  it("adds people.chart_source without a table rewrite", () => {
    expect(body).toContain(
      "add column if not exists chart_source text not null default 'local'"
    );
    expect(body).toContain("check (chart_source in ('local', 'linked'))");
  });

  it("adds exactly two freshness triggers, one per table, both SECURITY DEFINER", () => {
    const triggers = [...body.matchAll(/create trigger (\w+)\s*\nafter [\w\s]+ on public\.(\w+)/g)];
    expect(triggers.map((m) => [m[1], m[2]])).toEqual([
      ["charts_sync_linked_mirrors", "charts"],
      ["people_sync_linked_mirrors", "people"]
    ]);
    for (const fn of ["sync_linked_chart_mirrors", "sync_linked_person_mirrors"]) {
      expect(body).toMatch(
        new RegExp(`create or replace function public\\.${fn}\\(\\)[\\s\\S]{0,120}?security definer[\\s\\S]{0,60}?set search_path = public`)
      );
    }
  });

  it("preserves SECURITY DEFINER and SET search_path on the purge function", () => {
    const purge = sql.slice(
      sql.search(/create or replace function public\.purge_own_account_data\s*\(/i)
    );
    expect(purge).toMatch(/security definer/i);
    expect(purge).toMatch(/set search_path TO 'public'/);
  });

  it("carries every statement of the 20260913030200 body forward, in order", () => {
    // The whole point of this migration's purge edit: a CREATE OR REPLACE
    // that silently drops a line is the failure this suite exists to catch,
    // and it has already happened once to this function.
    const base = statements(functionBody(readMigration(PURGE))).filter(
      (line) => line !== REPLACED_BY_CONNECT
    );
    const mine = statements(functionBody(sql));

    let cursor = -1;
    for (const line of base) {
      const at = mine.indexOf(line, cursor + 1);
      expect(at, `lost or reordered: ${line}`).toBeGreaterThan(cursor);
      cursor = at;
    }
  });

  it("replaces the bare linked_user_id null-out with a mirror strip on both sides", () => {
    const mine = statements(functionBody(sql));
    expect(mine).not.toContain(REPLACED_BY_CONNECT);
    expect(mine).toContain("delete from charts");
    expect(mine).toContain("where person_id in (select id from people where linked_user_id = uid);");
    expect(mine).toContain(
      "delete from connection_grants where subject_user = uid or viewer_user = uid;"
    );
    expect(mine).toContain("update invites set accepted_by = null where accepted_by = uid;");

    // chart_source and linked_user_id must clear in one statement: a CHECK is
    // evaluated per statement.
    const purgeBody = stripSqlComments(functionBody(sql));
    const stmt = purgeBody.slice(purgeBody.indexOf("update people set"));
    const clause = stmt.slice(0, stmt.indexOf(";"));
    expect(clause).toContain("chart_source = 'local'");
    expect(clause).toContain("linked_user_id = null");
    expect(clause).toContain("birth_precision = 'none'");
    for (const col of [
      "birth_date",
      "birth_time",
      "birth_place",
      "birth_lat",
      "birth_lng",
      "tz_offset_min"
    ]) {
      expect(clause).toContain(`${col} = null`);
    }
  });

  it("builds no RPC: the only functions are the two triggers and the purge", () => {
    // Phase 2 owns the eight SECURITY DEFINER RPCs. Naming them in a comment
    // is fine and useful; declaring one here is not.
    const declared = [...body.matchAll(/create (?:or replace )?function public\.(\w+)/g)].map(
      (m) => m[1]
    );
    expect(declared.sort()).toEqual([
      "purge_own_account_data",
      "sync_linked_chart_mirrors",
      "sync_linked_person_mirrors"
    ]);
    expect(body).not.toMatch(/\bgrant execute on function public\.(create_connect|accept_connect|connect_invite)/);
  });

  it("authors no em dash anywhere in the file", () => {
    expect(sql).not.toContain("\u2014");
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
    expect(body).toContain("delete from email_sends where owner_id = uid;");
    expect(body).toContain("delete from auth.users where id = uid;");
    expect(body).toContain("delete from thread_participants where user_id = uid;");
    expect(body.indexOf("delete from auth.users where id = uid;")).toBeGreaterThan(
      body.indexOf("delete from thread_participants where user_id = uid;")
    );
  });

  it("also keeps the constellation-connect cleanup, in both directions", () => {
    const body = functionBody(latestPurgeSource());
    expect(body).toContain(
      "delete from connection_grants where subject_user = uid or viewer_user = uid;"
    );
    expect(body).toContain("where person_id in (select id from people where linked_user_id = uid);");
    expect(body).toContain("chart_source = 'local',");
    expect(body).not.toContain(REPLACED_BY_CONNECT);
  });
});

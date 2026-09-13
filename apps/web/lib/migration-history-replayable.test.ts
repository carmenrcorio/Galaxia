import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Guards that the committed migration history can be applied to an empty
 * database, which is what the "Supabase Preview" check does on every pull
 * request touching supabase/migrations.
 *
 * It could not, for two reasons, and both had been failing silently:
 *
 *   1. 20260712210000_rls_cross_user_hardening.sql revoked execute on
 *      public.rls_auto_enable(), a function that lives in production but
 *      that no migration ever created. From-scratch replay died there with
 *      `function public.rls_auto_enable() does not exist`.
 *   2. 20260821191500_admin_role_foundation.sql seeded a hardcoded
 *      auth.users id into admin_users. On a project with no signups that
 *      foreign key has nothing to point at.
 *
 * Neither is reachable by a test that only runs SQL in its head, so the
 * first guard below is the one that generalizes: it holds every function
 * the history revokes against the set of functions the history creates,
 * which is precisely the class of defect (1) belonged to. The remaining
 * tests pin the two fixes in place, since both depend on a back-dated
 * filename and a careless rename would quietly undo them.
 *
 * Same "read the actual source" precedent as
 * rls-indexes-purge-migrations.test.ts.
 */

const REPO_ROOT = join(__dirname, "..", "..", "..");
const MIGRATIONS = join(REPO_ROOT, "supabase/migrations");

const RLS_AUTO_ENABLE = "20260712200000_rls_auto_enable_definition.sql";
const RLS_HARDENING = "20260712210000_rls_cross_user_hardening.sql";
const ADMIN_BOOTSTRAP = "20260821191400_bootstrap_admin_auth_user.sql";
const ADMIN_FOUNDATION = "20260821191500_admin_role_foundation.sql";

function migrationNames(): string[] {
  return readdirSync(MIGRATIONS)
    .filter((f) => f.endsWith(".sql"))
    .sort();
}

function readMigration(name: string): string {
  return readFileSync(join(MIGRATIONS, name), "utf8");
}

/**
 * Drops whole-line `--` comments and block comments. Essential here rather
 * than cosmetic: both back-dated migrations quote the very statements they
 * exist to explain, so a scan that kept comments would match the
 * explanation instead of the SQL and pass for the wrong reason.
 */
function stripSqlComments(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => !/^[ \t]*--/.test(line))
    .join("\n");
}

function matchAll(sql: string, re: RegExp): string[] {
  return [...sql.matchAll(re)].map((m) => m[1].toLowerCase());
}

describe("the committed migration history is applicable to an empty database", () => {
  const bodies = migrationNames().map((name) => ({
    name,
    sql: stripSqlComments(readMigration(name))
  }));

  it("finds the migration directory", () => {
    expect(bodies.length).toBeGreaterThan(40);
  });

  it("creates every function it revokes execute on", () => {
    const created = new Set(
      bodies.flatMap(({ sql }) =>
        matchAll(sql, /create\s+(?:or\s+replace\s+)?function\s+(?:public\.)?(\w+)\s*\(/gi)
      )
    );

    const missing: string[] = [];
    for (const { name, sql } of bodies) {
      for (const fn of matchAll(
        sql,
        /revoke\s+execute\s+on\s+function\s+(?:public\.)?(\w+)\s*\(/gi
      )) {
        if (!created.has(fn)) missing.push(`${name}: ${fn}()`);
      }
    }

    // Was ["20260712210000_rls_cross_user_hardening.sql: rls_auto_enable()"].
    expect(missing).toEqual([]);
  });

  it("creates every function it attaches a trigger to", () => {
    const created = new Set(
      bodies.flatMap(({ sql }) =>
        matchAll(sql, /create\s+(?:or\s+replace\s+)?function\s+(?:public\.)?(\w+)\s*\(/gi)
      )
    );

    const missing: string[] = [];
    for (const { name, sql } of bodies) {
      for (const fn of matchAll(
        sql,
        /execute\s+(?:function|procedure)\s+(?:public\.)?(\w+)\s*\(/gi
      )) {
        if (!created.has(fn)) missing.push(`${name}: ${fn}()`);
      }
    }
    expect(missing).toEqual([]);
  });
});

describe(RLS_AUTO_ENABLE, () => {
  const sql = readMigration(RLS_AUTO_ENABLE);
  const body = stripSqlComments(sql);

  it("sorts before the migration that revokes execute on the function", () => {
    const names = migrationNames();
    expect(names).toContain(RLS_AUTO_ENABLE);
    expect(names.indexOf(RLS_AUTO_ENABLE)).toBeLessThan(names.indexOf(RLS_HARDENING));
  });

  it("creates the function and the event trigger that calls it", () => {
    expect(body).toContain("create or replace function public.rls_auto_enable()");
    expect(body).toContain("returns event_trigger");
    expect(body).toContain("create event trigger ensure_rls on ddl_command_end");
    expect(body).toContain("execute function public.rls_auto_enable()");
  });

  it("is re-runnable, since event triggers have no create-if-not-exists form", () => {
    expect(body).toContain("drop event trigger if exists ensure_rls;");
    expect(body).toContain("create or replace function");
  });

  it("keeps the function out of reach of the API roles", () => {
    expect(body).toContain(
      "revoke execute on function public.rls_auto_enable() from public, anon, authenticated;"
    );
  });

  it("swallows its own errors, so the backstop cannot abort an unrelated CREATE TABLE", () => {
    expect(body).toContain("EXCEPTION");
    expect(body).toContain("WHEN OTHERS THEN");
  });
});

describe(ADMIN_BOOTSTRAP, () => {
  const sql = readMigration(ADMIN_BOOTSTRAP);
  const body = stripSqlComments(sql);

  it("sorts before the migration whose foreign key needs the row", () => {
    const names = migrationNames();
    expect(names).toContain(ADMIN_BOOTSTRAP);
    expect(names.indexOf(ADMIN_BOOTSTRAP)).toBeLessThan(names.indexOf(ADMIN_FOUNDATION));
  });

  it("targets the same founder id the foundation migration seeds", () => {
    const id = "8112465c-f74b-4842-9ef4-9d30e98d4ccb";
    expect(body).toContain(id);
    expect(stripSqlComments(readMigration(ADMIN_FOUNDATION))).toContain(id);
  });

  /**
   * The load-bearing assertion of this file. "Insert when auth.users is
   * entirely empty" is a provable no-op on any database serving real
   * people. The narrower "insert when this id is missing" would manufacture
   * a founder row in a live database that had lost one, which is the
   * outcome most worth preventing, so the weaker guard must never be
   * substituted.
   */
  it("only seeds into a database with no accounts at all", () => {
    expect(body).toMatch(/where\s+not\s+exists\s*\(\s*select\s+1\s+from\s+auth\.users\s*\)/i);
    expect(body).not.toMatch(/where\s+not\s+exists\s*\([^)]*auth\.users\s+where\s+id/i);
    expect(body).not.toMatch(/on\s+conflict/i);
  });

  it("inserts nothing but the id, so the row cannot be authenticated as", () => {
    expect(body).toMatch(/insert\s+into\s+auth\.users\s*\(\s*id\s*\)/i);
    for (const column of ["encrypted_password", "email_confirmed_at", "confirmation_token"]) {
      expect(body).not.toContain(column);
    }
  });

  it("does not touch admin_users itself, which stays the foundation migration's job", () => {
    expect(body).not.toMatch(/insert\s+into\s+public\.admin_users/i);
  });
});

/**
 * A third replay defect, distinct from the two above: CREATE POLICY has no
 * IF NOT EXISTS form in Postgres, so any migration whose "create policy"
 * statement is not preceded by "drop policy if exists" for the same name
 * can only ever run once against a given database. That is invisible to
 * the from-scratch "Supabase Preview" check, since a fresh database has
 * never seen the policy before, but it is exactly what stopped production
 * (eigfvribtntbxyjutsma) from reconciling: six of these policies had
 * already been applied under a ledger version that does not match their
 * committed filename timestamp (the version skew ENGINEERING.md section 16
 * documents as expected from MCP apply_migration), so a deploy that
 * reconciles by version rather than by name still saw each of the six
 * committed timestamps as pending and reran the file, which failed with
 * "policy ... already exists". Confirmed against production's live
 * pg_policy for all six before writing the fix.
 *
 * 20260725035959_owner_policy_replay_guard.sql clears each policy first,
 * guarded so the clear is a no-op both when the table does not exist yet
 * (a fresh replay, where the bare create policy below it is the first and
 * only run) and when the policy has already been removed. This test finds
 * every bare create policy in the history and asserts each one is either
 * self-guarded or covered by the replay guard, so a future migration that
 * reintroduces this shape fails loudly here instead of silently blocking
 * production again.
 */
describe("bare create policy statements cannot be re-run, and are all protected", () => {
  const REPLAY_GUARD = "20260725035959_owner_policy_replay_guard.sql";
  const names = migrationNames();
  const guardIndex = names.indexOf(REPLAY_GUARD);
  const guardSql = stripSqlComments(readMigration(REPLAY_GUARD));

  // The six confirmed, as of this writing, to already be applied on
  // production (eigfvribtntbxyjutsma) under a ledger version that does not
  // match their own committed filename timestamp, which is what makes each
  // one a real target rather than a hypothetical one. Not a scan for every
  // bare "create policy" in the whole history: many earlier ones (for
  // example 20260629220500_add_owner_rls_policies.sql) were applied with a
  // ledger version that does match their filename, so a version-keyed
  // deploy has no reason to ever try them a second time, and flagging them
  // here would be a false positive rather than a real risk.
  const KNOWN_OFFENDERS = [
    { file: "20260725040000_person_daily_nudges.sql", policy: "person_daily_nudges owner all", table: "person_daily_nudges" },
    { file: "20260725050000_vela_chat_rate_limit.sql", policy: "vela_rate_limits owner read", table: "vela_rate_limits" },
    { file: "20260822120000_admin_safe_actions_and_support_queue.sql", policy: "support_requests owner insert", table: "support_requests" },
    { file: "20260909020000_memorial_milestones.sql", policy: "memorial_milestones owner all", table: "memorial_milestones" },
    { file: "20260909030000_relational_transits.sql", policy: "relational_transits owner all", table: "relational_transits" },
    { file: "20260909040000_push_tokens.sql", policy: "push_tokens owner all", table: "push_tokens" }
  ];

  it("finds the replay guard, sorted before everything it protects", () => {
    expect(guardIndex).toBeGreaterThanOrEqual(0);
    for (const { file } of KNOWN_OFFENDERS) {
      expect(names.indexOf(file), `${file} must sort after the replay guard`).toBeGreaterThan(
        guardIndex
      );
    }
  });

  it("each known offender is still a bare, unguarded create policy in its own file", () => {
    // Pins the shape of the defect this guard exists for. If a future edit
    // to one of these already-applied files added its own "drop policy if
    // exists" (which ENGINEERING.md section 2 forbids doing to an applied
    // migration anyway), this test would catch the drift rather than let
    // the guard silently become redundant.
    for (const { file, policy } of KNOWN_OFFENDERS) {
      const lines = stripSqlComments(readMigration(file)).split("\n");
      const idx = lines.findIndex((line) => line.startsWith(`create policy "${policy}"`));
      expect(idx, `${file} must still contain create policy "${policy}"`).toBeGreaterThanOrEqual(0);
      const precedingLines = lines.slice(Math.max(0, idx - 3), idx).join("\n");
      expect(precedingLines).not.toContain(`drop policy if exists "${policy}"`);
    }
  });

  it("covers every known offender with a guarded drop", () => {
    for (const { policy, table } of KNOWN_OFFENDERS) {
      expect(guardSql, `"${policy}" on ${table} must be dropped by the replay guard`).toContain(
        `drop policy if exists "${policy}" on public.${table}`
      );
    }
  });

  it("guards each drop on the target table already existing, for empty-database safety", () => {
    for (const table of [
      "person_daily_nudges",
      "vela_rate_limits",
      "support_requests",
      "memorial_milestones",
      "relational_transits",
      "push_tokens"
    ]) {
      expect(guardSql).toContain(`to_regclass('public.${table}')`);
    }
  });

  it("every dropped policy is recreated again later, so the guard changes nothing about the final shape", () => {
    const wrap = stripSqlComments(
      readMigration("20260913030100_wrap_auth_uid_in_rls_policies.sql")
    );
    for (const policy of [
      "person_daily_nudges owner all",
      "vela_rate_limits owner read",
      "support_requests owner insert",
      "memorial_milestones owner all",
      "relational_transits owner all",
      "push_tokens owner all"
    ]) {
      expect(wrap).toContain(`drop policy if exists "${policy}"`);
    }
  });
});

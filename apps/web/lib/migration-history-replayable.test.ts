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

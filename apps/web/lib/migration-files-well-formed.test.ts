import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Structural guard for `supabase/migrations/*.sql`.
 *
 * 20260909040000_push_tokens.sql was committed with editor line-number
 * gutter text pasted into the file body (`    10|`, `    20|`, and so on
 * every tenth line). That made the committed file invalid SQL: applying it
 * fails with `syntax error at or near "10"` on the first such line. It went
 * unnoticed for four days because nothing in the repo applies
 * supabase/migrations (by design, ENGINEERING.md section 16) and because
 * production had been given the clean text, so Migration Ledger Parity, which
 * compares names rather than bodies, stayed green on it.
 *
 * The cost was not hypothetical: the one suite that does read this file,
 * rls-indexes-purge-migrations.test.ts, had to grow a helper to strip the
 * markup before it could compare SQL at all. Those strippers are left in
 * place as harmless backstops; this test is what makes them unnecessary.
 */

const MIGRATIONS = join(__dirname, "..", "..", "..", "supabase/migrations");

/**
 * A line whose first non-space characters are digits followed by a single
 * pipe. `||` (SQL concatenation) is excluded so a legitimate continued
 * expression can never trip this.
 */
const GUTTER_LINE = /^[ \t]*\d+\|(?!\|)/;

function migrationFiles(): string[] {
  return readdirSync(MIGRATIONS)
    .filter((f) => f.endsWith(".sql"))
    .sort();
}

describe("supabase/migrations file hygiene", () => {
  const files = migrationFiles();

  it("finds the migration directory", () => {
    expect(files.length).toBeGreaterThan(40);
  });

  it("no file carries editor line-number gutter text", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const lines = readFileSync(join(MIGRATIONS, file), "utf8").split("\n");
      lines.forEach((line, i) => {
        if (GUTTER_LINE.test(line)) {
          offenders.push(`${file}:${i + 1}: ${line}`);
        }
      });
    }
    expect(offenders).toEqual([]);
  });

  it("no file is empty", () => {
    for (const file of files) {
      expect(readFileSync(join(MIGRATIONS, file), "utf8").trim().length, file).toBeGreaterThan(0);
    }
  });
});

describe("20260909040000_push_tokens.sql reads as the text production was given", () => {
  const sql = readFileSync(join(MIGRATIONS, "20260909040000_push_tokens.sql"), "utf8");

  it("restores the four statements the gutter text had broken", () => {
    // Each of these began a line that carried a prefix. Verified against
    // production pg_constraint / pg_policies / information_schema.
    expect(sql).toContain("  platform text check (platform in ('ios', 'android')),");
    expect(sql).toContain('create policy "push_tokens owner all"\non push_tokens for all');
    expect(sql).toContain(
      "alter table relational_transits\n  add column if not exists push_sent_at timestamptz default null;"
    );
    expect(sql).toContain("as $$\ndeclare\n  uid uuid := auth.uid();\nbegin");
  });

  it("keeps the purge body intact, including the statements the prefixes sat on", () => {
    for (const statement of [
      "  update notes\n    set about_person = null",
      "  delete from daily_nudge_emails where owner_id = uid;",
      "  delete from threads where owner_id = uid;",
      "  delete from groups where owner_id = uid;",
      "  delete from support_requests where owner_id = uid;"
    ]) {
      expect(sql).toContain(statement);
    }
  });
});

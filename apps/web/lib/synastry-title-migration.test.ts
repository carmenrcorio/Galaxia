import { afterEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { assertDisposableDbTarget } from "./test-utils/assert-not-prod";

const DISPOSABLE_URL = "https://abcdefghijklmnopqrst.supabase.co";
const REPO_ROOT = join(__dirname, "..", "..", "..");
const MIGRATION = join(
  REPO_ROOT,
  "supabase/migrations/20260911180000_synastry_post_title_length.sql"
);

describe("synastry title-length migration never opens a database", () => {
  afterEach(() => {
    delete process.env.ALLOW_LIVE_DB_TESTS_AGAINST;
  });

  it("still goes behind assertDisposableDbTarget against a non-prod placeholder", () => {
    process.env.ALLOW_LIVE_DB_TESTS_AGAINST = "abcdefghijklmnopqrst";
    expect(assertDisposableDbTarget(DISPOSABLE_URL)).toBe("abcdefghijklmnopqrst");
  });
});

describe("20260911180000_synastry_post_title_length.sql", () => {
  it("shortens the synastry-chart-meaning title to 60 characters or fewer, with no U+2014", () => {
    const sql = readFileSync(MIGRATION, "utf8");
    const match = sql.match(/set\s+title\s*=\s*'([^']+)'/i);
    expect(match?.[1]).toBeDefined();
    const title = match![1]!;
    expect(title.length).toBeLessThanOrEqual(60);
    expect(title).not.toContain("\u2014");
    expect(sql).toContain("where slug = 'synastry-chart-meaning'");
  });
});

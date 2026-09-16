import { afterEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { assertDisposableDbTarget } from "./test-utils/assert-not-prod";

const DISPOSABLE_URL = "https://abcdefghijklmnopqrst.supabase.co";
const REPO_ROOT = join(__dirname, "..", "..", "..");
const MIGRATION = join(
  REPO_ROOT,
  "supabase/migrations/20260916043000_synastry_aspects_title_drop_predict.sql"
);
const NEW_TITLE = "7 Synastry Aspects That Reveal How Relationships Feel";

describe("synastry-aspects title migration never opens a database", () => {
  afterEach(() => {
    delete process.env.ALLOW_LIVE_DB_TESTS_AGAINST;
  });

  it("still goes behind assertDisposableDbTarget against a non-prod placeholder", () => {
    process.env.ALLOW_LIVE_DB_TESTS_AGAINST = "abcdefghijklmnopqrst";
    expect(assertDisposableDbTarget(DISPOSABLE_URL)).toBe("abcdefghijklmnopqrst");
  });
});

describe("20260916043000_synastry_aspects_title_drop_predict.sql", () => {
  it("replaces Predict with Reveal on synastry-aspects-explained, under 60 characters, no U+2014", () => {
    const sql = readFileSync(MIGRATION, "utf8");
    const match = sql.match(/set\s+title\s*=\s*'([^']+)'/i);
    expect(match?.[1]).toBe(NEW_TITLE);
    expect(NEW_TITLE.length).toBeLessThanOrEqual(60);
    expect(NEW_TITLE).not.toContain("Predict");
    expect(NEW_TITLE).not.toContain("\u2014");
    expect(sql).toContain("where slug = 'synastry-aspects-explained'");
    expect(sql).toContain("and title = '7 Synastry Aspects That Predict How Relationships Feel'");
  });
});

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { assertDisposableDbTarget } from "./test-utils/assert-not-prod";

/** Same formula as `computeReadTimeMinutes` in `lib/blog.ts` (words / 225, ceil). */
function computeReadTimeMinutes(markdownBody: string): number {
  const words = markdownBody.trim().split(/\s+/).filter(Boolean).length;
  if (words === 0) return 1;
  return Math.max(1, Math.ceil(words / 225));
}

const DISPOSABLE_URL = "https://abcdefghijklmnopqrst.supabase.co";
const REPO_ROOT = join(__dirname, "..", "..", "..");
const MIGRATION = join(
  REPO_ROOT,
  "supabase/migrations/20260911233000_synastry_post_em_dash_keep_links.sql"
);

function postedBody(sql: string): string {
  const open = sql.indexOf("$POST_BODY$");
  const close = sql.lastIndexOf("$POST_BODY$");
  expect(open).toBeGreaterThanOrEqual(0);
  expect(close).toBeGreaterThan(open);
  return sql.slice(open + "$POST_BODY$".length, close);
}

describe("synastry em-dash keep-links migration never opens a database", () => {
  afterEach(() => {
    delete process.env.ALLOW_LIVE_DB_TESTS_AGAINST;
  });

  it("still goes behind assertDisposableDbTarget against a non-prod placeholder", () => {
    process.env.ALLOW_LIVE_DB_TESTS_AGAINST = "abcdefghijklmnopqrst";
    expect(assertDisposableDbTarget(DISPOSABLE_URL)).toBe("abcdefghijklmnopqrst");
  });
});

describe("20260911233000_synastry_post_em_dash_keep_links.sql", () => {
  const sql = readFileSync(MIGRATION, "utf8");
  const body = postedBody(sql);

  it("keeps the three internal links and contains no U+2014", () => {
    expect(sql).toContain("where slug = 'synastry-chart-meaning'");
    expect(body).toContain("](/meet-vela)");
    expect(body).toContain("](/generations)");
    expect(body).toContain("](/chart/compare)");
    expect(body).not.toContain("\u2014");
    expect(body).not.toContain(" - ");
  });

  it("rewrites dash sentences the way the original purge did (comma, colon, parentheses, two sentences)", () => {
    expect(body).toContain("born: computed from astronomical data");
    expect(body).toContain("It is not prediction: nothing here forecasts events");
    expect(body).toContain("Not broken, effortful.");
    expect(body).toContain(
      "Don't let this ease go unspoken between you. Say the affection out loud even when it feels obvious: warmth this easy is exactly what gets taken for granted."
    );
    expect(body).toContain("starts registering as a baseline, and a baseline is something you only notice when it is gone.");
    expect(body).toContain("Now the hard aspects, and the reason the reading order matters so much.");
    expect(body).toContain("hardens into scorekeeping: naming what you actually need");
    expect(body).toContain("That is genuinely valuable: most stuck arguments are stuck on vocabulary.");
    expect(body).toContain(
      "](/meet-vela): the same refusal to guess past what the data supports"
    );
    expect(body).toContain("unlock the deepest layer (houses, rising signs, the precise Moon), but you do not need them to start");
    expect(body).toContain(
      "the least information about (a grandparent, a parent who is gone, an old friend) still have a place"
    );
  });

  it("stores read_time_minutes matching computeReadTimeMinutes on the payload", () => {
    expect(computeReadTimeMinutes(body)).toBe(6);
    expect(sql).toMatch(/read_time_minutes\s*=\s*6/);
  });
});

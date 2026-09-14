import { afterEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { assertDisposableDbTarget } from "./test-utils/assert-not-prod";
import { F12_TERM_LINKS } from "./f12-internal-links";

const DISPOSABLE_URL = "https://abcdefghijklmnopqrst.supabase.co";
const REPO_ROOT = join(__dirname, "..", "..", "..");
const LINKS = join(REPO_ROOT, "supabase/migrations/20260914221000_f12_internal_links.sql");
const DATES = join(REPO_ROOT, "supabase/migrations/20260914230000_f12_stagger_published_at.sql");

function updatedSlugs(sql: string): string[] {
  return [...sql.matchAll(/where slug = '([^']+)'/g)].map((match) => match[1]!);
}

describe("F12 migrations never open a database", () => {
  afterEach(() => {
    delete process.env.ALLOW_LIVE_DB_TESTS_AGAINST;
  });

  it("still goes behind assertDisposableDbTarget against a non-prod placeholder", () => {
    process.env.ALLOW_LIVE_DB_TESTS_AGAINST = "abcdefghijklmnopqrst";
    expect(assertDisposableDbTarget(DISPOSABLE_URL)).toBe("abcdefghijklmnopqrst");
  });
});

describe("20260914221000_f12_internal_links.sql", () => {
  const sql = readFileSync(LINKS, "utf8");
  const slugs = updatedSlugs(sql);

  it("updates only body and updated_at on published rows", () => {
    expect(sql).toMatch(/update public\.posts/i);
    expect(sql).not.toMatch(/^\s*(title|dek|category|status)\s*=/im);
    expect(sql).not.toContain("\u2014");
    expect(sql).toContain("and status = 'published'");
    expect(sql).toContain("updated_at = now()");
  });

  it("documents the founder-confirmed term map", () => {
    expect(sql).toContain("FOUNDER-REVIEW");
    for (const { term, slug } of F12_TERM_LINKS) {
      expect(sql).toContain(term);
      expect(sql).toContain(`/${slug}`);
    }
  });

  it("links the first synastry chart / synastry / Moon square Saturn in synastry-aspects-explained", () => {
    expect(sql).toContain("You finally pulled a [synastry chart](/synastry-chart-meaning) with someone");
    expect(sql).toContain("most explanations of [synastry](/synastry-chart-meaning) stop");
    expect(sql).toContain(
      "A [Moon square Saturn](/moon-square-saturn-parent-child) sitting next to a warm Sun trine Sun"
    );
  });

  it("links Moon square Saturn and synastry in reading-chart-of-someone-who-died", () => {
    expect(sql).toContain(
      "If the contact between you was [Moon square Saturn](/moon-square-saturn-parent-child), that architecture"
    );
    expect(sql).toContain(
      "look at the [synastry](/synastry-chart-meaning) between your chart and a deceased person''s"
    );
  });

  it("does not rewrite posts that already had no unlinked first mentions", () => {
    expect(slugs).not.toContain("colleague-you-cannot-read");
    expect(slugs).not.toContain("mothers-moon-sign-apology");
    expect(slugs).not.toContain("synastry-chart-meaning");
    expect(slugs).toEqual([
      "compatibility-scores-wrong-question",
      "moon-square-saturn-parent-child",
      "nobody-has-your-grandmother",
      "reading-chart-of-someone-who-died",
      "sun-sign-not-personality",
      "synastry-aspects-explained",
      "what-a-chart-cannot-tell-you"
    ]);
  });
});

describe("20260914230000_f12_stagger_published_at.sql", () => {
  const sql = readFileSync(DATES, "utf8");

  it("sets UTC noon on all ten published slugs and touches no other columns", () => {
    const schedule: Array<[string, string]> = [
      ["mothers-moon-sign-apology", "2026-07-21 12:00:00+00"],
      ["colleague-you-cannot-read", "2026-07-28 12:00:00+00"],
      ["synastry-chart-meaning", "2026-08-04 12:00:00+00"],
      ["moon-square-saturn-parent-child", "2026-08-11 12:00:00+00"],
      ["nobody-has-your-grandmother", "2026-08-18 12:00:00+00"],
      ["what-a-chart-cannot-tell-you", "2026-08-25 12:00:00+00"],
      ["sun-sign-not-personality", "2026-09-01 12:00:00+00"],
      ["synastry-aspects-explained", "2026-09-07 12:00:00+00"],
      ["reading-chart-of-someone-who-died", "2026-09-10 12:00:00+00"],
      ["compatibility-scores-wrong-question", "2026-09-14 12:00:00+00"]
    ];
    expect(sql).not.toMatch(/\bbody\s*=/i);
    expect(sql).not.toMatch(/^\s*(title|dek|category|status)\s*=/im);
    expect(sql).not.toContain("\u2014");
    expect(sql).toContain("and status = 'published'");
    for (const [slug, when] of schedule) {
      expect(sql).toContain(`timestamptz '${when}'`);
      expect(sql).toContain(`where slug = '${slug}'`);
    }
    expect([...sql.matchAll(/update public\.posts/gi)]).toHaveLength(10);
  });
});

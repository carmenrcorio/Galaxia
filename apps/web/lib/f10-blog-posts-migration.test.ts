import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { computeReadTimeMinutes } from "./read-time";

const REPO_ROOT = join(__dirname, "..", "..", "..");
const MIGRATION = join(REPO_ROOT, "supabase/migrations/20260914180000_f10_blog_posts.sql");
const SLUG_PAGE = join(REPO_ROOT, "apps/web/app/[slug]/page.tsx");

const F10 = [
  {
    n: 1,
    slug: "mothers-moon-sign-apology",
    category: "guides",
    existingLinks: ["/chart", "/chart/compare", "/synastry-chart-meaning", "/generations"]
  },
  {
    n: 2,
    slug: "colleague-you-cannot-read",
    category: "guides",
    existingLinks: ["/generations", "/chart", "/for-work", "/nobody-has-your-grandmother"]
  },
  {
    n: 3,
    slug: "moon-square-saturn-parent-child",
    category: "guides",
    existingLinks: ["/synastry-aspects-explained", "/synastry-chart-meaning", "/chart/compare"]
  },
  {
    n: 4,
    slug: "what-a-chart-cannot-tell-you",
    category: "debunked",
    existingLinks: ["/sun-sign-not-personality", "/synastry-chart-meaning", "/chart"]
  },
  {
    n: 5,
    slug: "reading-chart-of-someone-who-died",
    category: "guides",
    existingLinks: ["/chart", "/nobody-has-your-grandmother", "/synastry-chart-meaning", "/generations"]
  },
  {
    n: 6,
    slug: "compatibility-scores-wrong-question",
    category: "debunked",
    existingLinks: ["/synastry-chart-meaning", "/synastry-aspects-explained", "/sun-sign-not-personality", "/chart/compare"]
  }
] as const;

function dollar(sql: string, tag: string): string {
  const open = `$${tag}$`;
  const start = sql.indexOf(open);
  expect(start, `missing $${tag}$`).toBeGreaterThanOrEqual(0);
  const innerStart = start + open.length;
  const end = sql.indexOf(open, innerStart);
  expect(end, `unclosed $${tag}$`).toBeGreaterThan(innerStart);
  return sql.slice(innerStart, end);
}

function wordCount(body: string): number {
  return body
    .trim()
    .split(/\s+/)
    .filter((token) => /[\p{L}\p{N}]/u.test(token)).length;
}

describe("20260914180000_f10_blog_posts.sql", () => {
  const sql = readFileSync(MIGRATION, "utf8");

  it("tags every authored string FOUNDER-REVIEW and never uses U+2014", () => {
    expect(sql).toContain("FOUNDER-REVIEW");
    expect(sql).not.toContain("\u2014");
    expect(sql).not.toContain("\u2013");
    for (const post of F10) {
      expect(sql).toContain(`-- FOUNDER-REVIEW: authored post ${post.n} title, dek, body.`);
    }
  });

  it("inserts six published posts with titles under 60 and deks under 155", () => {
    expect(sql).toMatch(/insert into public\.posts/i);
    expect(sql).toMatch(/on conflict \(slug\) do nothing/i);
    for (const post of F10) {
      const title = dollar(sql, `title${post.n}`);
      const dek = dollar(sql, `dek${post.n}`);
      expect(title.length).toBeLessThanOrEqual(60);
      expect(dek.length).toBeLessThanOrEqual(155);
      expect(sql).toContain(`'${post.slug}'`);
      expect(sql).toContain(`'${post.category}'`);
      expect(title).not.toContain("\u2014");
      expect(dek).not.toContain("\u2014");
    }
  });

  it("keeps each body between 1200 and 1600 words, with read_time_minutes matching computeReadTimeMinutes", () => {
    for (const post of F10) {
      const body = dollar(sql, `body${post.n}`);
      const words = wordCount(body);
      expect(words, post.slug).toBeGreaterThanOrEqual(1200);
      expect(words, post.slug).toBeLessThanOrEqual(1600);
      const slugBlock = sql.slice(sql.indexOf(`'${post.slug}'`));
      const minutes = computeReadTimeMinutes(body);
      expect(slugBlock).toContain(`'published',\n  ${minutes},`);
    }
  });

  it("puts at least two internal links to already-live pages in each body, and a soft /chart CTA", () => {
    for (const post of F10) {
      const body = dollar(sql, `body${post.n}`);
      const present = post.existingLinks.filter((href) => body.includes(`](${href})`));
      expect(present.length, post.slug).toBeGreaterThanOrEqual(2);
      expect(body).toMatch(/\]\(\/chart(?:\/compare)?\)/);
      expect(body).not.toMatch(/14 days free/i);
      expect(body).not.toMatch(/Start 14 days/i);
      if (/Vela/i.test(body)) {
        expect(body).toMatch(/never charged per message/i);
      }
    }
  });

  it("adds one reciprocal link from an existing post to each new slug", () => {
    const pairs: Array<[string, string]> = [
      ["nobody-has-your-grandmother", "/mothers-moon-sign-apology"],
      ["nobody-has-your-grandmother", "/colleague-you-cannot-read"],
      ["nobody-has-your-grandmother", "/reading-chart-of-someone-who-died"],
      ["synastry-aspects-explained", "/moon-square-saturn-parent-child"],
      ["sun-sign-not-personality", "/what-a-chart-cannot-tell-you"],
      ["synastry-chart-meaning", "/compatibility-scores-wrong-question"]
    ];
    for (const [fromSlug, href] of pairs) {
      expect(sql).toContain(`where slug = '${fromSlug}'`);
      expect(sql).toContain(`](${href})`);
      expect(sql).toContain(`and body not like`);
    }
  });

  it("does not invent a /blog/ canonical for the new slugs", () => {
    expect(sql).toContain("never /blog/{slug}");
    expect(readFileSync(SLUG_PAGE, "utf8")).toContain(
      'from "../../lib/blog-article-json-ld"'
    );
    expect(readFileSync(SLUG_PAGE, "utf8")).toContain("<JsonLd data={buildArticleJsonLd(post)} />");
  });
});

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ArticleMarkdown } from "../components/blog/article-markdown";
import { buildArticleJsonLd } from "./blog-article-json-ld";
import { buildPostMetadata } from "./blog-metadata";
import { computeReadTimeMinutes } from "./read-time";

const REPO_ROOT = join(__dirname, "..", "..", "..");
const MIGRATION = join(REPO_ROOT, "supabase/migrations/20260929174016_seo_blog_nine_posts.sql");
const SLUG_PAGE = join(REPO_ROOT, "apps/web/app/[slug]/page.tsx");
const SITEMAP = join(REPO_ROOT, "apps/web/app/sitemap.ts");

const POSTS = [
  {
    n: 1,
    slug: "uranus-retrograde-gemini-2026-relationships",
    publishedAt: "2026-09-30 12:00:00+00",
    publishedAtIso: "2026-09-30T12:00:00.000Z",
    links: ["/synastry-chart-meaning", "/chart"]
  },
  {
    n: 2,
    slug: "neptune-in-synastry-meaning",
    publishedAt: "2026-09-30 12:00:00+00",
    publishedAtIso: "2026-09-30T12:00:00.000Z",
    links: ["/chart", "/synastry-chart-meaning"]
  },
  {
    n: 3,
    slug: "venus-retrograde-2026-relationships",
    publishedAt: "2026-10-01 12:00:00+00",
    publishedAtIso: "2026-10-01T12:00:00.000Z",
    links: ["/chart"]
  },
  {
    n: 4,
    slug: "how-people-used-astrology-what-they-got-right-and-wrong",
    publishedAt: "2026-10-06 12:00:00+00",
    publishedAtIso: "2026-10-06T12:00:00.000Z",
    links: ["/chart"]
  },
  {
    n: 5,
    slug: "synastry-vs-composite-chart",
    publishedAt: "2026-10-08 12:00:00+00",
    publishedAtIso: "2026-10-08T12:00:00.000Z",
    links: ["/synastry-chart-meaning", "/chart"]
  },
  {
    n: 6,
    slug: "moon-sign-in-relationships",
    publishedAt: "2026-10-13 12:00:00+00",
    publishedAtIso: "2026-10-13T12:00:00.000Z",
    links: ["/synastry-chart-meaning", "/chart"]
  },
  {
    n: 8,
    slug: "mercury-retrograde-relationships-2026",
    publishedAt: "2026-10-20 12:00:00+00",
    publishedAtIso: "2026-10-20T12:00:00.000Z",
    links: ["/chart", "/uranus-retrograde-gemini-2026-relationships"]
  },
  {
    n: 9,
    slug: "chart-without-birth-time",
    publishedAt: "2026-10-22 12:00:00+00",
    publishedAtIso: "2026-10-22T12:00:00.000Z",
    links: ["/whole-sign-houses-explained", "/chart"]
  }
] as const;

const RESOLVED = new Set<string>([
  "/chart",
  "/synastry-chart-meaning",
  ...POSTS.map((post) => `/${post.slug}`)
]);

/** Held back: the post claims Galaxia calculates with Whole Sign houses. */
const KNOWN_UNRESOLVED = new Set<string>(["/whole-sign-houses-explained"]);

function dollar(sql: string, tag: string): string {
  const open = `$${tag}$`;
  const start = sql.indexOf(open);
  expect(start, `missing $${tag}$`).toBeGreaterThanOrEqual(0);
  const innerStart = start + open.length;
  const end = sql.indexOf(open, innerStart);
  expect(end, `unclosed $${tag}$`).toBeGreaterThan(innerStart);
  return sql.slice(innerStart, end);
}

function markdownHrefs(body: string): string[] {
  return [...body.matchAll(/\]\((\/[^)]+)\)/g)].map((match) => match[1]);
}

describe("20260929174016_seo_blog_nine_posts.sql", () => {
  const sql = readFileSync(MIGRATION, "utf8");

  it("tags authored strings in comments, publishes eight guides, and updates on slug conflict", () => {
    expect(sql).not.toContain("\u2014");
    expect(sql).toMatch(/on conflict \(slug\) do update set/i);
    expect(sql).not.toMatch(/on conflict \(slug\) do nothing/i);
    expect(sql).toContain("updated_at = now()");
    expect(sql).not.toContain("'whole-sign-houses-explained'");
    for (const post of POSTS) {
      expect(sql).toContain(`-- FOUNDER-REVIEW: authored post ${post.n} title, dek, body.`);
      expect(sql).toContain(`'${post.slug}'`);
      expect(sql).toContain(`timestamptz '${post.publishedAt}'`);
      const title = dollar(sql, `title_p${post.n}`);
      const dek = dollar(sql, `dek_p${post.n}`);
      const body = dollar(sql, `body_p${post.n}`);
      expect(title).not.toContain("FOUNDER-REVIEW");
      expect(dek).not.toContain("FOUNDER-REVIEW");
      expect(body).not.toContain("FOUNDER-REVIEW");
      expect(body).not.toContain("![");
      expect(body).not.toContain("\u2014");
      const slugAt = sql.indexOf(`'${post.slug}'`);
      const nextSlug = sql.indexOf("\n(", slugAt);
      const block = sql.slice(slugAt, nextSlug === -1 ? sql.length : nextSlug);
      expect(block).toContain("'guides'");
      expect(block).toContain("'published'");
      expect(block).toContain(`\n  ${computeReadTimeMinutes(body)},`);
    }
  });

  it("keeps every internal link on a real route, except the withheld Whole Sign post", () => {
    expect(existsSync(join(REPO_ROOT, "apps/web/app/chart/page.tsx"))).toBe(true);
    const synastryMigration = readFileSync(
      join(REPO_ROOT, "supabase/migrations/20260909011620_blog_posts_schema_and_content.sql"),
      "utf8"
    );
    expect(synastryMigration).toContain("'synastry-chart-meaning'");

    const unresolved: string[] = [];
    for (const post of POSTS) {
      const body = dollar(sql, `body_p${post.n}`);
      const hrefs = markdownHrefs(body);
      for (const expected of post.links) {
        expect(hrefs, post.slug).toContain(expected);
      }
      for (const href of hrefs) {
        if (RESOLVED.has(href)) continue;
        if (KNOWN_UNRESOLVED.has(href)) {
          unresolved.push(`${post.slug} -> ${href}`);
          continue;
        }
        throw new Error(`${post.slug} links to unknown ${href}`);
      }
    }
    expect(unresolved).toEqual(["chart-without-birth-time -> /whole-sign-houses-explained"]);
  });

  it("renders markdown without images, and the composite table scrolls inside the article", () => {
    for (const post of POSTS) {
      const body = dollar(sql, `body_p${post.n}`);
      const html = renderToStaticMarkup(createElement(ArticleMarkdown, { children: body }));
      expect(html, post.slug).not.toContain("<img");
      expect(html, post.slug).toContain('class="article-p"');
    }
    const composite = dollar(sql, "body_p5");
    const html = renderToStaticMarkup(createElement(ArticleMarkdown, { children: composite }));
    expect(html).toContain('<div class="article-table-wrap"><table class="article-table">');
    expect(html).toContain("Synastry");
    expect(html).toContain("Composite");
  });

  it("feeds the stored title and published_at into canonical metadata and Article JSON-LD", () => {
    const page = readFileSync(SLUG_PAGE, "utf8");
    expect(page).toContain("buildPostMetadata(post)");
    expect(page).toContain("<JsonLd data={buildArticleJsonLd(post)} />");
    const sitemap = readFileSync(SITEMAP, "utf8");
    expect(sitemap).toContain("getPublishedPosts()");
    expect(sitemap).toContain("`${SITE_URL}/${post.slug}`");
    const blog = readFileSync(join(REPO_ROOT, "apps/web/lib/blog.ts"), "utf8");
    expect(blog).toContain('.eq("status", "published")');
    expect(blog).not.toMatch(/\.lte\(\s*["']published_at["']/);

    for (const post of POSTS) {
      const title = dollar(sql, `title_p${post.n}`);
      const dek = dollar(sql, `dek_p${post.n}`);
      const publishedAt = post.publishedAtIso;
      const meta = buildPostMetadata({ slug: post.slug, title, dek, heroImageUrl: null });
      expect(meta.title).toBe(title);
      expect(meta.description).toBe(dek);
      expect(meta.alternates?.canonical).toBe(`/${post.slug}`);

      const jsonLd = buildArticleJsonLd({
        slug: post.slug,
        title,
        publishedAt,
        updatedAt: publishedAt
      });
      expect(jsonLd["@type"]).toBe("Article");
      expect(jsonLd.headline).toBe(title);
      expect(jsonLd.datePublished).toBe(publishedAt);
      expect(jsonLd.mainEntityOfPage).toEqual({
        "@type": "WebPage",
        "@id": `https://galaxiamea.com/${post.slug}`
      });
    }
  });
});

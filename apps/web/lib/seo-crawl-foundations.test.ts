import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Source-level guards for the SEO crawl foundations pass: static
 * public/robots.txt, /login + /signup dropped from app/sitemap.ts, and a
 * self-referencing `alternates.canonical` on every route named as
 * "critical" in that work: /, /blog, /blog/guides, /blog/debunked, /chart,
 * /chart/compare, /privacy, /terms.
 *
 * This reads source files directly rather than importing the routes —
 * same reasoning as og-share-route-wiring.test.ts: several of these
 * routes (sitemap.ts, blog pages) pull in lib/blog.ts -> `server-only` /
 * Supabase, which throws outside a real Next.js server bundle.
 */

const REPO_ROOT = join(__dirname, "..", "..", "..");

function readRoute(path: string): string {
  return readFileSync(join(REPO_ROOT, path), "utf8");
}

function exists(path: string): boolean {
  return existsSync(join(REPO_ROOT, path));
}

describe("public/robots.txt", () => {
  it("exists with an Allow-all rule and points at the production sitemap", () => {
    const src = readRoute("apps/web/public/robots.txt");
    expect(src).toContain("User-agent: *");
    expect(src).toContain("Allow: /");
    expect(src).toContain("Sitemap: https://galaxiamea.com/sitemap.xml");
  });
});

describe("app/sitemap.ts — /login and /signup excluded", () => {
  const src = readRoute("apps/web/app/sitemap.ts");

  it("no longer lists /login or /signup among the static routes", () => {
    expect(src).not.toMatch(/["']\/login["']/);
    expect(src).not.toMatch(/["']\/signup["']/);
  });

  it("keeps every other previously-listed static route", () => {
    for (const route of ["/", "/blog", "/privacy", "/terms", "/download", "/chart", "/chart/compare"]) {
      expect(src).toContain(`"${route}"`);
    }
  });

  it("still spreads BLOG_CATEGORIES and published posts into the output", () => {
    expect(src).toContain("BLOG_CATEGORIES.map((c) => `/blog/${c.slug}`)");
    expect(src).toContain("getPublishedPosts()");
  });
});

describe("app/layout.tsx — metadataBase unchanged", () => {
  it("still resolves relative canonical/OG URLs against publicEnv.siteUrl (prod: galaxiamea.com)", () => {
    const src = readRoute("apps/web/app/layout.tsx");
    expect(src).toMatch(/metadataBase:\s*new URL\(publicEnv\.siteUrl \|\| "https:\/\/galaxia-three\.vercel\.app"\)/);
  });
});

describe("self-referencing canonical coverage on the named critical routes", () => {
  const cases: Array<[path: string, canonical: string]> = [
    ["apps/web/app/page.tsx", "/"],
    ["apps/web/app/blog/page.tsx", "/blog"],
    ["apps/web/app/privacy/page.tsx", "/privacy"],
    ["apps/web/app/terms/page.tsx", "/terms"],
    ["apps/web/app/chart/layout.tsx", "/chart"],
    ["apps/web/app/chart/compare/layout.tsx", "/chart/compare"],
    ["apps/web/app/login/page.tsx", "/login"],
    ["apps/web/app/signup/page.tsx", "/signup"],
    ["apps/web/app/download/page.tsx", "/download"]
  ];

  for (const [path, canonical] of cases) {
    it(`${path} declares alternates.canonical: "${canonical}"`, () => {
      const src = readRoute(path);
      expect(src).toMatch(/alternates:\s*\{\s*canonical:\s*["']([^"']+)["']/);
      const match = src.match(/alternates:\s*\{\s*canonical:\s*["']([^"']+)["']/);
      expect(match?.[1]).toBe(canonical);
    });
  }

  it("app/blog/[category]/page.tsx derives its canonical from the resolved category slug (covers /blog/guides and /blog/debunked)", () => {
    expect(readRoute("apps/web/app/blog/[category]/page.tsx")).toContain("buildCategoryMetadata(category)");
    const src = readRoute("apps/web/lib/blog-metadata.ts");
    expect(src).toMatch(/alternates:\s*\{\s*canonical:\s*`\/blog\/\$\{category\.slug\}`\s*\}/);
  });

  it("the post template emits alternates.canonical matching the slug via buildPostMetadata", () => {
    expect(readRoute("apps/web/app/[slug]/page.tsx")).toContain("buildPostMetadata(post)");
    const src = readRoute("apps/web/lib/blog-metadata.ts");
    expect(src).toMatch(/canonical:\s*`\/\$\{post\.slug\}`/);
    expect(src).not.toMatch(/canonical:\s*`\/blog\/\$\{post\.slug\}`/);
  });
});

describe("/chart and /chart/compare stay client components with their page UI untouched", () => {
  it("the interactive chart form and compare page are still \"use client\" (canonical had to move to a layout, not the page)", () => {
    expect(readRoute("apps/web/app/chart/quick-chart-page.tsx").startsWith('"use client"')).toBe(true);
    expect(readRoute("apps/web/app/chart/compare/page.tsx").startsWith('"use client"')).toBe(true);
  });

  it("the new layouts render children verbatim (no wrapper markup that would change visible output)", () => {
    for (const path of ["apps/web/app/chart/layout.tsx", "apps/web/app/chart/compare/layout.tsx"]) {
      const src = readRoute(path);
      expect(src).toMatch(/return children;/);
    }
  });
});

describe("homepage meta description length", () => {
  it("is 155 characters or fewer", () => {
    const src = readRoute("apps/web/app/page.tsx");
    const match = src.match(/const DESCRIPTION =\s*\n\s*"([^"]+)"/);
    expect(match?.[1]).toBeDefined();
    expect(match![1]!.length).toBeLessThanOrEqual(155);
  });
});

describe("App Router icon slot", () => {
  it("provides icon.tsx, apple-icon.tsx, and favicon.ico", () => {
    expect(readRoute("apps/web/app/icon.tsx")).toContain("generateImageMetadata");
    expect(readRoute("apps/web/app/apple-icon.tsx")).toContain("brandIconImage(180)");
    expect(exists("apps/web/app/favicon.ico")).toBe(true);
    expect(exists("apps/web/public/icon.png")).toBe(true);
    expect(exists("apps/web/public/apple-touch-icon.png")).toBe(true);
  });
});

describe("WebPage JSON-LD on legal, blog, and chart", () => {
  it("privacy, terms, blog, and chart render WebPageJsonLd", () => {
    expect(readRoute("apps/web/app/privacy/page.tsx")).toContain('WebPageJsonLd path="/privacy"');
    expect(readRoute("apps/web/app/terms/page.tsx")).toContain('WebPageJsonLd path="/terms"');
    expect(readRoute("apps/web/app/blog/page.tsx")).toContain('WebPageJsonLd path="/blog"');
    expect(readRoute("apps/web/app/chart/page.tsx")).toContain('WebPageJsonLd path="/chart"');
  });
});

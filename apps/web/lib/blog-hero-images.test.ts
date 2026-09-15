import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = join(__dirname, "..", "..", "..");
const SVG_DIR = join(REPO_ROOT, "scripts/dev/blog-hero-images");
const GENERATOR = join(REPO_ROOT, "scripts/dev/generate-blog-hero-images.mjs");
const MIGRATION = join(REPO_ROOT, "supabase/migrations/20260915013000_blog_hero_image_urls.sql");

const SLUGS = [
  "mothers-moon-sign-apology",
  "colleague-you-cannot-read",
  "synastry-chart-meaning",
  "moon-square-saturn-parent-child",
  "nobody-has-your-grandmother",
  "what-a-chart-cannot-tell-you",
  "sun-sign-not-personality",
  "synastry-aspects-explained",
  "reading-chart-of-someone-who-died",
  "compatibility-scores-wrong-question"
] as const;

describe("blog hero SVG content tool", () => {
  it("keeps the generator marked as a dev tool, not a production import", () => {
    const src = readFileSync(GENERATOR, "utf8");
    expect(src).toContain("DEV TOOL");
    expect(src).toContain("not part of the production bundle");
    const webSrc = readFileSync(join(REPO_ROOT, "apps/web/app/[slug]/page.tsx"), "utf8");
    expect(webSrc).not.toContain("generate-blog-hero-images");
  });

  it("emits one 1200x630 SVG per published slug with navy field, title, and wordmark", () => {
    expect(readdirSync(SVG_DIR).filter((f) => f.endsWith(".svg")).sort()).toEqual(
      [...SLUGS].map((slug) => `${slug}.svg`).sort()
    );
    for (const slug of SLUGS) {
      const file = join(SVG_DIR, `${slug}.svg`);
      expect(existsSync(file)).toBe(true);
      const svg = readFileSync(file, "utf8");
      expect(svg).toContain('width="1200"');
      expect(svg).toContain('height="630"');
      expect(svg).toContain('viewBox="0 0 1200 630"');
      expect(svg).toContain("#09091c");
      expect(svg).toContain("galaxiamea.com");
      expect(svg).not.toContain("\u2014");
    }
  });
});

describe("20260915013000_blog_hero_image_urls.sql", () => {
  const sql = readFileSync(MIGRATION, "utf8");

  it("creates the public SVG-only blog-images bucket and sets every published hero URL", () => {
    expect(sql).toContain("'blog-images'");
    expect(sql).toContain("image/svg+xml");
    expect(sql).toContain("concat(");
    expect(sql).toContain("storage/v1/object/public/blog-images/");
    for (const slug of SLUGS) {
      expect(sql).toContain(`'${slug}'`);
    }
    expect(sql).not.toContain("\u2014");
  });
});

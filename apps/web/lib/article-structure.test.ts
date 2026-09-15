import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ARTICLE_TOC_LABEL,
  MID_CTA_MARKER,
  MID_POST_CTA_COPY,
  READ_NEXT_LABEL,
  extractH2Headings,
  injectMidPostCtaMarker,
  midPostCtaHref,
  pickRelatedPosts,
  uniqueHeadingId
} from "./article-structure";

const REPO_ROOT = join(__dirname, "..", "..", "..");
const SLUG_PAGE = join(REPO_ROOT, "apps/web/app/[slug]/page.tsx");
const CARD = join(REPO_ROOT, "apps/web/components/blog/blog-post-card.tsx");
const CSS = join(REPO_ROOT, "apps/web/app/globals.css");

describe("uniqueHeadingId / extractH2Headings", () => {
  it("slugifies h2 text and suffixes duplicates the way GitHub does", () => {
    const seen = new Map<string, number>();
    expect(uniqueHeadingId("Reading yours", seen)).toBe("reading-yours");
    expect(uniqueHeadingId("Reading yours", seen)).toBe("reading-yours-1");
  });

  it("reads ## headings only, strips markdown, and ignores ### and fenced lines", () => {
    const md = [
      "# Title",
      "",
      "Intro.",
      "",
      "## What a synastry chart is",
      "",
      "Body.",
      "",
      "### Nested",
      "",
      "```",
      "## not a heading",
      "```",
      "",
      "## [Linked heading](/chart)",
      "",
      "## What a synastry chart is"
    ].join("\n");
    expect(extractH2Headings(md)).toEqual([
      { text: "What a synastry chart is", id: "what-a-synastry-chart-is" },
      { text: "Linked heading", id: "linked-heading" },
      { text: "What a synastry chart is", id: "what-a-synastry-chart-is-1" }
    ]);
  });
});

describe("injectMidPostCtaMarker", () => {
  it("inserts after the h2 closest to the document midpoint", () => {
    const md = [
      "Lead paragraph about the topic.",
      "",
      "## First heading",
      "",
      `${"word ".repeat(40)}`,
      "",
      "## Middle heading",
      "",
      `${"word ".repeat(40)}`,
      "",
      "## Last heading",
      "",
      `${"word ".repeat(40)}`
    ].join("\n");
    const out = injectMidPostCtaMarker(md);
    const middleAt = out.indexOf("## Middle heading");
    const markerAt = out.indexOf(MID_CTA_MARKER);
    const lastAt = out.indexOf("## Last heading");
    expect(markerAt).toBeGreaterThan(middleAt);
    expect(markerAt).toBeLessThan(lastAt);
  });

  it("falls back to the 50% word-count paragraph when there is no midpoint h2", () => {
    const first = Array.from({ length: 40 }, () => "alpha").join(" ");
    const second = Array.from({ length: 40 }, () => "bravo").join(" ");
    const md = `${first}\n\n${second}`;
    const out = injectMidPostCtaMarker(md);
    expect(out).toBe(`${first}\n\n${MID_CTA_MARKER}\n\n${second}`);
  });

  it("does not double-insert when the marker is already present", () => {
    const md = `Hello.\n\n${MID_CTA_MARKER}\n\nWorld.`;
    expect(injectMidPostCtaMarker(md)).toBe(md);
  });
});

describe("pickRelatedPosts", () => {
  const posts = [
    { slug: "a", category: "guides" as const, publishedAt: "2026-09-14T00:00:00Z" },
    { slug: "b", category: "guides" as const, publishedAt: "2026-09-10T00:00:00Z" },
    { slug: "c", category: "guides" as const, publishedAt: "2026-09-01T00:00:00Z" },
    { slug: "d", category: "debunked" as const, publishedAt: "2026-09-13T00:00:00Z" },
    { slug: "e", category: "debunked" as const, publishedAt: "2026-08-01T00:00:00Z" }
  ];

  it("takes two newer same-category posts and excludes the current slug", () => {
    expect(pickRelatedPosts(posts, { slug: "a", category: "guides" }).map((p) => p.slug)).toEqual(["b", "c"]);
  });

  it("fills from the other category when the same category has fewer than two", () => {
    expect(pickRelatedPosts(posts, { slug: "d", category: "debunked" }).map((p) => p.slug)).toEqual(["e", "a"]);
  });
});

describe("midPostCtaHref", () => {
  it("sends guides to /chart and debunked to /chart/compare", () => {
    expect(midPostCtaHref("guides")).toBe("/chart");
    expect(midPostCtaHref("debunked")).toBe("/chart/compare");
  });
});

describe("authored chrome strings", () => {
  it("tags FOUNDER-REVIEW copy and never uses U+2014", () => {
    const src = readFileSync(join(__dirname, "article-structure.ts"), "utf8");
    expect(src).toContain("FOUNDER-REVIEW");
    expect(ARTICLE_TOC_LABEL).toBe("In this piece");
    expect(READ_NEXT_LABEL).toBe("Read next");
    expect(MID_POST_CTA_COPY).toBe("See how this plays out in your own chart");
    expect(ARTICLE_TOC_LABEL).not.toContain("\u2014");
    expect(READ_NEXT_LABEL).not.toContain("\u2014");
    expect(MID_POST_CTA_COPY).not.toContain("\u2014");
    expect(src).not.toContain("\u2014");
  });
});

describe("post template wiring", () => {
  const page = readFileSync(SLUG_PAGE, "utf8");
  const card = readFileSync(CARD, "utf8");
  const css = readFileSync(CSS, "utf8");

  it("renders the hero below the title and before the byline, with CLS-safe 1200x630 sizing", () => {
    expect(page.indexOf("article-title")).toBeLessThan(page.indexOf("article-hero"));
    expect(page.indexOf("article-hero")).toBeLessThan(page.indexOf("article-byline"));
    expect(page).toContain("width={1200}");
    expect(page).toContain("height={630}");
    expect(css).toMatch(
      /\.article-hero img \{[\s\S]*max-width:\s*100%;[\s\S]*aspect-ratio:\s*1200\s*\/\s*630/
    );
  });

  it("renders byline, date, and read time on the post page itself", () => {
    expect(page).toContain("article-byline");
    expect(page).toContain("formatPostDate");
    expect(page).toContain("readTimeMinutes");
    expect(page).toContain("min read");
    expect(page).toContain("FOUNDER-REVIEW");
  });

  it("renders In this piece from h2s when read time is at least 5, and Read next before the bottom CTA", () => {
    expect(page).toContain("ARTICLE_TOC_LABEL");
    expect(page).toContain("extractH2Headings");
    expect(page).toContain("readTimeMinutes >= 5");
    expect(page).toContain("READ_NEXT_LABEL");
    expect(page).toContain("pickRelatedPosts");
    expect(page).toContain("variant=\"related\"");
    expect(page.indexOf("article-read-next")).toBeLessThan(page.indexOf("article-cta"));
  });

  it("places the chart-reading capture after the article body and before Read next", () => {
    expect(page).toContain("ChartReadingCapture");
    expect(page.indexOf("ArticleMarkdown")).toBeLessThan(page.indexOf("ChartReadingCapture"));
    expect(page.indexOf("ChartReadingCapture")).toBeLessThan(page.indexOf("article-read-next"));
  });

  it("injects the mid-post CTA through ArticleMarkdown, not the stored body", () => {
    expect(page).toContain("midCtaHref={midPostCtaHref(post.category)}");
    expect(page).not.toContain(MID_CTA_MARKER);
  });

  it("related cards hide author, date, and read time", () => {
    expect(card).toContain('variant?: "index" | "related"');
    expect(card).toContain('variant !== "related"');
    expect(card).toContain("blog-post-card-meta");
  });

  it("shrinks the post title on desktop only, leaving the mobile auth-title clamp in place", () => {
    expect(css).toMatch(/@media \(min-width: 768px\) \{[\s\S]*h1\.article-title \{[\s\S]*font-size: 2\.25rem;/);
    const mobileBlock = css.match(/@media \(max-width: 480px\) \{[\s\S]*?\.article-page[\s\S]*?\n\}/)?.[0] ?? "";
    expect(mobileBlock).not.toMatch(/article-title[^}]*font-size/);
  });
});

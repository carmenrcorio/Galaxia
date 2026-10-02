import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ArticleDiagram, FIGURE_TEXT_DESCRIPTION_LABEL } from "../components/blog/article-diagram";
import { ArticleMarkdown } from "../components/blog/article-markdown";
import { FIGURE_MARKER, insertFigureAfterHeading } from "./article-structure";
import { buildArticleJsonLd } from "./blog-article-json-ld";
import { absolutePostImageUrl, buildPostMetadata } from "./blog-metadata";

const REPO_ROOT = join(__dirname, "..", "..", "..");
const POSTS_SQL = join(REPO_ROOT, "supabase/migrations/20260929174016_seo_blog_nine_posts.sql");
const DATE_SQL = join(REPO_ROOT, "supabase/migrations/20260929210633_publish_whole_sign_and_date_seo_posts.sql");
const COLUMNS_SQL = join(REPO_ROOT, "supabase/migrations/20260929210745_blog_post_hero_and_figure_images.sql");
const URLS_SQL = join(REPO_ROOT, "supabase/migrations/20260929210958_blog_post_image_urls.sql");
const PUBLIC_BLOG = join(REPO_ROOT, "apps/web/public/blog");

const PLACEMENT: Record<string, { n?: number; heading: string }> = {
  "uranus-retrograde-gemini-2026-relationships": { n: 1, heading: 'Why "for your sign" is the wrong unit' },
  "neptune-in-synastry-meaning": { n: 2, heading: "The mechanism: projection, not magic" },
  "venus-retrograde-2026-relationships": { n: 3, heading: "A gentle 41-day approach" },
  "how-people-used-astrology-what-they-got-right-and-wrong": { n: 4, heading: "A short history of how it was used" },
  "synastry-vs-composite-chart": { n: 5, heading: "Composite: the relationship as its own entity" },
  "moon-sign-in-relationships": { n: 6, heading: "A quick tour by element" },
  "whole-sign-houses-explained": { heading: "How Whole Sign houses work" },
  "mercury-retrograde-relationships-2026": { n: 8, heading: "Practical habits for the window" },
  "chart-without-birth-time": { n: 9, heading: "What stays reliable" }
};

function dollar(sql: string, tag: string): string {
  const open = `$${tag}$`;
  const start = sql.indexOf(open);
  expect(start, `missing $${tag}$`).toBeGreaterThanOrEqual(0);
  const innerStart = start + open.length;
  const end = sql.indexOf(open, innerStart);
  expect(end, `unclosed $${tag}$`).toBeGreaterThan(innerStart);
  return sql.slice(innerStart, end);
}

function htmlText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/</g, "&lt;");
}

function pngSize(path: string): { width: number; height: number } {
  const buf = readFileSync(path);
  expect(buf.toString("ascii", 1, 4)).toBe("PNG");
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function bodyFor(slug: string, postsSql: string, dateSql: string): string {
  if (slug === "whole-sign-houses-explained") return dollar(dateSql, "body_ws");
  const n = PLACEMENT[slug]?.n;
  expect(n, slug).toBeTypeOf("number");
  return dollar(postsSql, `body_p${n}`);
}

describe("SEO post dates and Whole Sign publish", () => {
  const sql = readFileSync(DATE_SQL, "utf8");

  it("dates the eight live posts to 2026-09-29 and inserts Whole Sign as written", () => {
    expect(sql).not.toContain("\u2014");
    expect(sql).toContain("timestamptz '2026-09-29 12:00:00+00'");
    expect(sql).toContain("-- FOUNDER-REVIEW: authored whole-sign title, dek, body.");
    expect(sql).toMatch(/on conflict \(slug\) do update set/i);
    const body = dollar(sql, "body_ws");
    expect(body).not.toContain("FOUNDER-REVIEW");
    expect(body).not.toContain("\u2014");
    expect(body).toContain("## How Whole Sign houses work");
    expect(body).toContain("](/chart)");
    expect(body).toContain("](/chart-without-birth-time)");
    expect(dollar(sql, "title_ws")).toContain("Whole Sign Houses Explained");
    expect(sql).toContain("'guides'");
    expect(sql).toContain("'published'");
    expect(sql).toContain("\n  3,\n");
    for (const slug of Object.keys(PLACEMENT)) {
      expect(sql).toContain(`'${slug}'`);
    }
  });
});

describe("blog hero and figure images", () => {
  const urls = readFileSync(URLS_SQL, "utf8");
  const columns = readFileSync(COLUMNS_SQL, "utf8");
  const postsSql = readFileSync(POSTS_SQL, "utf8");
  const dateSql = readFileSync(DATE_SQL, "utf8");

  it("adds nullable text columns and refuses to store svg paths", () => {
    expect(columns).toContain("add column if not exists hero_image_alt text");
    expect(columns).toContain("add column if not exists figure_long_description text");
    expect(columns).not.toContain(".svg");
    expect(urls).not.toContain(".svg");
    expect(urls).not.toContain("\u2014");
  });

  it("fails when a post image is missing alt, caption, or a long description", () => {
    expect(renderToStaticMarkup(createElement(ArticleDiagram, {
      src: "/blog/example/figure.png",
      alt: "",
      caption: "Caption",
      longDescription: "A long description.",
      width: 1200,
      height: 700
    }))).toBe("");
    expect(renderToStaticMarkup(createElement(ArticleDiagram, {
      src: "/blog/example/figure.png",
      alt: "Alt",
      caption: " ",
      longDescription: "A long description.",
      width: 1200,
      height: 700
    }))).toBe("");
    const html = renderToStaticMarkup(createElement(ArticleDiagram, {
      src: "/blog/example/figure.png",
      alt: "Diagram alt",
      caption: "Diagram caption",
      longDescription: "Diagram long description.",
      width: 1200,
      height: 700
    }));
    expect(html).toContain('alt="Diagram alt"');
    expect(html).toContain('width="1200"');
    expect(html).toContain('height="700"');
    expect(html).toContain('loading="lazy"');
    expect(html).toContain("<figcaption>Diagram caption</figcaption>");
    expect(html).toContain(`<summary>${FIGURE_TEXT_DESCRIPTION_LABEL}</summary>`);
    expect(html).toContain('<details class="article-diagram-description">');
    expect(html).not.toMatch(/<details[^>]*\sopen/);
    expect(html).toContain("Diagram long description.");
    expect(FIGURE_TEXT_DESCRIPTION_LABEL).not.toContain("\u2014");
    const css = readFileSync(join(REPO_ROOT, "apps/web/app/globals.css"), "utf8");
    expect(css).toContain(".article-diagram-description summary");
    expect(css).toContain("color: var(--cream)");
    expect(css).toContain("color-scheme: dark");
    expect(css).toMatch(/\.article-diagram-description summary:focus-visible \{[\s\S]*outline: 2px solid var\(--gold\)/);
  });

  it("copies manifest text onto every slug and places the figure after the named section", () => {
    const page = readFileSync(join(REPO_ROOT, "apps/web/app/[slug]/page.tsx"), "utf8");
    const hero = readFileSync(join(REPO_ROOT, "apps/web/components/blog/article-hero.tsx"), "utf8");
    expect(hero).toContain("width={1600}");
    expect(hero).toContain("height={840}");
    expect(hero).toContain("priority");
    expect(page).toContain("insertFigureAfterHeading");

    for (const [slug, spec] of Object.entries(PLACEMENT)) {
      const tag = slug.replace(/-/g, "_");
      const heroAlt = dollar(urls, `heroAlt_${tag}`);
      const figureAlt = dollar(urls, `figAlt_${tag}`);
      const caption = dollar(urls, `caption_${tag}`);
      const longDescription = dollar(urls, `longDesc_${tag}`);
      const heading = dollar(urls, `heading_${tag}`);
      expect(heroAlt.length, slug).toBeGreaterThan(10);
      expect(figureAlt.length, slug).toBeGreaterThan(10);
      expect(caption.length, slug).toBeGreaterThan(10);
      expect(longDescription.length, slug).toBeGreaterThan(10);
      expect(heading).toBe(spec.heading);
      expect(urls).toContain(`hero_image_url = '/blog/${slug}/hero.png'`);
      expect(urls).toContain(`figure_image_url = '/blog/${slug}/figure.png'`);

      const hero = pngSize(join(PUBLIC_BLOG, slug, "hero.png"));
      const figure = pngSize(join(PUBLIC_BLOG, slug, "figure.png"));
      expect(hero).toEqual({ width: 1600, height: 840 });
      expect(figure).toEqual({ width: 1200, height: 700 });
      expect(existsSync(join(PUBLIC_BLOG, slug, "hero.svg"))).toBe(false);
      expect(existsSync(join(PUBLIC_BLOG, slug, "figure.svg"))).toBe(false);

      const body = bodyFor(slug, postsSql, dateSql);
      const placed = insertFigureAfterHeading(body, heading);
      expect(placed.placement, slug).toBe("named");
      expect(placed.markdown).toContain(FIGURE_MARKER);
      const html = renderToStaticMarkup(createElement(ArticleMarkdown, {
        children: placed.markdown,
        figure: createElement(ArticleDiagram, {
          src: `/blog/${slug}/figure.png`,
          alt: figureAlt,
          caption,
          longDescription,
          width: 1200,
          height: 700
        })
      }));
      expect(html, slug).toContain(`alt="${htmlText(figureAlt)}"`);
      expect(html, slug).toContain(`<figcaption>${htmlText(caption)}</figcaption>`);
      const headingAt = html.indexOf(htmlText(spec.heading));
      const figureAt = html.indexOf("<figure");
      expect(headingAt, slug).toBeGreaterThanOrEqual(0);
      expect(figureAt, slug).toBeGreaterThan(headingAt);
      const nextHeading = body.split(`## ${spec.heading}`)[1]?.split("\n## ")[1];
      if (nextHeading) {
        const nextText = nextHeading.split("\n")[0] ?? "";
        expect(html.indexOf(htmlText(nextText)), slug).toBeGreaterThan(figureAt);
      }
    }
  });

  it("falls back to the first section when the named heading is missing", () => {
    const body = "## First section\n\nAlpha.\n\n## Second section\n\nBeta.\n";
    const placed = insertFigureAfterHeading(body, "Not a heading");
    expect(placed.placement).toBe("first-h2");
    expect(placed.markdown.indexOf(FIGURE_MARKER)).toBeLessThan(placed.markdown.indexOf("## Second section"));
    expect(placed.markdown.indexOf("Alpha.")).toBeLessThan(placed.markdown.indexOf(FIGURE_MARKER));
  });

  it("does not render figure images with unsafe src schemes", () => {
    expect(
      renderToStaticMarkup(
        createElement(ArticleDiagram, {
          src: "http://example.com/figure.png",
          alt: "Alt",
          caption: "Caption",
          longDescription: "Long.",
          width: 1200,
          height: 700
        })
      )
    ).toBe("");
  });

  it("sets an absolute hero on Open Graph, Twitter, and Article JSON-LD", () => {
    const url = "/blog/synastry-vs-composite-chart/hero.png";
    const alt = "Decorative illustration: two overlapping outlined circles.";
    expect(absolutePostImageUrl(url)).toBe(`https://galaxiamea.com${url}`);
    const meta = buildPostMetadata({
      slug: "synastry-vs-composite-chart",
      title: "Title",
      dek: "Dek",
      heroImageUrl: url,
      heroImageAlt: alt
    });
    expect(meta.openGraph?.images).toEqual([{ url: `https://galaxiamea.com${url}`, alt, width: 1600, height: 840 }]);
    expect(meta.twitter?.images).toEqual(meta.openGraph?.images);
    const jsonLd = buildArticleJsonLd({
      slug: "synastry-vs-composite-chart",
      title: "Title",
      publishedAt: "2026-09-29T12:00:00.000Z",
      updatedAt: "2026-09-29T12:00:00.000Z",
      heroImageUrl: url
    });
    expect(jsonLd.image).toBe(`https://galaxiamea.com${url}`);
  });
});

import { describe, expect, it } from "vitest";
import { buildCategoryMetadata, buildPostMetadata, SITE_OG_IMAGE } from "./blog-metadata";

describe("buildPostMetadata", () => {
  it("emits alternates.canonical matching the slug at the top-level path (no /blog/ prefix)", () => {
    const meta = buildPostMetadata({
      slug: "synastry-chart-meaning",
      title: "What a Synastry Chart Tells You About Your Relationship",
      dek: "A dek.",
      heroImageUrl: null
    });
    expect(meta.alternates?.canonical).toBe("/synastry-chart-meaning");
    expect(meta.alternates?.canonical).not.toMatch(/^\/blog\//);
    expect(meta.openGraph?.url).toBe("/synastry-chart-meaning");
  });

  it("canonicalises every live slug to its rendered path", () => {
    for (const slug of [
      "nobody-has-your-grandmother",
      "sun-sign-not-personality",
      "synastry-aspects-explained",
      "synastry-chart-meaning"
    ]) {
      const meta = buildPostMetadata({
        slug,
        title: "Title",
        dek: "Dek",
        heroImageUrl: null
      });
      expect(meta.alternates?.canonical).toBe(`/${slug}`);
    }
  });

  it("falls back to the site OG image when the post has no hero", () => {
    const meta = buildPostMetadata({
      slug: "synastry-chart-meaning",
      title: "Title",
      dek: "Dek",
      heroImageUrl: null
    });
    expect(meta.openGraph?.images).toEqual([SITE_OG_IMAGE]);
    expect(meta.twitter?.images).toEqual([SITE_OG_IMAGE]);
  });

  it("prefers the post hero image when one is set", () => {
    const meta = buildPostMetadata({
      slug: "synastry-chart-meaning",
      title: "Title",
      dek: "Dek",
      heroImageUrl: "https://example.com/hero.png"
    });
    expect(meta.openGraph?.images).toEqual([{ url: "https://example.com/hero.png", alt: "Title" }]);
  });
});

describe("buildCategoryMetadata", () => {
  it("includes an OG image on openGraph and twitter so the root default is not dropped", () => {
    const meta = buildCategoryMetadata({ slug: "guides", label: "Guides" });
    expect(meta.openGraph?.images).toEqual([SITE_OG_IMAGE]);
    expect(meta.twitter?.images).toEqual([SITE_OG_IMAGE]);
    expect(JSON.stringify(meta.openGraph?.images)).toContain("/og-image.png");
  });

  it("keeps the category canonical under /blog/{slug}", () => {
    const meta = buildCategoryMetadata({ slug: "debunked", label: "Astrology, debunked" });
    expect(meta.alternates?.canonical).toBe("/blog/debunked");
  });
});

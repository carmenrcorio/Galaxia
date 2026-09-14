import { describe, expect, it } from "vitest";
import { buildArticleJsonLd } from "./blog-article-json-ld";

const POST = {
  slug: "what-a-chart-cannot-tell-you",
  title: "What a Chart Cannot Tell You",
  publishedAt: "2026-09-14T13:00:00Z",
  updatedAt: "2026-09-14T13:00:00Z"
};

describe("buildArticleJsonLd", () => {
  it("emits Article JSON-LD with a top-level canonical, never a /blog/ path", () => {
    const jsonLd = buildArticleJsonLd(POST);
    expect(jsonLd["@context"]).toBe("https://schema.org");
    expect(jsonLd["@type"]).toBe("Article");
    expect(jsonLd.headline).toBe(POST.title);
    expect(jsonLd.datePublished).toBe(POST.publishedAt);
    expect(jsonLd.dateModified).toBe(POST.updatedAt);
    expect(jsonLd.author).toEqual({ "@type": "Organization", name: "Galaxia" });
    expect(jsonLd.publisher).toEqual({
      "@type": "Organization",
      name: "Galaxia",
      url: "https://galaxiamea.com"
    });
    expect(jsonLd.mainEntityOfPage).toEqual({
      "@type": "WebPage",
      "@id": "https://galaxiamea.com/what-a-chart-cannot-tell-you"
    });
    const id = (jsonLd.mainEntityOfPage as { "@id": string })["@id"];
    expect(id).not.toContain("/blog/");
  });

  it("falls back to updatedAt when publishedAt is null", () => {
    const jsonLd = buildArticleJsonLd({ ...POST, publishedAt: null, updatedAt: "2026-09-15T00:00:00Z" });
    expect(jsonLd.datePublished).toBe("2026-09-15T00:00:00Z");
  });

  it("canonicalises every F10 slug to https://galaxiamea.com/{slug}", () => {
    for (const slug of [
      "mothers-moon-sign-apology",
      "colleague-you-cannot-read",
      "moon-square-saturn-parent-child",
      "what-a-chart-cannot-tell-you",
      "reading-chart-of-someone-who-died",
      "compatibility-scores-wrong-question"
    ]) {
      const jsonLd = buildArticleJsonLd({ ...POST, slug });
      expect(jsonLd.mainEntityOfPage).toMatchObject({
        "@id": `https://galaxiamea.com/${slug}`
      });
    }
  });
});

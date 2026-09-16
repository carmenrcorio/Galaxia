import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  GLOSSARY_DESCRIPTION,
  GLOSSARY_LEDE,
  GLOSSARY_TERMS,
  GLOSSARY_TITLE,
  groupGlossaryByLetter,
} from "./glossary-terms";
import { RELATED_LINKS } from "./nav-links";

const REPO_ROOT = join(__dirname, "..", "..", "..");

function read(path: string): string {
  return readFileSync(join(REPO_ROOT, path), "utf8");
}

const PAGE = "apps/web/app/glossary/page.tsx";

function sentenceCount(text: string): number {
  return (text.match(/[.!?](?:\s|$)/g) ?? []).length;
}

describe("/glossary metadata", () => {
  it("exports the title, a short description, and a self canonical", () => {
    const src = read(PAGE);
    expect(GLOSSARY_TITLE).toBe("Astrology terms, plainly defined");
    expect(GLOSSARY_DESCRIPTION.length).toBeLessThan(155);
    expect(GLOSSARY_DESCRIPTION).toMatch(/natal chart/i);
    expect(GLOSSARY_DESCRIPTION).toMatch(/synastry/i);
    expect(GLOSSARY_LEDE).toMatch(/Not a prediction/);
    expect(src).toMatch(/alternates:\s*\{\s*canonical:\s*"\/glossary"/);
    expect(src).toContain('url: "/glossary"');
  });

  it("renders WebPage JSON-LD with the same title, description, and path", () => {
    expect(read(PAGE)).toContain(
      'WebPageJsonLd path="/glossary" name={TITLE} description={DESCRIPTION}',
    );
  });

  it("is a static server page: no client directive, no cookies, no posts fetch", () => {
    const src = read(PAGE);
    expect(src.startsWith('"use client"')).toBe(false);
    expect(src).not.toMatch(/cookies\(/);
    expect(src).not.toMatch(/getPublishedPosts/);
    expect(src).not.toMatch(/createSupabaseServerClient/);
  });
});

describe("glossary term list", () => {
  it("holds 30 to 40 terms with unique kebab ids matching the heading slug", () => {
    expect(GLOSSARY_TERMS.length).toBeGreaterThanOrEqual(30);
    expect(GLOSSARY_TERMS.length).toBeLessThanOrEqual(40);
    const ids = GLOSSARY_TERMS.map((t) => t.id);
    expect(new Set(ids).size).toBe(GLOSSARY_TERMS.length);
    for (const item of GLOSSARY_TERMS) {
      expect(item.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    }
  });

  it("groups alphabetically by first letter for h2 sections", () => {
    const groups = groupGlossaryByLetter();
    const letters = groups.map((g) => g.letter);
    expect(letters).toEqual([...letters].sort());
    const flattened = groups.flatMap((g) => g.terms.map((t) => t.term));
    expect(flattened).toEqual([...flattened].sort((a, b) => a.localeCompare(b, "en")));
    expect(groups[0]?.letter).toBe("A");
    expect(groups.some((g) => g.letter === "S")).toBe(true);
  });

  it("authors 2-3 sentence definitions in the app register, never apologetic or predictive", () => {
    for (const item of GLOSSARY_TERMS) {
      const n = sentenceCount(item.definition);
      expect(n, `${item.term} has ${n} sentences`).toBeGreaterThanOrEqual(2);
      expect(n, `${item.term} has ${n} sentences`).toBeLessThanOrEqual(3);
      expect(item.definition).not.toContain("\u2014");
      expect(item.definition).not.toMatch(/In astrology/i);
      expect(item.definition).not.toMatch(/believed to/i);
      expect(item.definition).not.toMatch(/\bYour /);
      expect(item.definition).not.toMatch(/\bwill happen\b/i);
      expect(item.definition).not.toMatch(/\bpredicts?\b/i);
    }
  });

  it("links read-more to a published post where one covers the term in depth", () => {
    const withReadMore = GLOSSARY_TERMS.filter((t) => t.readMore);
    expect(withReadMore.length).toBeGreaterThan(20);
    for (const item of withReadMore) {
      expect(item.readMore?.slug).toMatch(/^[a-z0-9-]+$/);
      expect(item.readMore?.title.length).toBeGreaterThan(8);
    }
    expect(GLOSSARY_TERMS.find((t) => t.id === "synastry")?.readMore?.slug).toBe(
      "synastry-chart-meaning",
    );
    expect(GLOSSARY_TERMS.find((t) => t.id === "moon-sign")?.readMore?.slug).toBe(
      "mothers-moon-sign-apology",
    );
    for (const item of GLOSSARY_TERMS) {
      if (item.readMore?.slug === "synastry-aspects-explained") {
        expect(item.readMore.title).toBe(
          "7 Synastry Aspects That Reveal How Relationships Feel",
        );
        expect(item.readMore.title).not.toMatch(/predict/i);
      }
    }
  });

  it("renders each term as an h3 with id={term-slug} and a Read more line when present", () => {
    const src = read(PAGE);
    expect(src).toContain("id={item.id}");
    expect(src).toContain("glossary-term-h3");
    expect(src).toContain("Read more:");
    expect(src).toContain("`/${item.readMore.slug}`");
  });
});

describe("/glossary related links and voice", () => {
  it("points at blog, chart, and the synastry guide", () => {
    expect(RELATED_LINKS.glossary.map((l) => l.href)).toEqual([
      "/blog",
      "/chart",
      "/synastry-chart-meaning",
    ]);
  });

  it("keeps astrology in the title (layer two)", () => {
    expect(GLOSSARY_TITLE.toLowerCase().startsWith("astrology")).toBe(true);
  });
});

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ArticleMarkdown } from "../components/blog/article-markdown";
import { extractH2Headings } from "./article-structure";

const REPO_ROOT = join(__dirname, "..", "..", "..");

describe("ArticleMarkdown — image paragraphs", () => {
  it("does not wrap a standalone markdown image in <p>, so <figure> is not nested in <p>", () => {
    const html = renderToStaticMarkup(
      createElement(ArticleMarkdown, {
        children: "Lead paragraph.\n\n![Flows and catches](/synastry-flows-catches.png)\n\nClosing paragraph."
      })
    );
    expect(html).toContain('<p class="article-p">Lead paragraph.</p>');
    expect(html).toContain('<figure class="article-figure"><img src="/synastry-flows-catches.png" alt="Flows and catches"/></figure>');
    expect(html).not.toMatch(/<p[^>]*>\s*<figure/);
    expect(html).toContain('<p class="article-p">Closing paragraph.</p>');
  });

  it("still wraps ordinary text in <p class=\"article-p\">", () => {
    const html = renderToStaticMarkup(createElement(ArticleMarkdown, { children: "Just text." }));
    expect(html).toBe('<p class="article-p">Just text.</p>');
  });

  it("is what the post template actually renders", () => {
    const src = readFileSync(join(REPO_ROOT, "apps/web/app/[slug]/page.tsx"), "utf8");
    expect(src).toContain("ArticleMarkdown");
    expect(src).not.toMatch(/p:\s*\(\{\s*children\s*\}\)\s*=>\s*<p className="article-p">/);
  });
});

describe("ArticleMarkdown — heading ids and mid-post CTA", () => {
  it("adds matching ids to h2 headings so TOC jump links resolve", () => {
    const html = renderToStaticMarkup(
      createElement(ArticleMarkdown, {
        children: "## Reading yours\n\nBody copy.\n\n## Reading yours"
      })
    );
    expect(html).toContain('<h2 id="reading-yours" class="article-h2">Reading yours</h2>');
    expect(html).toContain('<h2 id="reading-yours-1" class="article-h2">Reading yours</h2>');
  });

  it("injects the mid-post CTA in the renderer, never as a visible marker", () => {
    const html = renderToStaticMarkup(
      createElement(ArticleMarkdown, {
        children: "Lead paragraph about the reading.\n\n## First heading\n\nMore words here that fill the first half of the piece so the midpoint is real.\n\n## Middle heading\n\nSecond half of the piece continues after the injected call to action.\n\n## Last heading\n\nClosing words.",
        midCtaHref: "/chart"
      })
    );
    expect(html).toContain('class="article-mid-cta"');
    expect(html).toContain('href="/chart"');
    expect(html).toContain("See how this plays out in your own chart");
    expect(html).toContain("→");
    expect(html).not.toContain("%%GALAXIA_MID_CTA%%");
  });

  it("does not add ids to markdown h3s even though they still render as h2 visually", () => {
    const html = renderToStaticMarkup(
      createElement(ArticleMarkdown, { children: "### Nested still\n\nBody." })
    );
    expect(html).toContain('<h2 class="article-h2">Nested still</h2>');
    expect(html).not.toContain("id=");
  });

  it("matches extractH2Headings ids on the synastry-aspects heading set", () => {
    const md = [
      "## 1. Venus conjunct Mars",
      "",
      "x",
      "",
      "## 2. Moon conjunct Moon",
      "",
      "x",
      "",
      "## 3. Moon square Saturn",
      "",
      "x",
      "",
      "## 4. Sun trine Sun",
      "",
      "x",
      "",
      "## 5. Mercury conjunct Mercury",
      "",
      "x",
      "",
      "## 6. Venus square Pluto",
      "",
      "x",
      "",
      "## 7. North Node conjunct personal planet",
      "",
      "x",
      "",
      "## These seven are the beginning, not the whole chart"
    ].join("\n");
    const html = renderToStaticMarkup(createElement(ArticleMarkdown, { children: md }));
    for (const heading of extractH2Headings(md)) {
      expect(html).toContain(`<h2 id="${heading.id}" class="article-h2">${heading.text}</h2>`);
    }
  });
});

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ArticleMarkdown } from "../components/blog/article-markdown";

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

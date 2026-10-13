import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const CSS = readFileSync(join(__dirname, "..", "app", "globals.css"), "utf8");

describe("CLS reservation guards", () => {
  it("blog card thumbnails reserve 16:9 before images decode", () => {
    expect(CSS).toMatch(/\.blog-post-card-thumb \{[\s\S]*?aspect-ratio: 16 \/ 9;/);
  });

  it("article hero figure reserves aspect ratio on the frame", () => {
    expect(CSS).toMatch(/\.article-hero \{[\s\S]*?aspect-ratio: 1200 \/ 630;/);
  });

  it("person profile loading shell reserves vertical space", () => {
    expect(CSS).toContain(".app-content--loading");
    expect(CSS).toMatch(/\.app-content--loading \{[\s\S]*?min-height: 72vh;/);
  });
});

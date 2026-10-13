import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const BLOG_SRC = readFileSync(join(__dirname, "blog.ts"), "utf8");

describe("blog listing queries stay lightweight", () => {
  it("POST_LIST_FIELDS never selects markdown body or figure columns", () => {
    expect(BLOG_SRC).toContain("POST_LIST_FIELDS_BASE");
    expect(BLOG_SRC).not.toMatch(/POST_LIST_FIELDS[^=]*=.*\bbody\b/);
    expect(BLOG_SRC).not.toMatch(/POST_LIST_FIELDS[^=]*=.*figure_/);
    expect(BLOG_SRC).not.toMatch(/POST_LIST_FIELDS[^=]*=.*inline_images/);
  });

  it("getPublishedPosts maps listing rows, not full PostRow bodies", () => {
    expect(BLOG_SRC).toContain("fetchPublishedListingRows");
    expect(BLOG_SRC).toContain("toBlogPostListing");
    expect(BLOG_SRC).toMatch(/getPublishedPosts\(\): Promise<BlogPostListing\[\]>/);
  });
});

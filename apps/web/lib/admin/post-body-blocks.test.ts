import { describe, expect, it } from "vitest";
import {
  BODY_WORD_WARN_LIMIT,
  countBodyWords,
  insertImageAfter,
  markdownImageLine,
  moveBlock,
  parseBodyBlocks,
  parseImageLine,
  removeBlock,
  serializeBodyBlocks,
  shouldWarnBeforeBodySave
} from "./post-body-blocks";

const SAMPLE = `## A heading

First paragraph.

![Moon](https://example.test/moon.png)

Second paragraph.`;

describe("parseImageLine / markdownImageLine", () => {
  it("reads alt and url from a markdown image line", () => {
    expect(parseImageLine("![Moon](https://example.test/moon.png)")).toEqual({
      alt: "Moon",
      url: "https://example.test/moon.png"
    });
  });

  it("ignores a non-image line", () => {
    expect(parseImageLine("Just a paragraph.")).toBeNull();
  });

  it("writes a markdown image line without brackets in alt", () => {
    expect(markdownImageLine("https://example.test/a.jpg", "photo [1]")).toBe(
      "![photo 1](https://example.test/a.jpg)"
    );
  });
});

describe("parseBodyBlocks / serializeBodyBlocks", () => {
  it("splits headings, paragraphs, and markdown images into blocks", () => {
    const blocks = parseBodyBlocks(SAMPLE);
    expect(blocks.map((block) => block.kind)).toEqual(["heading", "text", "image", "text"]);
    expect(blocks[2]?.url).toBe("https://example.test/moon.png");
    expect(blocks[2]?.alt).toBe("Moon");
    expect(serializeBodyBlocks(blocks)).toBe(SAMPLE);
  });

  it("treats an image line inside a paragraph run as its own block", () => {
    const blocks = parseBodyBlocks("before\n![x](https://example.test/x.png)\nafter");
    expect(blocks.map((block) => block.kind)).toEqual(["text", "image", "text"]);
  });

  it("returns no blocks for empty body", () => {
    expect(parseBodyBlocks("")).toEqual([]);
    expect(parseBodyBlocks("   \n\n  ")).toEqual([]);
  });
});

describe("insert / remove / move", () => {
  it("inserts a markdown image after the given block and rewrites the body", () => {
    const start = parseBodyBlocks("## H\n\nPara.");
    const next = insertImageAfter(start, 0, "https://example.test/p.jpg", "photo");
    expect(next.map((block) => block.kind)).toEqual(["heading", "image", "text"]);
    expect(serializeBodyBlocks(next)).toBe("## H\n\n![photo](https://example.test/p.jpg)\n\nPara.");
  });

  it("inserts at the start when index is -1", () => {
    const start = parseBodyBlocks("Para.");
    const next = insertImageAfter(start, -1, "https://example.test/p.jpg", "lead");
    expect(next[0]?.kind).toBe("image");
    expect(serializeBodyBlocks(next)).toBe("![lead](https://example.test/p.jpg)\n\nPara.");
  });

  it("removes an image line from the body", () => {
    const start = parseBodyBlocks(SAMPLE);
    const next = removeBlock(start, 2);
    expect(next.map((block) => block.kind)).toEqual(["heading", "text", "text"]);
    expect(serializeBodyBlocks(next)).not.toContain("![Moon]");
  });

  it("reordering rewrites the body with the new order", () => {
    const start = parseBodyBlocks("A\n\nB\n\nC");
    const next = moveBlock(start, 0, 2);
    expect(serializeBodyBlocks(next)).toBe("B\n\nC\n\nA");
  });
});

describe("shouldWarnBeforeBodySave", () => {
  it("does not warn at or under the 10000 word limit", () => {
    const body = Array.from({ length: BODY_WORD_WARN_LIMIT }, () => "word").join(" ");
    expect(countBodyWords(body)).toBe(BODY_WORD_WARN_LIMIT);
    expect(shouldWarnBeforeBodySave(body)).toBe(false);
  });

  it("warns when the rewritten body is over 10000 words", () => {
    const body = Array.from({ length: BODY_WORD_WARN_LIMIT + 1 }, () => "word").join(" ");
    expect(shouldWarnBeforeBodySave(body)).toBe(true);
  });
});

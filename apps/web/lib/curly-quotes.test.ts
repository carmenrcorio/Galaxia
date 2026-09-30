import { describe, expect, it } from "vitest";
import { applyCurlyQuotes } from "./curly-quotes";
import { headingPlainText, insertFigureAfterHeading } from "./article-structure";
import { slugify } from "./slugify";

describe("applyCurlyQuotes", () => {
  it("curls contractions, possessives, and paired quotes, and is idempotent", () => {
    const input = `Don't touch the mother's "sun sign" or a '90s chart.`;
    const once = applyCurlyQuotes(input);
    expect(once).toBe("Don\u2019t touch the mother\u2019s \u201csun sign\u201d or a \u201990s chart.");
    expect(applyCurlyQuotes(once)).toBe(once);
    expect(once).not.toContain("'");
    expect(once).not.toContain('"');
  });

  it("leaves fenced code, inline code, and urls alone", () => {
    const input = [
      "She said \"hello\" and it's fine.",
      "",
      "See [don't](https://example.com/a?q=don't) and `don't` plus https://example.com/b?q=don't",
      "",
      "```",
      'const quote = "straight";',
      "```"
    ].join("\n");
    const out = applyCurlyQuotes(input);
    expect(out).toContain("She said \u201chello\u201d and it\u2019s fine.");
    expect(out).toContain("[don\u2019t](https://example.com/a?q=don't)");
    expect(out).toContain("`don't`");
    expect(out).toContain("https://example.com/b?q=don't");
    expect(out).toContain('const quote = "straight";');
  });

  it("keeps a quoted h2 aligned with its figure heading and the same slug", () => {
    const raw = 'Why "for your sign" is the wrong unit';
    const curled = applyCurlyQuotes(raw);
    const body = `## ${raw}\n\nFirst paragraph.\n`;
    const placed = insertFigureAfterHeading(applyCurlyQuotes(body), curled);
    expect(placed.placement).toBe("named");
    expect(headingPlainText(curled)).toBe(curled);
    expect(slugify(curled)).toBe(slugify(raw));
  });
});

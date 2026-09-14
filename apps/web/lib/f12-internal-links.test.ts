import { describe, expect, it } from "vitest";
import { F12_TERM_LINKS, linkFirstMentions, markdownContainsLink } from "./f12-internal-links";

describe("linkFirstMentions", () => {
  it("links only the first unlinked mention and preserves original casing", () => {
    const body = "A Synastry Chart is one thing. Later, a synastry chart is another.";
    const out = linkFirstMentions(body, "other-post");
    expect(out).toBe(
      "A [Synastry Chart](/synastry-chart-meaning) is one thing. Later, a synastry chart is another."
    );
  });

  it("never links a term inside a heading", () => {
    const body = "## A synastry chart, explained\n\nThen a synastry chart in the body.";
    const out = linkFirstMentions(body, "other-post");
    expect(out).toContain("## A synastry chart, explained");
    expect(out).toContain("Then a [synastry chart](/synastry-chart-meaning) in the body.");
  });

  it("never links a term already inside a markdown link", () => {
    const body = "See [our synastry chart guide](/synastry-chart-meaning). Then a spare synastry mention.";
    const out = linkFirstMentions(body, "other-post");
    expect(out).toContain("[our synastry chart guide](/synastry-chart-meaning)");
    expect(out).toContain("Then a spare [synastry](/synastry-chart-meaning) mention.");
    expect(out.match(/\]\(\/synastry-chart-meaning\)/g)?.length).toBe(2);
  });

  it("never links a post to itself", () => {
    const body = "A synastry chart is useful. So is synastry.";
    expect(linkFirstMentions(body, "synastry-chart-meaning")).toBe(body);
  });

  it("prefers the longer phrase at the first span", () => {
    const body = "Pull a synastry chart with someone.";
    const out = linkFirstMentions(body, "other-post");
    expect(out).toBe("Pull a [synastry chart](/synastry-chart-meaning) with someone.");
    expect(out).not.toContain("[synastry](/synastry-chart-meaning) chart");
  });

  it("does not turn 'sun signs' into a broken 'sun sign' link", () => {
    const body = "There are twelve sun signs. A sun sign alone cannot.";
    const out = linkFirstMentions(body, "other-post");
    expect(out).toContain("There are twelve sun signs.");
    expect(out).toContain("A [sun sign](/sun-sign-not-personality) alone cannot.");
  });

  it("still links a later standalone synastry after skipping the longer phrase", () => {
    const body = "A synastry chart first. Then synastry on its own.";
    const out = linkFirstMentions(body, "other-post");
    expect(out).toBe(
      "A [synastry chart](/synastry-chart-meaning) first. Then [synastry](/synastry-chart-meaning) on its own."
    );
  });

  it("covers every approved term exactly once in the map", () => {
    expect(F12_TERM_LINKS.map((t) => t.term)).toEqual([
      "synastry aspects",
      "synastry chart",
      "moon square saturn",
      "compatibility scores",
      "sun sign",
      "moon sign",
      "synastry"
    ]);
  });
});

describe("markdownContainsLink", () => {
  it("detects a markdown href", () => {
    expect(markdownContainsLink("x [a](/chart) y", "/chart")).toBe(true);
    expect(markdownContainsLink("x [a](/chart) y", "/chart/compare")).toBe(false);
  });
});

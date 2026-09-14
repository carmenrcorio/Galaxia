import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { HOMEPAGE_DESCRIPTION, HOMEPAGE_TITLE } from "./homepage-seo";
import { FEATURE_TEASER_LINKS, HERO_PRIMARY_CTA, MARKETING_NAV_LOGIN } from "./nav-links";

const WEB_ROOT = join(__dirname, "..");

function read(relPath: string): string {
  return readFileSync(join(WEB_ROOT, relPath), "utf8");
}

describe("homepage outcome-led copy", () => {
  it("locks the founder-specified title and description", () => {
    expect(HOMEPAGE_TITLE).toBe("Understand the people you love | Galaxia");
    expect(HOMEPAGE_DESCRIPTION).toBe(
      "Galaxia computes the real birth chart of everyone in your life, your partner, your parents, your friends, the ones you have lost, and tells you what each of them needs from you. Real astrology, plain language, no horoscopes.",
    );
    expect(HOMEPAGE_TITLE.includes("\u2014")).toBe(false);
    expect(HOMEPAGE_DESCRIPTION.includes("\u2014")).toBe(false);
  });

  it("renders the headline, subheading, body, and free-chart CTA, with no sky thesis block", () => {
    const src = read("components/marketing/hero.tsx");
    expect(src).toContain("Better understand the people in your life.");
    expect(src).toContain("Yes, it uses astrology. No, it will not tell you to avoid Geminis.");
    expect(src).toContain("Galaxia builds a real chart for every person in your life, your partner,");
    expect(src).toContain("what each of them needs from you (breaks down their nature");
    expect(src).toContain("so you can see what few ever will try to).");
    expect(src).toContain("No card. Works with just a birth date.");
    expect(src).not.toContain("The sky has been used to explain ourselves for three thousand years.");
    expect(src).not.toContain("We pointed it at the people we love instead.");
    const withoutComments = src.replace(/\/\*[\s\S]*?\*\//g, "");
    expect(withoutComments).not.toContain("The night sky belongs to everyone.");
    expect(withoutComments).not.toContain("Every app like this is about you.");
    expect(HERO_PRIMARY_CTA).toEqual({ href: "/chart", label: "See someone's chart free" });
    expect(MARKETING_NAV_LOGIN).toEqual({ href: "/login", label: "Log in" });
  });

  it("keeps teaser destinations unchanged", () => {
    expect(FEATURE_TEASER_LINKS.map((l) => l.href)).toEqual([
      "/why-galaxia",
      "/generations",
      "/meet-vela",
      "/security",
      "/pricing",
    ]);
    const src = read("components/marketing/feature-teasers.tsx");
    expect(src).toContain("FEATURE_TEASER_LINKS[0].href");
    expect(src).toContain("FEATURE_TEASER_LINKS[4].href");
  });

  it("keeps the night-sky line on the Why Galaxia surface", () => {
    const src = read("components/marketing/why-section.tsx");
    expect(src).toContain("The night sky belongs to everyone.");
  });
});

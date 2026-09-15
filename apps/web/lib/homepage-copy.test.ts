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

  it("renders the headline, unified value proposition, and free-chart CTA", () => {
    const src = read("components/marketing/hero.tsx");
    expect(src).toContain("Your life. Your people. Your galaxy.");
    expect(src).toContain("FOUNDER-REVIEW");
    expect(src).not.toContain("Galaxia · your inner circle");
    expect(src).not.toContain("YOUR INNER CIRCLE");
    expect(src).not.toContain("Your Inner Circle");
    expect(src).toContain("Better understand the people in your life");
    expect(src).not.toContain("Better understand the people in your life.");
    expect(src).toContain("Build a real chart for your partner, your mother, your difficult colleague, even the ones you have lost, and learn who they are at their core.");
    expect(src).toContain("Yes, it uses astrology. We won't tell you to avoid Geminis, we'll tell you how to talk to one.");
    expect(src).not.toContain("Yes, it uses astrology. No, it will not tell you to avoid Geminis.");
    expect(src).not.toContain("Galaxia builds a real chart for every person in your life, your partner,");
    expect(src).toContain("No card required · Works with just a birth date");
    expect(src).not.toContain("No card. Works with just a birth date.");
    expect(src).not.toContain("The sky has been used to explain ourselves for three thousand years.");
    expect(src).not.toContain("We pointed it at the people we love instead.");
    const withoutComments = src.replace(/\/\*[\s\S]*?\*\//g, "");
    expect(withoutComments).not.toContain("The night sky belongs to everyone.");
    expect(withoutComments).not.toContain("Every app like this is about you.");
    const copyIdx = withoutComments.indexOf("Build a real chart for your partner");
    const defenseIdx = withoutComments.indexOf("Yes, it uses astrology.");
    const ctaIdx = withoutComments.indexOf("{HERO_PRIMARY_CTA.label}");
    const noteIdx = withoutComments.indexOf("No card required · Works with just a birth date");
    const loginIdx = withoutComments.indexOf("{MARKETING_NAV_LOGIN.label}");
    expect(copyIdx).toBeGreaterThan(-1);
    expect(defenseIdx).toBeGreaterThan(copyIdx);
    expect(ctaIdx).toBeGreaterThan(defenseIdx);
    expect(noteIdx).toBeGreaterThan(ctaIdx);
    expect(loginIdx).toBeGreaterThan(noteIdx);
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

  it("locks the closing hero slogan with italic gold on the terminal beat", () => {
    const src = read("components/marketing/close-section.tsx");
    const headline = "Your Life. Your People. <em>Your Galaxy.</em>";
    expect(src).toContain(headline);
    expect(src).toContain("FOUNDER-REVIEW");
    expect(src).not.toContain("The small, bright,");
    expect(src).not.toContain("irreplaceable");
    expect(src).not.toContain("Your life.");
    expect(headline.includes("\u2014")).toBe(false);
  });
});

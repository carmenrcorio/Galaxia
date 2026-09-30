import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  BLOG_BYLINE,
  BLOG_INTRO_NOTE,
  BLOG_INTRO_NOTE_LINK,
  INLINE_CTA_EXCLUDED_SLUGS,
  closingCtaForSlug,
  inlineCtaHref
} from "./blog-cta";

const SQL = readFileSync(
  join(__dirname, "../../../supabase/migrations/20260930145501_blog_polish_round_3.sql"),
  "utf8"
);

describe("blog closing and inline CTAs", () => {
  it("uses one byline and the approved intro note", () => {
    expect(BLOG_BYLINE).toBe("By Galaxia");
    expect(BLOG_INTRO_NOTE).toBe("Galaxia describes what a chart shows, not what will happen.");
    expect(BLOG_INTRO_NOTE_LINK).toBe("How we write about astrology \u2192");
    for (const value of [BLOG_BYLINE, BLOG_INTRO_NOTE, BLOG_INTRO_NOTE_LINK]) {
      expect(value).not.toContain("\u2014");
      expect(value).not.toContain("Galaxia Mea");
    }
  });

  it("keeps the free compare button, with timely bodies and sensitive variants", () => {
    const standard = closingCtaForSlug("synastry-chart-meaning");
    expect(standard.heading).toBe("See it in your own charts");
    expect(standard.button).toBe("Compare two charts free");
    expect(standard.href).toBe("/chart/compare");
    expect(standard.body).toContain("The comparison is free.");

    expect(closingCtaForSlug("venus-retrograde-2026-relationships").body).toContain("Scorpio and Libra");
    expect(closingCtaForSlug("mercury-retrograde-relationships-2026").body).toContain("Mercury");
    const uranus = closingCtaForSlug("uranus-retrograde-gemini-2026-relationships");
    expect(uranus.body).toContain("Gemini");
    expect(uranus.body.toLowerCase()).not.toContain("early degrees");

    const family = closingCtaForSlug("moon-square-saturn-parent-child");
    expect(family.heading).toBe("Look at your own family chart");
    expect(family.button).toBe("Compare two charts free");
    expect(family.href).toBe("/chart/compare");

    const memorial = closingCtaForSlug("reading-chart-of-someone-who-died");
    expect(memorial.heading).toBe("Look at their chart, gently");
    expect(memorial.button).toBe("View their chart");
    expect(memorial.href).toBe("/chart");
    expect(memorial.body).toBe(
      "Add their birth date to see their chart calculated from astronomical positions. Take it at your own pace."
    );
    expect(memorial.body.toLowerCase()).not.toContain("birth time");

    const colleague = closingCtaForSlug("colleague-you-cannot-read");
    expect(colleague.heading).toBe("See where your charts connect");
    expect(colleague.href).toBe("/chart/compare");

    for (const slug of [
      "synastry-chart-meaning",
      "venus-retrograde-2026-relationships",
      "moon-square-saturn-parent-child",
      "reading-chart-of-someone-who-died",
      "colleague-you-cannot-read"
    ]) {
      const cta = closingCtaForSlug(slug);
      expect(cta.heading).not.toContain("\u2014");
      expect(cta.body).not.toContain("\u2014");
      expect(cta.button).not.toContain("\u2014");
    }
  });

  it("gives every other post one inline link to the same destination, and none to the three sensitive posts", () => {
    expect(inlineCtaHref("synastry-chart-meaning")).toBe("/chart/compare");
    expect(inlineCtaHref("what-a-chart-cannot-tell-you")).toBe("/chart/compare");
    expect(inlineCtaHref("reading-chart-of-someone-who-died")).toBeNull();
    expect(inlineCtaHref("moon-square-saturn-parent-child")).toBeNull();
    expect(inlineCtaHref("colleague-you-cannot-read")).toBeNull();
    expect(INLINE_CTA_EXCLUDED_SLUGS).toHaveLength(3);
  });
});

describe("blog polish round 3 migration", () => {
  it("updates byline and the grandmother tag without touching dates, slugs, or canonicals", () => {
    expect(SQL).toContain("set byline = 'By Galaxia'");
    expect(SQL).toContain("status = 'published'");
    expect(SQL).toContain("where slug = 'nobody-has-your-grandmother'");
    expect(SQL).toContain("about_galaxia = false");
    expect(SQL).not.toMatch(/published_at\s*=/);
    expect(SQL).not.toMatch(/updated_at\s*=/);
    expect(SQL).not.toMatch(/set\s+slug\s*=/i);
    expect(SQL).not.toContain("canonical");
    expect(SQL).not.toContain("\u2014");
    expect(SQL).not.toContain("early degrees");
    expect(SQL).not.toContain("Every 18 months");
    expect(SQL).not.toContain("Weeks 1–2 (Scorpio)");
    expect(SQL).toContain("Vela can walk the same computed contact");
    expect(SQL).toContain("14 days free at galaxiamea.com");
  });
});

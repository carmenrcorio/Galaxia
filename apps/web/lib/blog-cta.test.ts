import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  BLOG_BYLINE,
  BLOG_INTRO_NOTE,
  BLOG_INTRO_NOTE_LINK,
  INLINE_CTA_EXCLUDED_SLUGS,
  closingCtaForSlug,
  inlineCtaHref,
  introCtaForSlug,
  postCtaHref,
  showMidNewsletter
} from "./blog-cta";

const SQL = readFileSync(
  join(__dirname, "../../../supabase/migrations/20260930145501_blog_polish_round_3.sql"),
  "utf8"
);

describe("blog CTA routing", () => {
  it("uses one byline and the approved intro note", () => {
    expect(BLOG_BYLINE).toBe("By Galaxia");
    expect(BLOG_INTRO_NOTE).toBe("Galaxia describes what a chart shows, not what will happen.");
    expect(BLOG_INTRO_NOTE_LINK).toBe("How we write about astrology \u2192");
    for (const value of [BLOG_BYLINE, BLOG_INTRO_NOTE, BLOG_INTRO_NOTE_LINK]) {
      expect(value).not.toContain("\u2014");
      expect(value).not.toContain("Galaxia Mea");
    }
  });

  it("routes offers by post type", () => {
    expect(postCtaHref("nobody-has-your-grandmother")).toBe("/generations");
    expect(postCtaHref("reading-chart-of-someone-who-died")).toBe("/chart");
    expect(postCtaHref("synastry-chart-meaning")).toBe("/chart/compare");
    expect(postCtaHref("synastry-aspects-explained")).toBe("/chart/compare");
    expect(postCtaHref("neptune-in-synastry-meaning")).toBe("/chart/compare");
    expect(postCtaHref("sun-sign-not-personality", "debunked")).toBe("/chart");
    expect(postCtaHref("what-a-chart-cannot-tell-you", "debunked")).toBe("/chart");
    expect(postCtaHref("moon-sign-in-relationships", "guides")).toBe("/chart");
  });

  it("keeps timely and sensitive closing copy with matching hrefs", () => {
    expect(closingCtaForSlug("synastry-chart-meaning").href).toBe("/chart/compare");
    expect(closingCtaForSlug("sun-sign-not-personality", "debunked").href).toBe("/chart");
    expect(closingCtaForSlug("nobody-has-your-grandmother").href).toBe("/generations");

    expect(closingCtaForSlug("venus-retrograde-2026-relationships").body).toContain("Scorpio and Libra");
    expect(closingCtaForSlug("mercury-retrograde-relationships-2026").body).toContain("Mercury");
    const uranus = closingCtaForSlug("uranus-retrograde-gemini-2026-relationships");
    expect(uranus.body).toContain("Gemini");
    expect(uranus.href).toBe("/chart");

    const family = closingCtaForSlug("moon-square-saturn-parent-child");
    expect(family.heading).toBe("Look at your own family chart");
    expect(family.href).toBe("/chart");

    const memorial = closingCtaForSlug("reading-chart-of-someone-who-died");
    expect(memorial.heading).toBe("Look at their chart, gently");
    expect(memorial.button).toBe("View their chart");
    expect(memorial.href).toBe("/chart");

    const colleague = closingCtaForSlug("colleague-you-cannot-read");
    expect(colleague.heading).toBe("See where your charts connect");
    expect(colleague.href).toBe("/chart");
  });

  it("intro CTAs describe what happens next", () => {
    expect(introCtaForSlug("sun-sign-not-personality", "debunked").button).toContain("60 seconds");
    expect(introCtaForSlug("synastry-chart-meaning", "guides").href).toBe("/chart/compare");
    expect(introCtaForSlug("nobody-has-your-grandmother", "guides").href).toBe("/generations");
  });

  it("skips the mid newsletter for three sensitive slugs only", () => {
    expect(showMidNewsletter("synastry-chart-meaning")).toBe(true);
    expect(showMidNewsletter("reading-chart-of-someone-who-died")).toBe(false);
    expect(showMidNewsletter("moon-square-saturn-parent-child")).toBe(false);
    expect(showMidNewsletter("colleague-you-cannot-read")).toBe(false);
    expect(INLINE_CTA_EXCLUDED_SLUGS).toHaveLength(3);
    expect(inlineCtaHref("reading-chart-of-someone-who-died")).toBeNull();
  });

  it("uses no em dashes in CTA strings", () => {
    for (const slug of [
      "synastry-chart-meaning",
      "sun-sign-not-personality",
      "nobody-has-your-grandmother",
      "reading-chart-of-someone-who-died"
    ]) {
      const intro = introCtaForSlug(slug, "guides");
      const close = closingCtaForSlug(slug, "guides");
      for (const value of [intro.body, intro.button, close.heading, close.body, close.button]) {
        expect(value).not.toContain("\u2014");
      }
    }
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
  });
});

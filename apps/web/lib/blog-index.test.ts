import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BLOG_HEADER_LINKS } from "./nav-links";
import {
  BLOG_ANALYTICS,
  BLOG_CARD_PLACEHOLDER_SRC,
  BLOG_INDEX_LEDE,
  BLOG_START_HERE_INTRO,
  BLOG_START_HERE_TITLE,
  BLOG_TIMELY_BADGE,
  START_HERE_SLUGS,
  TITLE_HERO_PLACEHOLDER_SLUGS,
  cardThumbnailSrc,
  isTimelyActive,
  partitionBlogIndex,
  sortBlogFeed,
  type BlogIndexFields
} from "./blog-index";

const SQL = readFileSync(
  join(__dirname, "../../../supabase/migrations/20260930031243_blog_index_phase_3.sql"),
  "utf8"
);

function post(partial: Partial<BlogIndexFields> & Pick<BlogIndexFields, "slug">): BlogIndexFields {
  return {
    isTimely: false,
    expiresAt: null,
    publishedAt: "2026-09-01T00:00:00.000Z",
    heroImageUrl: `/blog/${partial.slug}/hero.png`,
    ...partial
  };
}

describe("blog index helpers", () => {
  it("shows the Timely badge only while today is before expires_at", () => {
    const venus = { isTimely: true, expiresAt: "2026-11-14" };
    expect(isTimelyActive(venus, new Date("2026-11-13T23:00:00.000Z"))).toBe(true);
    expect(isTimelyActive(venus, new Date("2026-11-14T00:00:00.000Z"))).toBe(false);
    expect(isTimelyActive(venus, new Date("2026-11-15T00:00:00.000Z"))).toBe(false);
    expect(isTimelyActive({ isTimely: false, expiresAt: "2026-11-14" }, new Date("2026-09-30T00:00:00.000Z"))).toBe(false);
    expect(isTimelyActive({ isTimely: true, expiresAt: null }, new Date("2026-09-30T00:00:00.000Z"))).toBe(false);
    expect(isTimelyActive({ isTimely: true, expiresAt: "2027-02-09" }, new Date("2027-02-08T12:00:00.000Z"))).toBe(true);
    expect(isTimelyActive({ isTimely: true, expiresAt: "2027-02-09" }, new Date("2027-02-09T00:00:00.000Z"))).toBe(false);
  });

  it("pins the three evergreen slugs, then timely posts, then newest", () => {
    const now = new Date("2026-09-30T12:00:00.000Z");
    const posts = [
      post({ slug: "venus-retrograde-2026-relationships", isTimely: true, expiresAt: "2026-11-14", publishedAt: "2026-09-29T00:00:00.000Z" }),
      post({ slug: "mercury-retrograde-relationships-2026", isTimely: true, expiresAt: "2026-11-14", publishedAt: "2026-09-29T00:00:00.000Z" }),
      post({ slug: "uranus-retrograde-gemini-2026-relationships", isTimely: true, expiresAt: "2027-02-09", publishedAt: "2026-09-28T00:00:00.000Z" }),
      post({ slug: "moon-sign-in-relationships", publishedAt: "2026-09-29T00:00:00.000Z" }),
      post({ slug: "sun-sign-not-personality", publishedAt: "2026-09-01T00:00:00.000Z" }),
      post({ slug: "synastry-chart-meaning", publishedAt: "2026-08-04T00:00:00.000Z" }),
      post({ slug: "whole-sign-houses-explained", publishedAt: "2026-09-29T00:00:00.000Z" }),
      post({ slug: "mothers-moon-sign-apology", publishedAt: "2026-07-21T00:00:00.000Z" })
    ];
    const { startHere, rest } = partitionBlogIndex(posts, now);
    expect(startHere.map((item) => item.slug)).toEqual([...START_HERE_SLUGS]);
    expect(rest.map((item) => item.slug)).toEqual([
      "venus-retrograde-2026-relationships",
      "mercury-retrograde-relationships-2026",
      "uranus-retrograde-gemini-2026-relationships",
      "whole-sign-houses-explained",
      "mothers-moon-sign-apology"
    ]);
    expect(rest.some((item) => (START_HERE_SLUGS as readonly string[]).includes(item.slug))).toBe(false);
  });

  it("drops an expired timely post into the newest-first group and never puts a live timely post in Start here", () => {
    const timelyStart = post({
      slug: "sun-sign-not-personality",
      isTimely: true,
      expiresAt: "2026-11-14",
      publishedAt: "2026-09-01T00:00:00.000Z"
    });
    const expired = post({
      slug: "venus-retrograde-2026-relationships",
      isTimely: true,
      expiresAt: "2026-11-14",
      publishedAt: "2026-09-29T00:00:00.000Z"
    });
    const older = post({ slug: "mothers-moon-sign-apology", publishedAt: "2026-07-21T00:00:00.000Z" });
    const live = partitionBlogIndex([timelyStart, expired], new Date("2026-09-30T00:00:00.000Z"));
    expect(live.startHere.map((item) => item.slug)).toEqual([]);
    expect(live.rest.map((item) => item.slug)).toEqual([
      "venus-retrograde-2026-relationships",
      "sun-sign-not-personality"
    ]);

    const after = sortBlogFeed([expired, older], new Date("2026-11-14T00:00:00.000Z"));
    expect(after.map((item) => item.slug)).toEqual([
      "venus-retrograde-2026-relationships",
      "mothers-moon-sign-apology"
    ]);
  });

  it("skips a Start here slug that is not published", () => {
    const { startHere } = partitionBlogIndex(
      [post({ slug: "moon-sign-in-relationships" })],
      new Date("2026-09-30T00:00:00.000Z")
    );
    expect(startHere.map((item) => item.slug)).toEqual(["moon-sign-in-relationships"]);
  });

  it("uses the constellation placeholder for title-on-starfield heroes and any remote hero", () => {
    expect(cardThumbnailSrc("sun-sign-not-personality", "/blog/sun-sign-not-personality/hero.png")).toBe(
      BLOG_CARD_PLACEHOLDER_SRC
    );
    expect(
      cardThumbnailSrc(
        "not-in-the-list",
        "https://cdn.example/storage/v1/object/public/blog-images/example.svg"
      )
    ).toBe(BLOG_CARD_PLACEHOLDER_SRC);
    expect(cardThumbnailSrc("whole-sign-houses-explained", "/blog/whole-sign-houses-explained/hero.png")).toBe(
      "/blog/whole-sign-houses-explained/hero.png"
    );
    expect(cardThumbnailSrc("draft-without-art", null)).toBeNull();
    expect(TITLE_HERO_PLACEHOLDER_SLUGS).toContain("synastry-chart-meaning");
    expect(TITLE_HERO_PLACEHOLDER_SLUGS).not.toContain("venus-retrograde-2026-relationships");
  });

  it("keeps new index copy free of em dashes", () => {
    for (const copy of [BLOG_INDEX_LEDE, BLOG_START_HERE_TITLE, BLOG_START_HERE_INTRO, BLOG_TIMELY_BADGE]) {
      expect(copy).not.toContain("\u2014");
    }
    expect(BLOG_INDEX_LEDE).toContain("Birth charts");
    expect(BLOG_INDEX_LEDE).not.toContain("Natal");
    expect(BLOG_START_HERE_INTRO).toContain("Sun");
    expect(BLOG_START_HERE_INTRO).toContain("Moon");
    expect(BLOG_ANALYTICS).toEqual({
      startHere: "blog_start_here_click",
      card: "blog_card_click",
      readNext: "blog_read_next_click",
      cta: "blog_cta_click"
    });
    expect(BLOG_HEADER_LINKS.map((link) => link.label)).toEqual(["Free chart", "Blog", "Pricing"]);
    const card = readFileSync(join(__dirname, "../components/blog/blog-post-card.tsx"), "utf8");
    expect(card).toContain('alt=""');
    expect(card).toContain('loading="lazy"');
    expect(card).toContain('from "next/image"');
    expect(card).not.toContain("alt={post.heroImageAlt");
    const analytics = readFileSync(join(__dirname, "../components/blog/blog-analytics.tsx"), "utf8");
    expect(analytics).toContain("track(event, { slug, cta })");
    expect(analytics).toContain("track(event, { slug })");
    expect(analytics).not.toContain("email");
  });
});

describe("blog index phase 3 migration", () => {
  function dek(tag: string): string {
    const match = SQL.match(new RegExp(`\\$${tag}\\$([\\s\\S]*?)\\$${tag}\\$`));
    if (!match?.[1]) throw new Error(`missing ${tag}`);
    return match[1];
  }

  it("updates excerpts only, and stays inside the description limit", () => {
    expect(SQL).not.toMatch(/published_at\s*=/);
    expect(SQL).not.toMatch(/set\s+slug\s*=/i);
    expect(SQL).not.toContain("\u2014");
    const excerpts = {
      sun_dek: dek("sun_dek"),
      moon_dek: dek("moon_dek"),
      syn_dek: dek("syn_dek"),
      merc_dek: dek("merc_dek"),
      time_dek: dek("time_dek")
    };
    expect(excerpts.sun_dek).toContain("birth chart");
    expect(excerpts.sun_dek.length).toBeLessThanOrEqual(158);
    for (const key of ["moon_dek", "merc_dek", "time_dek"] as const) {
      expect(excerpts[key].length).toBeGreaterThanOrEqual(140);
      expect(excerpts[key].length).toBeLessThanOrEqual(158);
    }
    expect(excerpts.syn_dek.length).toBeLessThanOrEqual(158);
    expect(excerpts.moon_dek).toContain("partner's Moon");
    expect(excerpts.moon_dek).not.toContain("beside a partner");
    expect(excerpts.syn_dek).toContain("each catch");
    expect(excerpts.merc_dek).toContain("your partner");
    expect(excerpts.time_dek).toContain("birth chart");
    expect(SQL.match(/update public\.posts/g)).toHaveLength(5);
  });
});

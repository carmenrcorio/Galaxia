import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SQL = readFileSync(
  join(__dirname, "../../../supabase/migrations/20260929230323_blog_post_timely_and_drop_pricing_lines.sql"),
  "utf8"
);

const TIMELY = [
  ["venus-retrograde-2026-relationships", "2026-11-14"],
  ["mercury-retrograde-relationships-2026", "2026-11-14"],
  ["uranus-retrograde-gemini-2026-relationships", "2027-02-09"]
] as const;

const PRICING_SLUGS = [
  "colleague-you-cannot-read",
  "moon-square-saturn-parent-child",
  "what-a-chart-cannot-tell-you",
  "reading-chart-of-someone-who-died",
  "compatibility-scores-wrong-question",
  "sun-sign-not-personality"
] as const;

describe("blog timely migration", () => {
  it("adds nullable timely columns and does not rewrite published_at or slugs", () => {
    expect(SQL).toContain("add column if not exists is_timely boolean");
    expect(SQL).toContain("add column if not exists expires_at date");
    expect(SQL).not.toMatch(/published_at\s*=/);
    expect(SQL).not.toMatch(/set\s+slug\s*=/i);
    expect(SQL).not.toContain("\u2014");
    for (const [slug, expires] of TIMELY) {
      expect(SQL).toContain(`'${slug}'`);
      expect(SQL).toContain(expires);
    }
  });

  it("removes the pricing sentence from the six posts that carry it", () => {
    for (const slug of PRICING_SLUGS) {
      expect(SQL).toContain(`slug = '${slug}'`);
    }
    const replacements = [...SQL.matchAll(/\$new_[a-z]+\$([\s\S]*?)\$new_[a-z]+\$/g)].map((match) => match[1] ?? "");
    expect(replacements.length).toBe(PRICING_SLUGS.length);
    for (const replacement of replacements) {
      expect(replacement.toLowerCase()).not.toContain("never charged");
    }
  });
});

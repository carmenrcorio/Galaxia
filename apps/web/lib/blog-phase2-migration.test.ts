import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SQL = readFileSync(
  join(__dirname, "../../../supabase/migrations/20260930021501_blog_publication_phase_2.sql"),
  "utf8"
);

describe("blog publication phase 2 migration", () => {
  it("adds read-next and method columns without touching slugs or published_at", () => {
    expect(SQL).toContain("add column if not exists related_slugs text[]");
    expect(SQL).toContain("add column if not exists method_note text");
    expect(SQL).toContain("add column if not exists about_galaxia boolean");
    expect(SQL).not.toMatch(/published_at\s*=/);
    expect(SQL).not.toMatch(/set\s+slug\s*=/i);
    expect(SQL).not.toContain("\u2014");
    expect(SQL).not.toContain("97%");
    expect(SQL).not.toContain("Every 18 months");
    expect(SQL).toContain("About every 19 months");
    expect(SQL).toContain("Astrology was entangled with the early development of astronomy, calendars, and mathematics");
    expect(SQL).not.toContain("Weeks 1–2 (Scorpio)");
    expect(SQL).not.toContain("Weeks 3–5 (moving into Libra)");
    expect(SQL).toContain("Your Galaxy Guide");
    expect(SQL).toContain("cover this contact");
    expect(SQL).not.toContain("covers this contact");
  });

  it("sets the required Read next pairs and the memorial note", () => {
    expect(SQL).toContain(
      "related_slugs = array['mercury-retrograde-relationships-2026']::text[]"
    );
    expect(SQL).toContain(
      "related_slugs = array['synastry-chart-meaning', 'synastry-vs-composite-chart']::text[]"
    );
    expect(SQL).toContain("where slug = 'reading-chart-of-someone-who-died'");
    expect(SQL).toContain("It is not a way to contact them");
    expect(SQL).toContain("about_galaxia = true");
  });
});

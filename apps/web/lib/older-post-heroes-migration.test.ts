import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SQL = readFileSync(
  join(__dirname, "../../../supabase/migrations/20260930035909_older_post_heroes.sql"),
  "utf8"
);

const PUBLIC = join(__dirname, "../public/blog");

/** Alt text copied exactly from the founder manifest. */
const ALTS: Record<string, string> = {
  "what-a-chart-cannot-tell-you": "Decorative illustration: a chart wheel drawn in thin lavender lines with four gold points and an empty dashed circle at its center, suggesting what a chart leaves unknown.",
  "colleague-you-cannot-read": "Decorative illustration: a teal point on the left and a lavender point on the right, each with faint lines reaching toward a soft glowing barrier between them that they do not cross.",
  "sun-sign-not-personality": "Decorative illustration: a small gold sun at the center of several concentric rings with many colored points orbiting around it, showing the Sun as one part of a larger chart.",
  "reading-chart-of-someone-who-died": "Decorative illustration: a single soft gold star at the center of faint rings, with small white stars scattered around it and thin gold lines reaching out, a quiet memorial image.",
  "compatibility-scores-wrong-question": "Decorative illustration: a dial-shaped arc partly filled in coral, with a teal point and a gold point beside it joined by a dotted line, suggesting two people who cannot be reduced to one score.",
  "moon-square-saturn-parent-child": "Decorative illustration: a gold crescent moon and a coral ringed planet placed a right angle apart on a wheel, joined by lines through the center to show a square aspect.",
  "nobody-has-your-grandmother": "Decorative illustration: a bright gold star at the top with lines branching down to five colored stars and then to smaller white stars, like a family tree drawn as a constellation.",
  "synastry-chart-meaning": "Decorative illustration: two overlapping sets of concentric rings, one teal and one lavender, with gold lines connecting points between them to show contacts between two charts.",
  "synastry-aspects-explained": "Decorative illustration: six white points around a ring joined by lines in lavender, teal and gold, forming the triangles and hexagon patterns that aspects make.",
  "mothers-moon-sign-apology": "Decorative illustration: a large gold crescent moon with a soft glow, and a smaller coral star nearby joined by a dotted line, on a starry background with faint rings."
};

describe("older post heroes migration", () => {
  it("sets only the local hero url and the manifest alt for each of the ten posts", () => {
    expect(SQL).not.toContain("\u2014");
    expect(SQL).not.toMatch(/published_at\s*=/);
    expect(SQL).not.toMatch(/updated_at\s*=/);
    expect(SQL).not.toMatch(/set\s+slug\s*=/i);
    expect(SQL).not.toMatch(/\bdek\s*=/);
    expect(SQL).not.toMatch(/\bbody\s*=/);
    expect(SQL.match(/update public\.posts/g)).toHaveLength(10);
    for (const [slug, alt] of Object.entries(ALTS)) {
      const url = `/blog/${slug}/hero.png`;
      expect(SQL).toContain(`hero_image_url = '${url}'`);
      expect(SQL).toContain(alt);
      expect(existsSync(join(PUBLIC, slug, "hero.png"))).toBe(true);
      expect(existsSync(join(PUBLIC, slug, `${slug}.svg`))).toBe(false);
    }
  });
});

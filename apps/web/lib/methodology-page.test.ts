import { aspectDefinition, type AspectType } from "@galaxia/astro";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  METHODOLOGY_ASPECT_TYPES,
  METHODOLOGY_DESCRIPTION,
  METHODOLOGY_H1,
  METHODOLOGY_LEDE,
  METHODOLOGY_PATH,
  METHODOLOGY_SECTIONS,
  METHODOLOGY_TITLE,
  methodologyOrbDegrees,
  methodologyOrbRows,
} from "./methodology-copy";
import { RELATED_LINKS } from "./nav-links";

const REPO_ROOT = join(__dirname, "..", "..", "..");

function read(path: string): string {
  return readFileSync(join(REPO_ROOT, path), "utf8");
}

const PAGE = "apps/web/app/methodology/page.tsx";
const SITEMAP = "apps/web/app/sitemap.ts";
const ENGINE = "packages/astro/src/index.ts";

describe("/methodology metadata", () => {
  it("exports the unique title, description, and self canonical", () => {
    const src = read(PAGE);
    expect(METHODOLOGY_TITLE).toBe("How Galaxia Computes Your Chart");
    expect(METHODOLOGY_H1).toBe("How Galaxia computes your chart");
    expect(METHODOLOGY_DESCRIPTION).toBe(
      "Real astronomical data, published methodology. See the ephemeris source, orb tables, and house system behind every Galaxia chart.",
    );
    expect(METHODOLOGY_PATH).toBe("/methodology");
    expect(src).toMatch(/alternates:\s*\{\s*canonical:\s*METHODOLOGY_PATH\s*\}/);
    expect(src).toContain("url: METHODOLOGY_PATH");
    expect(src).toContain("https://galaxiamea.com/methodology");
  });

  it("renders WebPage JSON-LD with the same title, description, and path", () => {
    expect(read(PAGE)).toContain(
      "WebPageJsonLd path={METHODOLOGY_PATH} name={METHODOLOGY_TITLE} description={METHODOLOGY_DESCRIPTION}",
    );
  });

  it("is a static server page: no client directive, no cookies, no posts fetch", () => {
    const src = read(PAGE);
    expect(src.startsWith('"use client"')).toBe(false);
    expect(src).not.toMatch(/cookies\(/);
    expect(src).not.toMatch(/getPublishedPosts/);
    expect(src).not.toMatch(/createSupabaseServerClient/);
  });
});

describe("/methodology orb table matches the engine", () => {
  it("uses one orb per aspect type for luminaries, personal, and outer planets", () => {
    const expected: Record<AspectType, number> = {
      conjunction: 8,
      sextile: 4,
      square: 6,
      trine: 6,
      opposition: 8,
    };
    for (const type of METHODOLOGY_ASPECT_TYPES) {
      expect(methodologyOrbDegrees(type)).toBe(expected[type]);
      expect(methodologyOrbDegrees(type)).toBe(aspectDefinition(type).orb);
    }
    const rows = methodologyOrbRows();
    expect(rows.map((row) => [row.type, row.orb])).toEqual([
      ["conjunction", 8],
      ["sextile", 4],
      ["square", 6],
      ["trine", 6],
      ["opposition", 8],
    ]);
  });

  it("renders the live orb in all three planet columns, not a restated number", () => {
    const src = read(PAGE);
    expect(src).toContain("methodologyOrbRows()");
    expect(src).toContain("{row.orb}°");
    expect(src).not.toMatch(/8°|6°|4°/);
    const engine = read(ENGINE);
    expect(engine).toContain("conjunction: { angle: 0, orb: 8");
    expect(engine).toContain("sextile: { angle: 60, orb: 4");
    expect(engine).toContain("square: { angle: 90, orb: 6");
    expect(engine).toContain("trine: { angle: 120, orb: 6");
    expect(engine).toContain("opposition: { angle: 180, orb: 8");
  });

  it("states that the engine does not widen orbs by planet class", () => {
    expect(METHODOLOGY_SECTIONS.orbs.paragraphs[0]).toMatch(/one allowance per aspect type/);
    expect(METHODOLOGY_SECTIONS.orbs.tableCaption).toMatch(/does not widen the window by planet class/);
  });
});

describe("/methodology content and voice", () => {
  it("names the real ephemeris, Placidus default, and honest omissions", () => {
    expect(METHODOLOGY_SECTIONS.ephemeris.paragraphs[0]).toMatch(/astronomy-engine/);
    expect(METHODOLOGY_SECTIONS.ephemeris.paragraphs[0]).toMatch(/not AI-generated/);
    expect(METHODOLOGY_SECTIONS.houses.paragraphs[1]).toMatch(/Placidus/);
    expect(METHODOLOGY_SECTIONS.omissions.items).toEqual(
      expect.arrayContaining([
        "Chiron",
        "Lunar nodes (True Node or Mean Node)",
        "Black Moon Lilith",
        "Minor aspects (quincunx, semisextile, semisquare, sesquiquadrate)",
        "Arabic parts, including the Part of Fortune",
      ]),
    );
    expect(METHODOLOGY_SECTIONS.applying.paragraphs[2]).toMatch(
      /do not yet mark applying or separating/,
    );
  });

  it("tags authored copy FOUNDER-REVIEW and never uses U+2014", () => {
    const copy = read("apps/web/lib/methodology-copy.ts");
    expect(copy).toContain("FOUNDER-REVIEW");
    expect(copy).not.toContain("\u2014");
    expect(read(PAGE)).not.toContain("\u2014");
    expect(METHODOLOGY_TITLE).not.toContain("\u2014");
    expect(METHODOLOGY_DESCRIPTION).not.toContain("\u2014");
    expect(METHODOLOGY_LEDE).not.toContain("\u2014");
  });
});

describe("/methodology sitemap and related links", () => {
  it("is listed in the public sitemap", () => {
    expect(read(SITEMAP)).toContain('"/methodology"');
  });

  it("links to glossary, security, and why-galaxia", () => {
    expect(RELATED_LINKS.methodology.map((l) => l.href)).toEqual([
      "/glossary",
      "/security",
      "/why-galaxia",
    ]);
  });

  it("is linked from /glossary and /security", () => {
    expect(RELATED_LINKS.glossary.map((l) => l.href)).toContain("/methodology");
    expect(RELATED_LINKS.security.map((l) => l.href)).toContain("/methodology");
  });
});

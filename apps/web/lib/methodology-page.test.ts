import { aspectDefinition, natalAspectCoverage, type AspectType } from "@galaxia/astro";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  METHODOLOGY_ASPECT_TYPES,
  METHODOLOGY_COMPARE_LIMITS_LINE,
  METHODOLOGY_DESCRIPTION,
  METHODOLOGY_H1,
  METHODOLOGY_LEDE,
  METHODOLOGY_PATH,
  METHODOLOGY_SECTIONS,
  METHODOLOGY_SIGNUP_LIMITS_LINE,
  METHODOLOGY_TITLE,
  methodologyNatalAspectCoverageSentence,
  methodologyOrbDegrees,
  methodologyInterpretationCoverageLines,
  methodologyOrbRows,
} from "./methodology-copy";
import { interpretationLibraryCoverageSummary } from "@galaxia/astro";
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
    expect(METHODOLOGY_DESCRIPTION).toMatch(/Real astronomical data/);
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
  it("uses one orb per aspect type from aspectDefinition()", () => {
    const expected: Record<AspectType, number> = {
      conjunction: 8,
      sextile: 4,
      square: 6,
      trine: 6,
      opposition: 8,
      quincunx: 2.5,
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
      ["quincunx", 2.5],
    ]);
  });

  it("renders a single orb column driven by methodologyOrbRows()", () => {
    const src = read(PAGE);
    expect(src).toContain("methodologyOrbRows()");
    expect(src).toContain("{row.orb}°");
    expect(src).not.toContain("columnHeaders.luminaries");
    const engine = read(ENGINE);
    expect(engine).toContain("conjunction: { angle: 0, orb: 8");
    expect(engine).toContain("quincunx: { angle: 150, orb: 2.5");
  });

  it("states that the engine does not widen orbs by planet class", () => {
    expect(METHODOLOGY_SECTIONS.orbs.paragraphs[0]).toMatch(/one allowance per aspect type/);
    expect(METHODOLOGY_SECTIONS.orbs.tableCaption).toMatch(/same orb applies to every planet pair/);
  });
});

describe("/methodology interpretation coverage", () => {
  it("paragraph counts match interpretationLibraryCoverageSummary()", () => {
    const summary = interpretationLibraryCoverageSummary();
    const lines = methodologyInterpretationCoverageLines();
    expect(lines[1]).toContain(`${summary.natalAspect.authored} of ${summary.natalAspect.possible}`);
    expect(lines[2]).toContain(`${summary.synastryTable.authored} of ${summary.synastryTable.possible}`);
    expect(lines[3]).toContain(`${summary.chironSynastry.authored} of ${summary.chironSynastry.possible}`);
    expect(read(PAGE)).toContain("methodologyInterpretationCoverageLines()");
  });
});

describe("/methodology content and voice", () => {
  it("names astronomy-engine, True Node, Chiron table, and precision tiers", () => {
    expect(METHODOLOGY_SECTIONS.ephemeris.paragraphs[0]).toMatch(/astronomy-engine/);
    expect(METHODOLOGY_SECTIONS.ephemeris.paragraphs[1]).toMatch(/True Node/);
    expect(METHODOLOGY_SECTIONS.ephemeris.paragraphs[1]).toMatch(/Mean Node is not computed/);
    expect(METHODOLOGY_SECTIONS.ephemeris.paragraphs[2]).toMatch(/JPL Horizons/);
    expect(METHODOLOGY_SECTIONS.ephemeris.paragraphs[2]).toMatch(/Chiron synastry readings are authored/);
    expect(METHODOLOGY_SECTIONS.ephemeris.paragraphs[2]).toMatch(/natal Chiron sign and house copy is not authored yet/);
    expect(METHODOLOGY_SECTIONS.precision.paragraphs[0]).toMatch(/Year-only/);
    expect(METHODOLOGY_SECTIONS.precision.paragraphs[1]).toMatch(/Date-only/);
    expect(METHODOLOGY_SECTIONS.precision.paragraphs[2]).toMatch(/Exact charts/);
    expect(METHODOLOGY_SECTIONS.houses.paragraphs[1]).toMatch(/Placidus/);
  });

  it("omissions list excludes Chiron and True Node; includes Mean Node", () => {
    expect(METHODOLOGY_SECTIONS.omissions.items).not.toContain("Chiron");
    expect(METHODOLOGY_SECTIONS.omissions.items.join(" ")).not.toMatch(/True Node/);
    expect(METHODOLOGY_SECTIONS.omissions.items).toContain("Mean Node");
    expect(METHODOLOGY_SECTIONS.omissions.items).toEqual(
      expect.arrayContaining([
        "Black Moon Lilith",
        "Minor aspects other than the quincunx (semisextile, semisquare, sesquiquadrate)",
        "Arabic parts, including the Part of Fortune",
      ]),
    );
  });

  it("limits block matches /method and glossary themes", () => {
    expect(METHODOLOGY_SECTIONS.limits.paragraphs.join(" ")).toMatch(/does not predict/);
    expect(METHODOLOGY_SECTIONS.limits.paragraphs.join(" ")).toMatch(/whether to stay/);
    expect(METHODOLOGY_SECTIONS.limits.paragraphs.join(" ")).toMatch(/Rising sign and house/);
  });

  it("readings section states stored copy and founder review before ship", () => {
    expect(METHODOLOGY_SECTIONS.readings.intro).toMatch(/written in advance and stored/);
    expect(METHODOLOGY_SECTIONS.readings.intro).not.toMatch(/hand-written/i);
    expect(METHODOLOGY_SECTIONS.readings.founderReview).toMatch(
      /reviewed and approved by the founder before it ships/,
    );
  });

  it("natal aspect coverage sentence matches natalAspectCoverage()", () => {
    const { authored, possible } = natalAspectCoverage();
    expect(methodologyNatalAspectCoverageSentence()).toBe(
      `Today ${authored} of ${possible} possible natal aspect pairs have a written reading in the library.`,
    );
  });

  it("Vela section names Claude without a model version", () => {
    const text = METHODOLOGY_SECTIONS.vela.paragraphs.join(" ");
    expect(text).toMatch(/Anthropic/);
    expect(text).not.toMatch(/claude-sonnet|claude-opus|model version/i);
    expect(text).toMatch(/can be wrong/);
  });

  it("accuracy section is scoped to the Placidus regression test", () => {
    expect(METHODOLOGY_SECTIONS.accuracy.paragraphs[0]).toMatch(/one arcminute/);
    expect(METHODOLOGY_SECTIONS.accuracy.paragraphs[0]).toMatch(/do not claim a universal match/);
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

  it("exports signup and compare helper lines", () => {
    expect(METHODOLOGY_SIGNUP_LIMITS_LINE).toMatch(/Rising sign or houses/);
    expect(METHODOLOGY_COMPARE_LIMITS_LINE).toMatch(/whether to stay/);
    expect(read("apps/web/components/signup-form.tsx")).toContain("METHODOLOGY_SIGNUP_LIMITS_LINE");
    expect(read("apps/web/app/chart/compare/page.tsx")).toContain("METHODOLOGY_COMPARE_LIMITS_LINE");
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

  it("is linked from signup, chart, compare, and the footer", () => {
    expect(read("apps/web/components/signup-form.tsx")).toContain('href="/methodology"');
    expect(read("apps/web/app/chart/quick-chart-page.tsx")).toContain('href="/methodology"');
    expect(read("apps/web/app/chart/compare/page.tsx")).toContain('href="/methodology"');
    expect(read("apps/web/lib/nav-links.ts")).toContain('href: "/methodology"');
  });
});

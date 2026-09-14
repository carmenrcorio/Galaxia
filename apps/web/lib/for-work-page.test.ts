import { FAMILY_BRIDGE, PLUTO_SIGN_EXTENDED } from "@galaxia/astro";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { RELATED_LINKS } from "./nav-links";

const REPO_ROOT = join(__dirname, "..", "..", "..");

function read(path: string): string {
  return readFileSync(join(REPO_ROOT, path), "utf8");
}

const PAGE = "apps/web/app/for-work/page.tsx";
const SECTIONS = "apps/web/components/marketing/for-work-sections.tsx";

describe("/for-work metadata", () => {
  const src = read(PAGE);

  it("exports the unique title, description, and canonical from the spec", () => {
    expect(src).toContain(
      'const TITLE = "Galaxia for Work: Relationship Intelligence from Computed Astrology"',
    );
    expect(src).toContain(
      "Before the one to one, the negotiation, or the hard feedback, know how this person is wired and what shaped them. Computed astrology from real birth data, written in plain language.",
    );
    expect(src).toMatch(/alternates:\s*\{\s*canonical:\s*"\/for-work"/);
    expect(src).toContain('url: "/for-work"');
  });

  it("renders WebPage JSON-LD with the same title, description, and path", () => {
    expect(src).toContain('WebPageJsonLd path="/for-work" name={TITLE} description={DESCRIPTION}');
  });

  it("renders a unique H1 through ForWorkHero", () => {
    expect(src).toContain("<ForWorkHero />");
    expect(read(SECTIONS)).toContain(
      "Know how this person is wired before the conversation that matters.",
    );
  });
});

describe("/for-work language layer", () => {
  it("does not name astrology in the hero", () => {
    const src = read(SECTIONS);
    const start = src.indexOf("export function ForWorkHero");
    const end = src.indexOf("export function ForWorkMoments");
    const hero = src.slice(start, end).toLowerCase();
    for (const word of ["astrology", "natal", "planet", "pluto", "horoscope", "zodiac", "chart"]) {
      expect(hero, `hero names "${word}"`).not.toContain(word);
    }
  });

  it("names astrology in How it works", () => {
    const src = read(SECTIONS);
    const start = src.indexOf("export function ForWorkHowItWorks");
    const how = src.slice(start).toLowerCase();
    expect(how).toContain("this is astrology, named plainly");
  });

  it("includes the required what-this-is-not claims", () => {
    const src = read(SECTIONS);
    expect(src).toContain("This does not predict performance.");
    expect(src).toContain("It is not a hiring tool.");
    expect(src).toContain("It is not a personality test.");
    expect(src).toContain("A prompt for better questions, not a verdict.");
  });
});

describe("/for-work generational copy is from the package", () => {
  it("renders Watergate, AIDS Crisis, and 2008 Crash details verbatim", () => {
    const src = read(SECTIONS);
    expect(src).toContain('eraEventFromLayer("Virgo", "Watergate")');
    expect(src).toContain('eraEventFromLayer("Virgo", "The AIDS Crisis")');
    expect(src).toContain('eraEventFromLayer("Scorpio", "The 2008 Crash")');
    expect(src).toContain('familyBridgeFromLayer("Scorpio", "Virgo")');

    expect(PLUTO_SIGN_EXTENDED.Virgo?.eraEvents.find((e) => e.label === "Watergate")?.detail).toBe(
      "The curtain came down on the idea that government was trustworthy. This generation grew up in the aftermath.",
    );
    expect(PLUTO_SIGN_EXTENDED.Virgo?.eraEvents.find((e) => e.label === "The AIDS Crisis")?.detail).toBe(
      "A generation watched friends die while institutions looked away, and learned to organize without permission.",
    );
    expect(PLUTO_SIGN_EXTENDED.Scorpio?.eraEvents.find((e) => e.label === "The 2008 Crash")?.detail).toBe(
      "The financial system built by their parents failed publicly while they came of age into a destroyed job market.",
    );
    expect(FAMILY_BRIDGE.Scorpio?.Virgo).toContain("You both want to fix what's broken");
    expect(src).toContain("FOR_WORK_WORK_VIEW");
    expect(src).toContain("FOR_WORK_ERA_READING");
    expect(src).toContain("FOR_WORK_SOURCE_LINE");
  });
});

describe("/for-work internal links", () => {
  it("points at chart, generations, meet-vela, pricing, and the sun-sign post", () => {
    expect(RELATED_LINKS.forWork.map((l) => l.href)).toEqual([
      "/chart",
      "/generations",
      "/meet-vela",
      "/pricing",
      "/sun-sign-not-personality",
    ]);
  });
});

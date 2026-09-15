import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  chartReadingEmailSubject,
  constellationLetterSubject,
  day1Email,
  day4MultiEmail,
  day4OneEmail,
  day11Email,
  day14Email,
  nudgeEmailSubject,
  type TrialEmailData
} from "./emails";
import { SOFTWARE_APPLICATION_JSON_LD } from "./homepage-software-application-json-ld";
import { HOMEPAGE_DESCRIPTION } from "./homepage-seo";
import { TITLE as CHART_TITLE, DESCRIPTION as CHART_DESCRIPTION } from "../app/chart/chart-seo";
import { buildCategoryMetadata, SITE_OG_IMAGE } from "./blog-metadata";

/**
 * Voice-layer gate. Cite design/galaxia-voice-layers.md and ENGINEERING.md §17.
 * Outer copy leads with outcome. Inner copy and metadata keep astrology.
 */

const REPO_ROOT = join(__dirname, "..", "..", "..");

function readRepo(relPath: string): string {
  return readFileSync(join(REPO_ROOT, relPath), "utf8");
}

function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^\s*\/\/.*$/gm, " ")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ");
}

const ASTROLOGY_APP = /astrology\s+app/i;
const APOLOGY = /if you believe|sort of thing|\"astrology\"|'astrology'/i;
const PREDICTION_PROMISE =
  /\b(see what will happen|predicts? your (future|year|week|day)|what (your|their) (year|week) (holds|brings))\b/i;

const LAYER_ONE_VISIBLE = [
  "apps/web/components/marketing/hero.tsx",
  "apps/web/components/marketing/quick-chart-entry.tsx",
  "apps/web/components/marketing/for-work-section.tsx",
  "apps/web/components/marketing/for-work-sections.tsx",
  "apps/web/components/marketing/press-kit-section.tsx",
  "apps/web/app/welcome/page.tsx",
  "apps/mobile/app/(app)/onboarding.tsx",
  "apps/mobile/app/index.tsx",
  "content/ads/paid-social.md"
];

describe("layer one: lead with outcome, never an astrology app", () => {
  it("visible outer copy does not call Galaxia an astrology app, apologise, or promise prediction", () => {
    for (const rel of LAYER_ONE_VISIBLE) {
      const visible = stripComments(readRepo(rel));
      expect(visible, rel).not.toMatch(ASTROLOGY_APP);
      expect(visible, rel).not.toMatch(APOLOGY);
      expect(visible, rel).not.toMatch(PREDICTION_PROMISE);
    }
  });

  it("homepage H1 leads with outcome; Astrology is not the first word", () => {
    const src = readRepo("apps/web/components/marketing/hero.tsx");
    const h1 = src.match(/<h1[\s\S]*?>([\s\S]*?)<\/h1>/);
    expect(h1?.[1]).toBeDefined();
    const text = h1![1]!.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    expect(text.toLowerCase().startsWith("astrology")).toBe(false);
    expect(src).toContain("Better understand the people in your life");
    expect(src).not.toContain("Better understand the people in your life.");
    expect(text.toLowerCase()).toContain("people in your life");
  });

  it("store listing visible fields are outcome-first; keywords may keep astrology", () => {
    const ios = readRepo("content/store/app-store.md");
    const play = readRepo("content/store/play-store.md");
    expect(ios).toMatch(/## Subtitle[\s\S]*Understand who you love/);
    expect(ios).toMatch(/## Keywords[\s\S]*astrology/i);
    const iosVisible = ios.split("## Keywords")[0] ?? ios;
    expect(iosVisible).not.toMatch(ASTROLOGY_APP);
    expect(play).not.toMatch(ASTROLOGY_APP);
    expect(play).toMatch(/Understand the people you love/);
  });

  it("email subjects lead with outcome, not astrology", () => {
    const base: TrialEmailData = {
      firstName: "Sam",
      personName: "Riley",
      peopleCount: 3,
      notesCount: 2,
      threadsCount: 1,
      groupsCount: 1,
      trialEndDate: "24 July",
      siteUrl: "https://galaxiamea.com"
    };
    const subjects = [
      day1Email(base).subject,
      day4MultiEmail(base).subject,
      day4OneEmail(base).subject,
      day11Email(base).subject,
      day14Email(base).subject,
      nudgeEmailSubject("Riley"),
      constellationLetterSubject(["Riley"]),
      constellationLetterSubject(["Riley", "Ada"]),
      constellationLetterSubject(["Riley", "Ada", "Sam"]),
      chartReadingEmailSubject("Cancer"),
      chartReadingEmailSubject(null)
    ];
    const layerOneStart = /^(astrology|sky|galaxy|natal|synastry|horoscope|transit)\b/i;
    for (const subject of subjects) {
      expect(subject).not.toMatch(/astrology/i);
      expect(subject).not.toMatch(layerOneStart);
      expect(subject.length).toBeLessThanOrEqual(45);
    }
    expect(day1Email(base).subject).toBe("Riley is in your circle now");
    expect(day4MultiEmail(base).subject).toBe("What Riley needs from you");
    expect(nudgeEmailSubject("Riley")).toBe("Riley, today");
  });
});

describe("layer two: astrology language stays where search and in-product intent live", () => {
  it("does not strip astrology from homepage metadata or JSON-LD", () => {
    expect(HOMEPAGE_DESCRIPTION).toMatch(/astrology/i);
    expect(HOMEPAGE_DESCRIPTION).toMatch(/birth chart/i);
    expect(SOFTWARE_APPLICATION_JSON_LD.description as string).toBe(HOMEPAGE_DESCRIPTION);
    expect(SITE_OG_IMAGE.alt).toMatch(/astrology/i);
    expect(readRepo("apps/web/app/page.tsx")).toMatch(/HOMEPAGE_TITLE/);
  });

  it("keeps natal / synastry vocabulary on /chart and /chart/compare", () => {
    expect(CHART_TITLE).toMatch(/Birth Chart/i);
    expect(CHART_DESCRIPTION).toMatch(/natal chart/i);
    const compare = readRepo("apps/web/app/chart/compare/layout.tsx");
    expect(compare).toMatch(/Synastry Chart/);
    expect(compare).toMatch(/synastry/i);
    expect(readRepo("apps/web/app/chart/compare/page.tsx")).toMatch(/aspects between you/);
  });

  it("how-it-works keeps natal, synastry, aspects, houses, and Vela names the aspect", () => {
    const how = readRepo("apps/web/components/marketing/features-section.tsx");
    expect(how).toMatch(/id="how"/);
    expect(how).toMatch(/natal chart/i);
    expect(how).toMatch(/synastry/i);
    expect(how).toMatch(/Rising, houses/);
    expect(how).toMatch(/Mars square his Saturn/);
    expect(readRepo("apps/web/app/page.tsx")).toMatch(/FeaturesSection/);
  });

  it("blog categories keep astrology in labels and metadata", () => {
    const blog = readRepo("apps/web/lib/blog.ts");
    expect(blog).toMatch(/label: "Astrology guides"/);
    expect(blog).toMatch(/label: "Astrology, debunked"/);
    const guides = buildCategoryMetadata({ slug: "guides", label: "Astrology guides" });
    const debunked = buildCategoryMetadata({ slug: "debunked", label: "Astrology, debunked" });
    expect(String(guides.title)).toMatch(/astrology/i);
    expect(String(guides.description)).toMatch(/astrology/i);
    expect(String(debunked.title)).toMatch(/astrology/i);
    expect(String(debunked.description)).toMatch(/astrology/i);
  });

  it("Vela's prompt requires naming the aspect it is reading", () => {
    const vela = readRepo("packages/vela/src/index.ts");
    const edge = readRepo("supabase/functions/vela-chat/index.ts");
    for (const src of [vela, edge]) {
      expect(src).toContain("When you are reading an aspect, name it in the answer");
      expect(src).toContain("The sky describes how a person is built, not what will happen to them");
    }
  });
});

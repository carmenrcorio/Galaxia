import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Source guards for the mobile-LCP pass (A + B1 + B2 + B4).
 *
 * Phase 0 lab Lighthouse reported the homepage LCP as the nav wordmark
 * (`div > nav > div.container > a`, 84×37 "Galaxia") because hero text sat
 * at opacity:0 during `.fade-in` `animation-fill-mode: both`. `/chart` and
 * `/chart/compare` already LCP on a visible `p.lede` (no fade-in / reveal),
 * so those nodes are asserted unchanged, not edited. `/why-galaxia` LCP was
 * `h2.reveal` in WhySection; `/pricing` first-screen price cards were
 * `.reveal` even though the measured LCP was the already-visible intro lede.
 *
 * `.reveal` stays opacity:0 until RevealObserver hydrates. `.fade-in` stays
 * opacity:0 for the whole animation-delay. First-screen LCP text must use
 * neither. CSS-only fade-in is allowed on non-LCP nodes (hero CTA,
 * constellation). prefers-reduced-motion must keep both classes visible.
 */

const REPO_ROOT = join(__dirname, "..", "..", "..");

function read(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), "utf8");
}

function withoutComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

describe("homepage hero first-screen text is visible without JS", () => {
  const hero = withoutComments(read("apps/web/components/marketing/hero.tsx"));

  it("drops .fade-in / .reveal from the eyebrow, H1, and ledes", () => {
    expect(hero).toContain('<span className="eyebrow">');
    expect(hero).toContain('<h1 className="hero-h1">');
    expect(hero).toContain('<div className="hero-copy">');
    expect(hero).not.toMatch(/className="eyebrow[^"]*fade-in/);
    expect(hero).not.toMatch(/className="hero-h1[^"]*fade-in/);
    expect(hero).not.toMatch(/className="hero-copy[^"]*fade-in/);
    expect(hero).not.toMatch(/className="[^"]*reveal/);
  });

  it("keeps CSS-only fade-in on the non-LCP CTA and constellation card", () => {
    expect(hero).toContain('className="hero-cta-stack fade-in fade-in-delay-3"');
    expect(hero).toContain('className="constellation fade-in fade-in-delay-2"');
  });
});

describe("/why-galaxia and /pricing first-screen copy is not .reveal", () => {
  it("WhySection eyebrow, h2, and body paragraphs have no reveal", () => {
    const src = withoutComments(read("apps/web/components/marketing/why-section.tsx"));
    expect(src).toContain('<span className="eyebrow">');
    expect(src).toContain("<h2>");
    expect(src).toContain('<p className="body">');
    expect(src).not.toMatch(/className="[^"]*reveal/);
  });

  it("first-screen price card, no-cap line, and included block have no reveal", () => {
    const src = withoutComments(read("apps/web/components/marketing/pricing-section.tsx"));
    expect(src).toContain('className="price-cards"');
    expect(src).toContain('className="price-no-cap"');
    expect(src).toContain('className="incl glass-card"');
    expect(src).not.toContain("price-cards reveal");
    expect(src).not.toContain("price-no-cap reveal");
    expect(src).not.toContain("incl glass-card reveal");
  });

  it("below-fold pricing lines may still use scroll reveal", () => {
    const src = withoutComments(read("apps/web/components/marketing/pricing-section.tsx"));
    expect(src).toContain('className="price-free reveal"');
    expect(src).toContain('className="price-reassure reveal"');
  });

  it("SectionPageIntro (why/pricing LCP-adjacent heading and lede) has no fade-in or reveal", () => {
    const src = withoutComments(read("apps/web/components/marketing/section-page-intro.tsx"));
    expect(src).not.toMatch(/fade-in|reveal/);
  });
});

describe("/chart and /chart/compare LCP ledes stay visible", () => {
  it("does not put fade-in or reveal on the measured LCP p.lede", () => {
    const chart = withoutComments(read("apps/web/app/chart/quick-chart-page.tsx"));
    const compare = withoutComments(read("apps/web/app/chart/compare/page.tsx"));
    expect(chart).toMatch(/<p className="lede" style=\{\{ marginBottom: 20 \}\}>/);
    expect(compare).toMatch(/<p className="lede" style=\{\{ marginBottom: 20 \}\}>/);
    expect(chart).not.toMatch(/<p className="lede fade-in/);
    expect(compare).not.toMatch(/<p className="lede fade-in/);
    expect(chart).not.toMatch(/<p className="lede[^"]*reveal/);
    expect(compare).not.toMatch(/<p className="lede[^"]*reveal/);
  });
});

describe("B2: NatalSignReveal is not on the homepage first-load graph", () => {
  const entry = read("apps/web/components/marketing/quick-chart-entry.tsx");

  it("type-only imports NatalChart and dynamic-imports natal-sign-reveal", () => {
    expect(entry).toMatch(/import type \{ NatalChart \} from "@galaxia\/astro"/);
    expect(entry).toMatch(
      /const NatalSignReveal = dynamic\(\(\) =>\s*import\("\.\.\/natal-sign-reveal"\)\.then\(\(mod\) => mod\.NatalSignReveal\)/,
    );
    expect(entry).not.toMatch(/import\s*\{[^}]*NatalSignReveal/);
    expect(entry).not.toMatch(/from ["'].*natal-sign-reveal["']/);
  });

  it("does not import birth-fields; MONTHS is local", () => {
    expect(entry).not.toMatch(/from ["'].*birth-fields["']/);
    expect(entry).toContain("const MONTHS = [");
    expect(entry).toContain('"January"');
  });
});

describe("B4: CosmicBackground is code-split on public LCP routes only", () => {
  it("the five public LCP pages import the lazy wrapper, not the canvas module", () => {
    const pages: Array<[string, string]> = [
      ["apps/web/app/page.tsx", "../components/cosmic-background-lazy"],
      ["apps/web/app/why-galaxia/page.tsx", "../../components/cosmic-background-lazy"],
      ["apps/web/app/pricing/page.tsx", "../../components/cosmic-background-lazy"],
      ["apps/web/components/quick-chart-shell.tsx", "./cosmic-background-lazy"],
    ];
    for (const [file, spec] of pages) {
      const src = read(file);
      expect(src).toContain(`from "${spec}"`);
      expect(src).not.toMatch(/from ["'][^"']*cosmic-background["']/);
    }
  });

  it("signed-in /app layout keeps a static import of cosmic-background.tsx", () => {
    const src = read("apps/web/app/app/layout.tsx");
    expect(src).toContain('from "../../components/cosmic-background"');
    expect(src).not.toContain("cosmic-background-lazy");
  });

  it("the lazy wrapper dynamic-imports CosmicBackground with default SSR", () => {
    const src = read("apps/web/components/cosmic-background-lazy.tsx");
    expect(src).toContain('"use client"');
    expect(src).toMatch(
      /dynamic\(\(\) =>\s*import\("\.\/cosmic-background"\)\.then\(\(mod\) => mod\.CosmicBackground\)/,
    );
    expect(src).not.toMatch(/ssr:\s*false/);
  });
});

describe("prefers-reduced-motion still forces first-screen motion off and content visible", () => {
  it("globals.css makes .reveal and .fade-in visible and static under reduce", () => {
    const css = read("apps/web/app/globals.css");
    expect(css).toMatch(
      /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\.reveal \{ opacity: 1; transform: none; transition: none; \}/,
    );
    expect(css).toMatch(
      /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\.fade-in, \.fade-in-delay-1, \.fade-in-delay-2, \.fade-in-delay-3 \{ animation: none; \}/,
    );
  });

  it("CosmicBackground still draws one static frame and skips twinkle/parallax", () => {
    const src = read("apps/web/components/cosmic-background.tsx");
    expect(src).toContain('window.matchMedia("(prefers-reduced-motion: reduce)")');
    expect(src).toContain("if (!reduce) raf = requestAnimationFrame(drawStars)");
    expect(src).toContain("const al = s.baseA + (reduce ? 0 : s.amp * Math.sin(s.a))");
    expect(src).toContain("const tox = reduce ? 0 : targetX * layer.parallax");
  });
});

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { GALAXIA_HELP_EMAIL } from "@galaxia/core";
import {
  APP_NAV_ACTIONS,
  APP_NAV_BRAND_HREF,
  APP_NAV_LINKS,
  EMAIL_PATHS,
  MARKETING_NAV_LOGIN,
  MARKETING_NAV_SIGNUP,
  PERSON_PROFILE_HREF_PREFIX,
  personProfileHref,
  CAPTURE_MOMENT_HREF,
  captureMomentHref,
  signupWithNextHref,
  loginWithNextHref,
  EMPTY_STATE_SETTINGS_HREF,
  EMPTY_STATE_WELCOME_HREF,
  THIS_WEEK_HREF,
  TODAY_SKY_HREF,
  FEATURE_TEASER_LINKS,
  MARKETING_NAV_ACTIONS,
  MARKETING_NAV_BRAND_HREF,
  MARKETING_NAV_LINKS,
  NOT_FOUND_LINKS,
  PUBLISHED_BLOG_POST_HREFS,
  RELATED_LINKS,
  SHARE_NOT_FOUND_CTA,
  SITE_FOOTER_LINKS,
  SYNASTRY_CHART_MEANING_HREF,
  SUN_SIGN_NOT_PERSONALITY_HREF,
  appNavInternalHrefs,
  ctaInternalHrefs,
  emailInternalHrefs,
  emptyStateInternalHrefs,
  footerInternalHrefs,
  isPublishedBlogPostHref,
  marketingNavInternalHrefs,
} from "./nav-links";

/**
 * Guards the marketing nav and the authed app nav against shipping a href
 * that has no matching App Router page. Reads the exported link config
 * (not the rendered DOM) so this runs in node without a browser.
 *
 * Mapping rule: `/` -> apps/web/app/page.tsx, `/chart` ->
 * apps/web/app/chart/page.tsx, `/app` -> apps/web/app/app/page.tsx.
 * The catch-all `app/[slug]/page.tsx` is never treated as a match: a nav
 * link to a missing path must fail, not hide behind a blog slug 404.
 * Hardcoded blog CTAs are a separate allowlist (`PUBLISHED_BLOG_POST_HREFS`)
 * that must still have `app/[slug]/page.tsx`.
 */

const REPO_ROOT = join(__dirname, "..", "..", "..");
const WEB_APP_DIR = join(REPO_ROOT, "apps/web/app");
const WEB_ROOT = join(REPO_ROOT, "apps/web");
const BLOG_CATCHALL_PAGE = join(WEB_APP_DIR, "[slug]/page.tsx");

function pageFileForHref(href: string): string {
  const path = href.split("?")[0].split("#")[0];
  if (!path.startsWith("/") || path.startsWith("//")) {
    throw new Error(`nav href must be a root-relative path, got ${href}`);
  }
  if (path === "/") return join(WEB_APP_DIR, "page.tsx");
  return join(WEB_APP_DIR, path.slice(1), "page.tsx");
}

function extractLiteralHrefs(src: string): string[] {
  const hrefs: string[] = [];
  for (const match of src.matchAll(/\bhref(?:\s*=\s*|\s*:\s*)\{?["']([^"']+)["']\}?/g)) {
    const href = match[1];
    if (href.startsWith("/") && !href.startsWith("//")) hrefs.push(href);
  }
  return hrefs;
}

function readWeb(relPath: string): string {
  return readFileSync(join(WEB_ROOT, relPath), "utf8");
}

function assertHrefResolves(href: string, label: string) {
  if (isPublishedBlogPostHref(href)) {
    expect(
      existsSync(BLOG_CATCHALL_PAGE),
      `${label} href "${href}" is a published blog post but apps/web/app/[slug]/page.tsx is missing`,
    ).toBe(true);
    return;
  }
  const page = pageFileForHref(href);
  expect(
    existsSync(page),
    `${label} href "${href}" has no page file at ${page.replace(`${REPO_ROOT}/`, "")}`,
  ).toBe(true);
}

function assertEveryHrefResolves(hrefs: string[], label: string, { allowEmpty = false }: { allowEmpty?: boolean } = {}) {
  if (!allowEmpty) {
    expect(hrefs.length, `${label} should export at least one href`).toBeGreaterThan(0);
  }
  for (const href of hrefs) {
    assertHrefResolves(href, label);
  }
}

function assertRendersFromConfig(src: string, tokens: string[], leftoverLabel: string) {
  for (const token of tokens) {
    expect(src).toContain(token);
  }
  const leftover = extractLiteralHrefs(src);
  assertEveryHrefResolves(leftover, leftoverLabel, { allowEmpty: true });
}

describe("marketing nav hrefs resolve to App Router pages", () => {
  it("every exported marketing nav href has a matching page.tsx", () => {
    assertEveryHrefResolves(marketingNavInternalHrefs(), "marketing nav");
  });

  it("Quick Chart in the marketing nav points at the live /chart route", () => {
    const freeChart = MARKETING_NAV_LINKS.find((l) => l.label === "Free chart");
    expect(freeChart?.href).toBe("/chart");
    expect(existsSync(join(WEB_APP_DIR, "chart/page.tsx"))).toBe(true);
    expect(existsSync(join(WEB_APP_DIR, "app/chart/page.tsx"))).toBe(false);
    expect(existsSync(join(WEB_APP_DIR, "quick-chart/page.tsx"))).toBe(false);
  });

  it("renders from the exported config rather than a second hardcoded list", () => {
    const src = readFileSync(join(WEB_ROOT, "components/marketing/marketing-nav.tsx"), "utf8");
    expect(src).toContain("MARKETING_NAV_LINKS");
    expect(src).toContain("MARKETING_NAV_LOGIN");
    expect(src).toContain("MARKETING_NAV_SIGNUP");
    expect(src).toContain("MARKETING_NAV_BRAND_HREF");
    expect(src).toMatch(/MARKETING_NAV_LINKS\.map/);
    expect(src).not.toMatch(/\/quick-chart/);
    expect(src).not.toMatch(/\/app\/quick-chart/);

    const leftover = extractLiteralHrefs(src);
    assertEveryHrefResolves(leftover, "marketing nav leftover literal", { allowEmpty: true });
  });
});

describe("app nav hrefs resolve to App Router pages", () => {
  it("every exported app nav href has a matching page.tsx", () => {
    assertEveryHrefResolves(appNavInternalHrefs(), "app nav");
  });

  it("Free chart in the app nav points at /chart because /app/chart does not exist", () => {
    const freeChart = APP_NAV_LINKS.find((l) => l.label === "Free chart");
    expect(freeChart?.href).toBe("/chart");
    expect(existsSync(join(WEB_APP_DIR, "app/chart/page.tsx"))).toBe(false);
  });

  it("renders from the exported config rather than a second hardcoded list", () => {
    const src = readFileSync(join(WEB_ROOT, "components/app-nav.tsx"), "utf8");
    expect(src).toContain("APP_NAV_LINKS");
    expect(src).toContain("APP_NAV_ACCOUNT");
    expect(src).toContain("APP_NAV_BRAND_HREF");
    expect(src).toMatch(/APP_NAV_LINKS\.map/);
    expect(src).not.toMatch(/\/quick-chart/);
    expect(src).not.toMatch(/\/app\/quick-chart/);

    const leftover = extractLiteralHrefs(src);
    assertEveryHrefResolves(leftover, "app nav leftover literal", { allowEmpty: true });
  });
});

describe("signed-in chart save hrefs", () => {
  it("personProfileHref points at the dynamic person page", () => {
    expect(PERSON_PROFILE_HREF_PREFIX).toBe("/app/person/");
    expect(personProfileHref("abc")).toBe("/app/person/abc");
    expect(existsSync(join(WEB_APP_DIR, "app/person/[id]/page.tsx"))).toBe(true);
    expect(existsSync(join(WEB_APP_DIR, "app/chart/page.tsx"))).toBe(false);
  });

  it("captureMomentHref points at the Moment page", () => {
    expect(CAPTURE_MOMENT_HREF).toBe("/app/moment");
    expect(captureMomentHref()).toBe("/app/moment");
    expect(captureMomentHref("abc")).toBe("/app/moment?personId=abc");
    expect(existsSync(join(WEB_APP_DIR, "app/moment/page.tsx"))).toBe(true);
  });

  it("signupWithNextHref stays on the marketing signup route", () => {
    expect(signupWithNextHref("/welcome?prefill=1")).toBe(
      `${MARKETING_NAV_SIGNUP.href}?next=${encodeURIComponent("/welcome?prefill=1")}`,
    );
  });

  it("loginWithNextHref keeps next on the marketing login route", () => {
    expect(loginWithNextHref("/connect/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")).toBe(
      `${MARKETING_NAV_LOGIN.href}?next=${encodeURIComponent("/connect/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")}`,
    );
  });

  it("SaveToGalaxyButton reads those builders instead of hardcoded paths", () => {
    const src = readWeb("components/save-to-galaxy-button.tsx");
    expect(src).toContain("personProfileHref");
    expect(src).toContain("signupWithNextHref");
    expect(src).not.toMatch(/href=\{`\/app\/person/);
    expect(src).not.toMatch(/href=\{`\/signup\?next/);
  });

  it("QuickChartShell logged-out chrome reads marketing nav links", () => {
    assertRendersFromConfig(
      readWeb("components/quick-chart-shell.tsx"),
      ["MARKETING_NAV_BRAND_HREF", "MARKETING_NAV_LOGIN", "MARKETING_NAV_SIGNUP"],
      "quick-chart-shell leftover literal",
    );
  });
});

describe("retired Quick Chart paths redirect in next.config", () => {
  it("permanently sends /quick-chart and /app/quick-chart to /chart", () => {
    const src = readFileSync(join(WEB_ROOT, "next.config.mjs"), "utf8");
    expect(src).toMatch(/source:\s*["']\/quick-chart["']/);
    expect(src).toMatch(/source:\s*["']\/app\/quick-chart["']/);
    expect(src).toMatch(/destination:\s*["']\/chart["']/);
    expect(src).toMatch(/permanent:\s*true/);
    expect(src).not.toContain("vercel.json");
  });

  it("permanently sends /account/subscription to /app/settings", () => {
    const src = readFileSync(join(WEB_ROOT, "next.config.mjs"), "utf8");
    expect(src).toMatch(/source:\s*["']\/account\/subscription["']/);
    expect(src).toMatch(/destination:\s*["']\/app\/settings["']/);
    expect(src).toMatch(/permanent:\s*true/);
    expect(src).not.toContain("vercel.json");
    expect(existsSync(join(WEB_APP_DIR, "account/subscription/page.tsx"))).toBe(false);
  });

  it("strips a trailing slash on /connect/:token so a pasted token still lands", () => {
    const src = readFileSync(join(WEB_ROOT, "next.config.mjs"), "utf8");
    expect(src).toMatch(/source:\s*["']\/connect\/:token\/["']/);
    expect(src).toMatch(/destination:\s*["']\/connect\/:token["']/);
  });
});

describe("nav config still includes the non-Quick-Chart entries", () => {
  it("keeps marketing labels and action hrefs", () => {
    expect(MARKETING_NAV_BRAND_HREF).toBe("/");
    expect(MARKETING_NAV_LINKS.map((l) => l.href)).toEqual([
      "/why-galaxia",
      "/generations",
      "/meet-vela",
      "/chart",
      "/blog",
      "/pricing",
    ]);
    expect(MARKETING_NAV_ACTIONS.map((l) => l.href)).toEqual(["/login", "/signup"]);
    expect(MARKETING_NAV_LINKS.map((l) => l.label)).toEqual([
      "How it works",
      "Your people",
      "Ask Vela",
      "Free chart",
      "Blog",
      "Pricing",
    ]);
  });

  it("keeps app labels and the Account action", () => {
    expect(APP_NAV_BRAND_HREF).toBe("/app");
    expect(APP_NAV_LINKS.map((l) => l.href)).toEqual([
      "/app",
      "/app/compare",
      "/app/groups",
      "/app/vela",
      "/app/settings",
      "/chart",
      "/blog",
    ]);
    expect(APP_NAV_ACTIONS.map((l) => l.href)).toEqual(["/account"]);
  });
});

describe("footer hrefs resolve to App Router pages", () => {
  it("every exported footer href has a matching page.tsx", () => {
    assertEveryHrefResolves(footerInternalHrefs(), "footer");
  });

  it("renders from the exported config rather than a second hardcoded list", () => {
    assertRendersFromConfig(
      readWeb("components/marketing/site-footer.tsx"),
      ["SITE_FOOTER_LINKS", "SITE_FOOTER_LINKS.map"],
      "footer leftover literal",
    );
  });

  it("keeps the public footer destinations", () => {
    expect(SITE_FOOTER_LINKS.map((l) => l.href)).toEqual([
      "/why-galaxia",
      "/generations",
      "/meet-vela",
      "/for-work",
      "/security",
      "/pricing",
      "/chart",
      "/download",
      "/blog",
      "/press",
      "/privacy",
      "/terms",
    ]);
    expect(SITE_FOOTER_LINKS.map((l) => l.label)).toEqual([
      "How it works",
      "Your people",
      "Ask Vela",
      "For work",
      "Security",
      "Pricing",
      "Free chart",
      "Download",
      "Blog",
      "Press",
      "Privacy",
      "Terms",
    ]);
  });

  it("does not change marketing H1s or metadata titles", () => {
    const why = readWeb("app/why-galaxia/page.tsx");
    expect(why).toContain('title="Why Galaxia"');
    expect(why).toContain("Why Galaxia: Relationship Intelligence, Not Horoscopes");
    const generations = readWeb("app/generations/page.tsx");
    expect(generations).toContain('title="Generations"');
    expect(generations).toContain("Generations: Your Family's Astrology, Together | Galaxia");
    const vela = readWeb("app/meet-vela/page.tsx");
    expect(vela).toContain('title="Meet Vela"');
    expect(vela).toContain("Meet Vela, Your AI Astrology Guide | Galaxia");
    const pricing = readWeb("app/pricing/page.tsx");
    expect(pricing).toContain("Galaxia Pricing");
    expect(pricing).toContain('title="One Honest Plan"');
    const chartSeo = readWeb("app/chart/chart-seo.ts");
    expect(chartSeo).toContain("Free Birth Chart Calculator from Galaxia");
  });
});

describe("CTA hrefs resolve to App Router pages", () => {
  it("every exported CTA href has a matching page.tsx or published blog slug", () => {
    assertEveryHrefResolves(ctaInternalHrefs(), "cta");
  });

  it("related-link CTAs to /synastry-chart-meaning use the published-post allowlist, not a static page", () => {
    expect(SYNASTRY_CHART_MEANING_HREF).toBe("/synastry-chart-meaning");
    expect(PUBLISHED_BLOG_POST_HREFS).toContain(SYNASTRY_CHART_MEANING_HREF);
    expect(isPublishedBlogPostHref(SYNASTRY_CHART_MEANING_HREF)).toBe(true);
    expect(existsSync(BLOG_CATCHALL_PAGE)).toBe(true);
    expect(existsSync(join(WEB_APP_DIR, "synastry-chart-meaning/page.tsx"))).toBe(false);
    expect(RELATED_LINKS.whyGalaxiaBlog.map((l) => l.href)).toContain(SYNASTRY_CHART_MEANING_HREF);
    expect(RELATED_LINKS.chart.map((l) => l.href)).toContain(SYNASTRY_CHART_MEANING_HREF);
  });

  it("related-link CTAs to /sun-sign-not-personality use the published-post allowlist", () => {
    expect(SUN_SIGN_NOT_PERSONALITY_HREF).toBe("/sun-sign-not-personality");
    expect(PUBLISHED_BLOG_POST_HREFS).toContain(SUN_SIGN_NOT_PERSONALITY_HREF);
    expect(isPublishedBlogPostHref(SUN_SIGN_NOT_PERSONALITY_HREF)).toBe(true);
    expect(existsSync(join(WEB_APP_DIR, "sun-sign-not-personality/page.tsx"))).toBe(false);
    expect(RELATED_LINKS.forWork.map((l) => l.href)).toEqual([
      "/chart",
      "/generations",
      "/meet-vela",
      "/pricing",
      SUN_SIGN_NOT_PERSONALITY_HREF,
    ]);
  });

  it("a non-allowlisted slug is not treated as a page just because [slug] exists", () => {
    expect(isPublishedBlogPostHref("/this-slug-is-not-a-route")).toBe(false);
    expect(existsSync(pageFileForHref("/this-slug-is-not-a-route"))).toBe(false);
  });

  it("marketing related-link pages render from RELATED_LINKS", () => {
    assertRendersFromConfig(readWeb("app/why-galaxia/page.tsx"), ["RELATED_LINKS.whyGalaxia", "RELATED_LINKS.whyGalaxiaBlog"], "why-galaxia leftover literal");
    assertRendersFromConfig(readWeb("app/generations/page.tsx"), ["RELATED_LINKS.generations", "RELATED_LINKS.generationsBlog"], "generations leftover literal");
    assertRendersFromConfig(readWeb("app/meet-vela/page.tsx"), ["RELATED_LINKS.meetVela"], "meet-vela leftover literal");
    assertRendersFromConfig(readWeb("app/security/page.tsx"), ["RELATED_LINKS.security"], "security leftover literal");
    assertRendersFromConfig(readWeb("app/pricing/page.tsx"), ["RELATED_LINKS.pricing"], "pricing leftover literal");
    assertRendersFromConfig(readWeb("app/for-work/page.tsx"), ["RELATED_LINKS.forWork"], "for-work leftover literal");
    assertRendersFromConfig(readWeb("app/press/page.tsx"), ["RELATED_LINKS.press"], "press leftover literal");
    assertRendersFromConfig(readWeb("app/chart/quick-chart-page.tsx"), ["RELATED_LINKS.chart", "CHART_MODE_COMPARE"], "quick-chart leftover literal");
    assertRendersFromConfig(readWeb("app/chart/compare/page.tsx"), ["RELATED_LINKS.chartCompare", "CHART_MODE_SINGLE"], "quick-compare leftover literal");
  });

  it("hero, close, pricing, teasers, and 404 CTAs render from the exported config", () => {
    assertRendersFromConfig(
      readWeb("components/marketing/hero.tsx"),
      ["HERO_PRIMARY_CTA", "MARKETING_NAV_LOGIN", "HERO_HOW_IT_WORKS"],
      "hero leftover literal",
    );
    assertRendersFromConfig(readWeb("components/marketing/close-section.tsx"), ["MARKETING_NAV_SIGNUP"], "close-section leftover literal");
    assertRendersFromConfig(
      readWeb("components/marketing/for-work-sections.tsx"),
      ["FOR_WORK_CHART_CTA", "MARKETING_NAV_SIGNUP", "MARKETING_NAV_BRAND_HREF"],
      "for-work sections leftover literal",
    );
    assertRendersFromConfig(readWeb("components/marketing/pricing-section.tsx"), ["MARKETING_NAV_SIGNUP"], "pricing-section leftover literal");
    assertRendersFromConfig(readWeb("components/marketing/feature-teasers.tsx"), ["FEATURE_TEASER_LINKS"], "feature-teasers leftover literal");
    assertRendersFromConfig(readWeb("app/not-found.tsx"), ["NOT_FOUND_LINKS"], "not-found leftover literal");
    assertRendersFromConfig(readWeb("app/s/[token]/not-found.tsx"), ["SHARE_NOT_FOUND_CTA"], "share not-found leftover literal");
    expect(FEATURE_TEASER_LINKS.map((l) => l.href)).toEqual([
      "/why-galaxia",
      "/generations",
      "/meet-vela",
      "/security",
      "/pricing",
    ]);
    expect(NOT_FOUND_LINKS.map((l) => l.href)).toEqual(["/", "/chart"]);
    expect(SHARE_NOT_FOUND_CTA.href).toBe("/chart");
  });
});

describe("empty-state hrefs resolve to App Router pages", () => {
  it("every exported empty-state href has a matching page.tsx", () => {
    assertEveryHrefResolves(emptyStateInternalHrefs(), "empty state");
  });

  it("welcome and settings empty-state destinations stay on real routes", () => {
    expect(EMPTY_STATE_WELCOME_HREF).toBe("/welcome");
    expect(EMPTY_STATE_SETTINGS_HREF).toBe("/app/settings");
    expect(THIS_WEEK_HREF).toBe("/app/this-week");
    expect(TODAY_SKY_HREF).toBe("/app#today-in-your-sky");
  });

  it("empty-state surfaces render from the exported hrefs", () => {
    assertRendersFromConfig(
      readWeb("components/constellation-starfield-skeleton.tsx"),
      ["EMPTY_STATE_WELCOME_HREF"],
      "constellation empty leftover literal",
    );
    assertRendersFromConfig(
      readWeb("components/relational-transit-feed.tsx"),
      ["EMPTY_STATE_SETTINGS_HREF", "THIS_WEEK_HREF", "TODAY_SKY_HREF"],
      "transit-feed leftover literal",
    );
    assertRendersFromConfig(
      readWeb("components/quick-check-modal.tsx"),
      ["EMPTY_STATE_WELCOME_HREF"],
      "quick-check leftover literal",
    );
    assertRendersFromConfig(
      readWeb("app/app/settings/page.tsx"),
      ["EMPTY_STATE_WELCOME_HREF"],
      "settings empty leftover literal",
    );
    assertRendersFromConfig(
      readWeb("components/settings-subscription-panel.tsx"),
      ["SETTINGS_CANCEL_HREF", "EMAIL_PATHS.subscribe"],
      "settings subscription leftover literal",
    );
    assertRendersFromConfig(
      readWeb("app/app/person/[id]/page.tsx"),
      ["EMPTY_STATE_WELCOME_HREF"],
      "person empty leftover literal",
    );
    assertRendersFromConfig(
      readWeb("components/groups/groups-empty-state.tsx"),
      ["EMPTY_STATE_WELCOME_HREF"],
      "groups empty leftover literal",
    );
  });
});

describe("email hrefs resolve to App Router pages", () => {
  it("every exported email path has a matching page.tsx", () => {
    assertEveryHrefResolves(emailInternalHrefs(), "email");
  });

  it("trial and nudge emails concatenate EMAIL_PATHS rather than hardcoded paths", () => {
    const src = readWeb("lib/emails.ts");
    expect(src).toContain("EMAIL_PATHS");
    expect(src).toContain("EMAIL_PATHS.welcome");
    expect(src).toContain("EMAIL_PATHS.compare");
    expect(src).toContain("EMAIL_PATHS.subscribe");
    expect(src).toContain("EMAIL_PATHS.app");
    expect(src).toContain("EMAIL_PATHS.notifications");
    expect(src).not.toMatch(/\$\{d\.siteUrl\}\/(welcome|app|subscribe|account)/);
    expect(EMAIL_PATHS).toEqual({
      welcome: "/welcome",
      compare: "/app/compare",
      subscribe: "/subscribe",
      app: "/app",
      notifications: "/account/notifications",
    });
  });
});

describe("Galaxia contact and domain literals", () => {
  const CONTACT_FILE = "packages/core/src/contact.ts";
  const SCAN_ROOTS = ["apps", "packages", "content", "supabase/functions"];
  const EXTENSIONS = new Set([".ts", ".tsx", ".js", ".mjs", ".jsx", ".md", ".json"]);
  const SKIP_DIR_NAMES = new Set(["node_modules", ".next", "dist", "coverage"]);
  const GALAXIA_EMAIL = /[A-Za-z0-9._%+\-]+@galaxia[A-Za-z0-9.\-]*\.(?:com|app|io|net|org|dev|me)\b/g;
  const OTHER_GALAXIA_HOST = /\bgalaxia(?!mea\.com)[a-z0-9-]*\.(?:com|app|io|net|org|dev|me)\b/gi;

  function walk(relRoot: string): string[] {
    const absRoot = join(REPO_ROOT, relRoot);
    if (!existsSync(absRoot)) return [];
    const files: string[] = [];
    const stack = [absRoot];
    while (stack.length) {
      const dir = stack.pop()!;
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const abs = join(dir, entry.name);
        if (entry.isDirectory()) {
          if (SKIP_DIR_NAMES.has(entry.name)) continue;
          stack.push(abs);
          continue;
        }
        if (!EXTENSIONS.has(entry.name.slice(entry.name.lastIndexOf(".")))) continue;
        files.push(abs);
      }
    }
    return files;
  }

  function isBundleId(src: string, index: number): boolean {
    return src.slice(Math.max(0, index - 4), index) === "com.";
  }

  it("the one exported contact address is the help inbox", () => {
    expect(GALAXIA_HELP_EMAIL).toBe(["help@", "galaxiamea.com"].join(""));
    const src = readFileSync(join(REPO_ROOT, CONTACT_FILE), "utf8");
    expect(src).toContain(`export const GALAXIA_HELP_EMAIL = "${GALAXIA_HELP_EMAIL}"`);
  });

  it("no Galaxia email literal appears outside packages/core/src/contact.ts", () => {
    const hits: string[] = [];
    for (const root of SCAN_ROOTS) {
      for (const abs of walk(root)) {
        const rel = abs.slice(REPO_ROOT.length + 1);
        if (rel === CONTACT_FILE) continue;
        const src = readFileSync(abs, "utf8");
        for (const match of src.matchAll(GALAXIA_EMAIL)) {
          hits.push(`${rel}: ${match[0]}`);
        }
      }
    }
    expect(hits, hits.join("\n")).toEqual([]);
  });

  it("no galaxia host other than galaxiamea.com appears except reverse-DNS bundle ids", () => {
    const hits: string[] = [];
    for (const root of SCAN_ROOTS) {
      for (const abs of walk(root)) {
        const rel = abs.slice(REPO_ROOT.length + 1);
        const src = readFileSync(abs, "utf8");
        for (const match of src.matchAll(OTHER_GALAXIA_HOST)) {
          if (isBundleId(src, match.index ?? 0)) continue;
          hits.push(`${rel}: ${match[0]}`);
        }
      }
    }
    expect(hits, hits.join("\n")).toEqual([]);
  });
});

describe("public sitemap routes are unchanged by this relabel", () => {
  it("still lists the public paths, including /for-work and /press from main", () => {
    const src = readWeb("app/sitemap.ts");
    const routesBlock = src.match(/const routes = \[([\s\S]*?)\];/)?.[1] ?? "";
    expect(routesBlock).toContain('"/why-galaxia"');
    expect(routesBlock).toContain('"/generations"');
    expect(routesBlock).toContain('"/meet-vela"');
    expect(routesBlock).toContain('"/for-work"');
    expect(routesBlock).toContain('"/press"');
    expect(routesBlock).toContain('"/security"');
    expect(routesBlock).toContain('"/pricing"');
    expect(routesBlock).toContain('"/blog"');
    expect(routesBlock).toContain('"/privacy"');
    expect(routesBlock).toContain('"/terms"');
    expect(routesBlock).toContain('"/download"');
    expect(routesBlock).toContain('"/chart"');
    expect(routesBlock).toContain('"/chart/compare"');
  });
});


import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  APP_NAV_ACTIONS,
  APP_NAV_BRAND_HREF,
  APP_NAV_LINKS,
  EMAIL_PATHS,
  EMPTY_STATE_SETTINGS_HREF,
  EMPTY_STATE_WELCOME_HREF,
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
    const quickChart = MARKETING_NAV_LINKS.find((l) => l.label === "Quick Chart");
    expect(quickChart?.href).toBe("/chart");
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

  it("Quick Chart in the app nav points at /chart because /app/chart does not exist", () => {
    const quickChart = APP_NAV_LINKS.find((l) => l.label === "Quick Chart");
    expect(quickChart?.href).toBe("/chart");
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

describe("retired Quick Chart paths redirect in next.config", () => {
  it("permanently sends /quick-chart and /app/quick-chart to /chart", () => {
    const src = readFileSync(join(WEB_ROOT, "next.config.mjs"), "utf8");
    expect(src).toMatch(/source:\s*["']\/quick-chart["']/);
    expect(src).toMatch(/source:\s*["']\/app\/quick-chart["']/);
    expect(src).toMatch(/destination:\s*["']\/chart["']/);
    expect(src).toMatch(/permanent:\s*true/);
    expect(src).not.toContain("vercel.json");
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
      "/security",
      "/pricing",
      "/chart",
      "/download",
      "/blog",
      "/privacy",
      "/terms",
    ]);
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
    assertRendersFromConfig(readWeb("app/chart/quick-chart-page.tsx"), ["RELATED_LINKS.chart", "CHART_MODE_COMPARE"], "quick-chart leftover literal");
    assertRendersFromConfig(readWeb("app/chart/compare/page.tsx"), ["RELATED_LINKS.chartCompare", "CHART_MODE_SINGLE"], "quick-compare leftover literal");
  });

  it("hero, close, pricing, teasers, and 404 CTAs render from the exported config", () => {
    assertRendersFromConfig(
      readWeb("components/marketing/hero.tsx"),
      ["MARKETING_NAV_SIGNUP", "MARKETING_NAV_LOGIN", "HERO_HOW_IT_WORKS"],
      "hero leftover literal",
    );
    assertRendersFromConfig(readWeb("components/marketing/close-section.tsx"), ["MARKETING_NAV_SIGNUP"], "close-section leftover literal");
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
  });

  it("empty-state surfaces render from the exported hrefs", () => {
    assertRendersFromConfig(
      readWeb("components/constellation-starfield-skeleton.tsx"),
      ["EMPTY_STATE_WELCOME_HREF"],
      "constellation empty leftover literal",
    );
    assertRendersFromConfig(
      readWeb("components/relational-transit-feed.tsx"),
      ["EMPTY_STATE_SETTINGS_HREF"],
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
      readWeb("app/app/person/[id]/page.tsx"),
      ["EMPTY_STATE_WELCOME_HREF"],
      "person empty leftover literal",
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


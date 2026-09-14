import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  APP_NAV_ACTIONS,
  APP_NAV_BRAND_HREF,
  APP_NAV_LINKS,
  MARKETING_NAV_ACTIONS,
  MARKETING_NAV_BRAND_HREF,
  MARKETING_NAV_LINKS,
  appNavInternalHrefs,
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
 */

const REPO_ROOT = join(__dirname, "..", "..", "..");
const WEB_APP_DIR = join(REPO_ROOT, "apps/web/app");
const WEB_ROOT = join(REPO_ROOT, "apps/web");

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

function assertEveryHrefResolves(hrefs: string[], label: string, { allowEmpty = false }: { allowEmpty?: boolean } = {}) {
  if (!allowEmpty) {
    expect(hrefs.length, `${label} should export at least one href`).toBeGreaterThan(0);
  }
  for (const href of hrefs) {
    const page = pageFileForHref(href);
    expect(
      existsSync(page),
      `${label} href "${href}" has no page file at ${page.replace(`${REPO_ROOT}/`, "")}`,
    ).toBe(true);
  }
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

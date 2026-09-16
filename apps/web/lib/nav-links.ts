/**
 * Single source of truth for internal hrefs the marketing nav, authed app
 * nav, site footer, related-link CTAs, empty states, and emails render.
 * Kept as plain data (no React, no next/link) so a node vitest can import
 * it and assert each href maps to a real App Router page file. Consumers
 * import these arrays instead of hardcoding a second copy.
 */

export type NavLink = { href: string; label: string };

export const MARKETING_NAV_BRAND_HREF = "/";

export const MARKETING_NAV_LINKS: NavLink[] = [
  { href: "/why-galaxia", label: "How it works" },
  { href: "/generations", label: "Your people" },
  { href: "/meet-vela", label: "Ask Vela" },
  { href: "/chart", label: "Free chart" },
  { href: "/blog", label: "Blog" },
  { href: "/pricing", label: "Pricing" },
];

export const MARKETING_NAV_LOGIN: NavLink = { href: "/login", label: "Log in" };
export const MARKETING_NAV_SIGNUP: NavLink = { href: "/signup", label: "Start 14 days free" };
export const MARKETING_NAV_ACTIONS: NavLink[] = [MARKETING_NAV_LOGIN, MARKETING_NAV_SIGNUP];

export const APP_NAV_BRAND_HREF = "/app";

export const APP_NAV_LINKS: NavLink[] = [
  { href: "/app", label: "Home" },
  { href: "/app/compare", label: "Compare" },
  { href: "/app/groups", label: "Groups" },
  { href: "/app/vela", label: "Vela" },
  { href: "/app/settings", label: "Settings" },
  // Public route. There is no /app/chart page. The free chart stays on /chart
  // so the SEO URL is not split; that page renders the app nav when a session
  // is present so a signed-in viewer never leaves the product.
  { href: "/chart", label: "Free chart" },
  { href: "/blog", label: "Blog" },
];

export const APP_NAV_ACCOUNT: NavLink = { href: "/account", label: "Account" };
export const APP_NAV_ACTIONS: NavLink[] = [APP_NAV_ACCOUNT];

export const SITE_FOOTER_LINKS: NavLink[] = [
  { href: "/why-galaxia", label: "How it works" },
  { href: "/generations", label: "Your people" },
  { href: "/meet-vela", label: "Ask Vela" },
  { href: "/for-work", label: "For work" },
  { href: "/security", label: "Security" },
  { href: "/pricing", label: "Pricing" },
  { href: "/chart", label: "Free chart" },
  { href: "/download", label: "Download" },
  { href: "/blog", label: "Blog" },
  { href: "/glossary", label: "Glossary" },
  { href: "/press", label: "Press" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

/**
 * Published blog articles that hardcoded CTAs point at. Served by
 * `app/[slug]/page.tsx`, not a static `app/<slug>/page.tsx`. The resolve
 * test matches these by explicit allowlist, never by treating the catch-all
 * as a match for an arbitrary path.
 */
export const SYNASTRY_CHART_MEANING_HREF = "/synastry-chart-meaning";
export const SUN_SIGN_NOT_PERSONALITY_HREF = "/sun-sign-not-personality";

export const PUBLISHED_BLOG_POST_HREFS: readonly string[] = [
  SYNASTRY_CHART_MEANING_HREF,
  SUN_SIGN_NOT_PERSONALITY_HREF,
];

export const FOR_WORK_CHART_CTA: NavLink = { href: "/chart", label: "Try a free chart" };
export const PRICING_FREE_CHART_CTA: NavLink = { href: "/chart", label: "Run a real chart" };

export const RELATED_LINKS = {
  whyGalaxia: [
    { href: "/chart", label: "Try a free chart" },
    { href: "/chart/compare", label: "Compare your chart with someone's" }, // FOUNDER-REVIEW
    { href: "/generations", label: "See how it works across a whole family" },
  ],
  whyGalaxiaBlog: [
    { href: SYNASTRY_CHART_MEANING_HREF, label: "What synastry actually measures" },
  ],
  generations: [
    { href: "/meet-vela", label: "Ask Vela about generational patterns" },
    { href: "/security", label: "How we protect your family's data" },
  ],
  generationsBlog: [
    { href: SYNASTRY_CHART_MEANING_HREF, label: "What synastry actually measures" },
  ],
  meetVela: [
    { href: "/why-galaxia", label: "See how Galaxia computes your chart" },
    { href: "/pricing", label: "See what's included in your plan" },
  ],
  security: [
    { href: "/privacy", label: "Read our full privacy policy" },
    { href: "/pricing", label: "See pricing" },
  ],
  pricing: [
    PRICING_FREE_CHART_CTA,
    { href: "/why-galaxia", label: "See what you're getting" },
    { href: "/meet-vela", label: "Meet Vela, your AI guide" },
  ],
  chart: [
    { href: SYNASTRY_CHART_MEANING_HREF, label: "What synastry actually measures" },
    { href: "/why-galaxia", label: "Why Galaxia reads real charts, not sun signs" },
  ],
  chartCompare: [
    { href: SYNASTRY_CHART_MEANING_HREF, label: "What a synastry chart actually tells you" },
    { href: "/generations", label: "See the generational layer behind two charts" }, // FOUNDER-REVIEW
  ],
  forWork: [
    { href: "/chart", label: "Try a free chart" },
    { href: "/generations", label: "See how the generational layer works" },
    { href: "/meet-vela", label: "Ask Vela before a hard conversation" },
    { href: "/pricing", label: "See what's included" },
    { href: SUN_SIGN_NOT_PERSONALITY_HREF, label: "Your sun sign is not your personality" },
  ],
  press: [
    { href: "/why-galaxia", label: "Why Galaxia exists" },
    { href: "/for-work", label: "Galaxia for work" },
    { href: "/security", label: "Privacy and data" },
  ],
  glossary: [
    { href: "/blog", label: "Read the guides these terms come from" },
    { href: "/chart", label: "See a natal chart in this vocabulary" },
    { href: SYNASTRY_CHART_MEANING_HREF, label: "What a synastry chart actually tells you" },
  ],
} as const satisfies Record<string, readonly NavLink[]>;

export const FEATURE_TEASER_LINKS: NavLink[] = [
  { href: "/why-galaxia", label: "How it works" },
  { href: "/generations", label: "Your people" },
  { href: "/meet-vela", label: "Ask Vela" },
  { href: "/security", label: "See how we protect you" },
  { href: "/pricing", label: "View pricing" },
];

export const HERO_HOW_IT_WORKS: NavLink = { href: "/#how", label: "See how it works" };

export const NOT_FOUND_LINKS: NavLink[] = [
  { href: "/", label: "Back to home" },
  { href: "/chart", label: "Try a free chart" },
];

export const SHARE_NOT_FOUND_CTA: NavLink = { href: "/chart", label: "Try a free chart" };

export const CHART_MODE_SINGLE: NavLink = { href: "/chart", label: "Single chart" };
export const CHART_MODE_COMPARE: NavLink = { href: "/chart/compare", label: "Compare two charts" }; // FOUNDER-REVIEW

/**
 * Profile of one saved person. Dynamic `[id]` segment, so this is a builder
 * rather than a static NavLink. Used by the signed-in Quick Chart save CTA.
 */
export const PERSON_PROFILE_HREF_PREFIX = "/app/person/";

export function personProfileHref(personId: string): string {
  return `${PERSON_PROFILE_HREF_PREFIX}${personId}`;
}

/** The Moment loop. Optional personId skips the first tap. */
export const CAPTURE_MOMENT_HREF = "/app/moment";

export function captureMomentHref(personId?: string | null): string {
  if (!personId) return CAPTURE_MOMENT_HREF;
  return `${CAPTURE_MOMENT_HREF}?personId=${encodeURIComponent(personId)}`;
}

/** Logged-out Quick Chart save: carry birth data through signup into /welcome. */
export function signupWithNextHref(nextPath: string): string {
  return `${MARKETING_NAV_SIGNUP.href}?next=${encodeURIComponent(nextPath)}`;
}

/** Inverse of signupWithNextHref: keep `next` when the visitor flips to login. */
export function loginWithNextHref(nextPath: string): string {
  return `${MARKETING_NAV_LOGIN.href}?next=${encodeURIComponent(nextPath)}`;
}

export const EMPTY_STATE_WELCOME_HREF = "/welcome";
/**
 * Re-entry into first-run orientation for someone who skipped it. `restart=1`
 * is what re-opens a settled flow; without it /welcome sends a settled account
 * straight back to the constellation.
 */
export const FIRST_RUN_RESTART_HREF = "/welcome?restart=1";
export const EMPTY_STATE_SETTINGS_HREF = "/app/settings";
export const THIS_WEEK_HREF = "/app/this-week";
export const TODAY_SKY_HREF = "/app#today-in-your-sky";

export const SETTINGS_CANCEL_HREF = "/account/cancel?from=settings";

export const EMAIL_PATHS = {
  welcome: "/welcome",
  compare: "/app/compare",
  subscribe: "/subscribe",
  app: "/app",
  notifications: "/account/notifications",
} as const;

export function marketingNavInternalHrefs(): string[] {
  return uniqueHrefs([
    MARKETING_NAV_BRAND_HREF,
    ...MARKETING_NAV_LINKS.map((l) => l.href),
    ...MARKETING_NAV_ACTIONS.map((l) => l.href),
  ]);
}

export function appNavInternalHrefs(): string[] {
  return uniqueHrefs([
    APP_NAV_BRAND_HREF,
    ...APP_NAV_LINKS.map((l) => l.href),
    ...APP_NAV_ACTIONS.map((l) => l.href),
  ]);
}

export function footerInternalHrefs(): string[] {
  return uniqueHrefs(SITE_FOOTER_LINKS.map((l) => l.href));
}

export function ctaInternalHrefs(): string[] {
  return uniqueHrefs([
    ...Object.values(RELATED_LINKS).flatMap((links) => links.map((l) => l.href)),
    ...FEATURE_TEASER_LINKS.map((l) => l.href),
    MARKETING_NAV_SIGNUP.href,
    MARKETING_NAV_LOGIN.href,
    HERO_HOW_IT_WORKS.href,
    FOR_WORK_CHART_CTA.href,
    PRICING_FREE_CHART_CTA.href,
    ...NOT_FOUND_LINKS.map((l) => l.href),
    SHARE_NOT_FOUND_CTA.href,
    CHART_MODE_SINGLE.href,
    CHART_MODE_COMPARE.href,
    SETTINGS_CANCEL_HREF,
    EMAIL_PATHS.subscribe,
  ]);
}

export function emptyStateInternalHrefs(): string[] {
  return uniqueHrefs([
    EMPTY_STATE_WELCOME_HREF,
    FIRST_RUN_RESTART_HREF,
    EMPTY_STATE_SETTINGS_HREF,
    THIS_WEEK_HREF,
    TODAY_SKY_HREF,
  ]);
}

export function emailInternalHrefs(): string[] {
  return uniqueHrefs(Object.values(EMAIL_PATHS));
}

export function isPublishedBlogPostHref(href: string): boolean {
  const path = href.split("?")[0].split("#")[0];
  return PUBLISHED_BLOG_POST_HREFS.includes(path);
}

function uniqueHrefs(hrefs: string[]): string[] {
  return [...new Set(hrefs)];
}

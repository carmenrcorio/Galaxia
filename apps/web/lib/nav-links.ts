/**
 * Single source of truth for every internal href the marketing nav and the
 * authed app nav render. Kept as plain data (no React, no next/link) so a
 * node vitest can import it and assert each href maps to a real App Router
 * page file. Both nav components import these arrays instead of hardcoding
 * a second copy.
 */

export type NavLink = { href: string; label: string };

export const MARKETING_NAV_BRAND_HREF = "/";

export const MARKETING_NAV_LINKS: NavLink[] = [
  { href: "/why-galaxia", label: "Why Galaxia" },
  { href: "/generations", label: "Generations" },
  { href: "/meet-vela", label: "Meet Vela" },
  { href: "/chart", label: "Quick Chart" },
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
  // Public route. There is no /app/chart page, so Quick Chart stays on the
  // live free chart at /chart rather than a dead in-app path.
  { href: "/chart", label: "Quick Chart" },
  { href: "/blog", label: "Blog" },
];

export const APP_NAV_ACCOUNT: NavLink = { href: "/account", label: "Account" };
export const APP_NAV_ACTIONS: NavLink[] = [APP_NAV_ACCOUNT];

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

function uniqueHrefs(hrefs: string[]): string[] {
  return [...new Set(hrefs)];
}

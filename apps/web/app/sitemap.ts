import type { MetadataRoute } from "next";
import { publicEnv } from "../lib/env";

// Same base URL as `metadataBase` in app/layout.tsx (see PR #153) — falls back
// to the prod URL when NEXT_PUBLIC_SITE_URL is unset, so this never emits
// relative/broken <loc> entries.
const SITE_URL = publicEnv.siteUrl || "https://galaxia-three.vercel.app";

/**
 * Every real, public, indexable route. Deliberately excludes:
 *   - /admin/** (internal only)
 *   - /account/**, /app/**, /welcome, /start, /subscribe (auth-gated —
 *     middleware.ts redirects a signed-out visitor to /login for all of these)
 *   - /invite/[token], /s/[token], /r/[slug] (per-invite/per-share/
 *     per-referral pages, not general content — see route comments)
 *   - /auth/callback (an OAuth redirect target, not a page)
 * `/pricing` is a homepage anchor (`#pricing`), not a route — see
 * components/marketing/site-footer.tsx — so it is covered by `/` below.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["/", "/synastry-chart-meaning", "/privacy", "/terms", "/download", "/login", "/signup", "/chart", "/chart/compare"];

  return routes.map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified: new Date()
  }));
}

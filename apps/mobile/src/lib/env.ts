/**
 * Mobile public env reads (the `apps/web/lib/env.ts` counterpart).
 *
 * Reads use the same defensive `globalThis.process?.env` accessor already used
 * by `src/lib/supabase.ts` and `app/(app)/vela.tsx`. `EXPO_PUBLIC_*` values are
 * inlined into the bundle by Metro at build time, so the read happens inside
 * each function rather than at module scope: that is what lets a caller decide
 * whether a missing value is fatal, and it keeps these helpers testable.
 *
 * Why this cannot fall back to a default: `apps/web` resolves a missing
 * `NEXT_PUBLIC_SITE_URL` against `window.location.origin`, and a native client
 * has no such origin. Inventing one would ship a link that silently points at
 * the wrong host, which ENGINEERING.md §12 forbids. So a missing site URL
 * fails with a message naming the variable (§6) instead of degrading.
 *
 * The throw is deliberately lazy. Unlike `supabase.ts`, which throws at module
 * scope because nothing in the app works without a backend, `requireSiteUrl` is
 * called at the moment a link is actually assembled. A build that never opens a
 * web link is not bricked at startup by a variable it does not use.
 */

export const SITE_URL_VAR = "EXPO_PUBLIC_SITE_URL";

function readEnv(): Record<string, string | undefined> {
  return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
}

/**
 * The configured Galaxia web origin with any trailing slashes removed, or
 * `null` when the variable is unset or blank. Never a fabricated default.
 * Callers that can degrade honestly (render no link) use this; callers that
 * must produce a URL use `requireSiteUrl`.
 */
export function siteUrl(): string | null {
  const trimmed = readEnv()[SITE_URL_VAR]?.trim();
  if (!trimmed) return null;
  return trimmed.replace(/\/+$/, "");
}

/**
 * The readable "missing variable" message, per ENGINEERING.md §6. Names the
 * exact variable and what it is for. Developer-facing only: never rendered to
 * a user, per §7.
 */
export function missingSiteUrlMessage(): string {
  return `Missing ${SITE_URL_VAR} in environment. Set it to the Galaxia web origin (for example https://galaxiamea.com) so the app can build a shareable web link.`;
}

/** The web origin, or a thrown error naming `EXPO_PUBLIC_SITE_URL`. */
export function requireSiteUrl(): string {
  const base = siteUrl();
  if (!base) {
    throw new Error(missingSiteUrlMessage());
  }
  return base;
}

/**
 * Builds an absolute galaxiamea.com URL for a path on the web app, e.g.
 * `siteUrlFor("connect/abc123")`. Throws when the site URL is unset rather
 * than returning a relative or half-formed link.
 */
export function siteUrlFor(path: string): string {
  const base = requireSiteUrl();
  const suffix = path.replace(/^\/+/, "");
  return suffix ? `${base}/${suffix}` : base;
}

/**
 * Mobile public env reads (the `apps/web/lib/env.ts` counterpart).
 *
 * ## Why the read is written this exact way
 *
 * `EXPO_PUBLIC_*` values are not read from the device at runtime. In a
 * production bundle they exist only because `babel-preset-expo`'s
 * `expo-inline-production-environment-variables` plugin rewrote them into
 * string literals at build time, and that plugin fires on one syntactic shape
 * only: a member expression whose object matches the pattern `process.env`
 * with a literal `EXPO_PUBLIC_`-prefixed key. Reading through a local alias
 * (`const env = globalThis.process?.env; env.EXPO_PUBLIC_SITE_URL`) or through
 * a computed key (`env[SITE_URL_VAR]`) is invisible to it, and
 * `@expo/metro-config`'s serializer injects the runtime `process.env` object
 * in development only. Either of those shapes therefore yields `undefined` in
 * a release build even when the variable is correctly set in EAS.
 *
 * So the access below is a deliberate literal `process.env.EXPO_PUBLIC_SITE_URL`,
 * kept behind a `typeof process` guard for environments that have no `process`
 * at all. `SITE_URL_VAR` exists to name the variable in messages and tests; it
 * is never used as a lookup key, because a computed key would break the inline.
 *
 * ## Why there is no fallback value
 *
 * `apps/web` resolves a missing `NEXT_PUBLIC_SITE_URL` against
 * `window.location.origin`, and a native client has no such origin. Inventing
 * one would ship a link that silently points at the wrong host, which
 * ENGINEERING.md §12 forbids. A missing site URL therefore fails with a message
 * naming the variable (§6) instead of degrading.
 *
 * ## Why the throw is lazy
 *
 * Unlike `supabase.ts`, which throws at module scope because nothing in the app
 * works without a backend, `requireSiteUrl` is called at the moment a link is
 * actually assembled. A build that never opens a web link is not bricked at
 * startup by a variable it does not use.
 */

/** The variable's name, for messages and tests. Never used as a lookup key. */
export const SITE_URL_VAR = "EXPO_PUBLIC_SITE_URL";

function readSiteUrlVar(): string | undefined {
  if (typeof process === "undefined" || !process.env) return undefined;
  // Must stay a literal `process.env.EXPO_PUBLIC_SITE_URL` access. See above.
  return process.env.EXPO_PUBLIC_SITE_URL;
}

/**
 * The configured Galaxia web origin with any trailing slashes removed, or
 * `null` when the variable is unset or blank. Never a fabricated default.
 * Callers that can degrade honestly (render no link) use this; callers that
 * must produce a URL use `requireSiteUrl`.
 */
export function siteUrl(): string | null {
  const trimmed = readSiteUrlVar()?.trim();
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

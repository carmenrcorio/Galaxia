/**
 * The one place that decides whether a `next` (post-auth redirect) value is
 * safe to hand to a real redirect. `/auth/callback` (server), the login
 * form, and the signup form (both its client-side push AND the
 * `emailRedirectTo` it embeds in the confirmation email) all funnel through
 * this so there is exactly one definition of "safe" — a second inline check
 * anywhere else is exactly how the open redirect this closes got missed in
 * the first place.
 *
 * Deliberately character-based, not `new URL(...)`-based: `new URL(next,
 * base)` is what let an absolute or protocol-relative `next` override the
 * base in the first place, so re-parsing with the same constructor to
 * validate would just reintroduce the bug via a different code path.
 *
 * Rejects, in order:
 *   - empty / missing                 -> not a path at all
 *   - a second leading "/" or "\"     -> protocol-relative (//evil.com) and
 *                                        the browser's backslash-as-slash
 *                                        quirk (/\evil.com)
 *   - any "://" substring             -> an absolute URL with a scheme
 *                                        (https://evil.com), wherever it
 *                                        appears in the string
 * Anything else starts with exactly one "/" and has no way to name a
 * different origin, so it is returned unchanged — internal paths and their
 * query strings (e.g. /app/person/123?x=1) must survive untouched.
 */
export function safeNextPath(next: string | null | undefined, fallback = "/start"): string {
  if (!next) return fallback;
  if (next[0] !== "/") return fallback;
  const second = next[1];
  if (second === "/" || second === "\\") return fallback;
  if (next.includes("://")) return fallback;
  return next;
}

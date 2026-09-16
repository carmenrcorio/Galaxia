/**
 * Homepage title and description. `app/page.tsx` metadata (title, meta
 * description, Open Graph, Twitter) uses these two constants. The
 * SoftwareApplication JSON-LD `description` is a separate sentence
 * (`HOMEPAGE_JSON_LD_DESCRIPTION`): stuffing the tagline into schema.org
 * copy reads as a slogan, not a product description.
 */

export const HOMEPAGE_TAGLINE = "Your Life. Your People. Your Galaxy.";

export const HOMEPAGE_TITLE = "Your Life. Your People. Your Galaxy. | Galaxia";

/**
 * Homepage meta description, og:description, and twitter:description.
 * The three locked clauses stay intact; astrology vocabulary stays
 * because metadata is layer two (ENGINEERING.md §17).
 */
export const HOMEPAGE_DESCRIPTION =
  "Your Life. Your People. Your Galaxy. Galaxia computes the real birth chart of everyone in your life (your partner, your parents, your friends, the ones you have lost) and tells you what each of them needs from you. Real astrology, plain language, no horoscopes.";

/**
 * Accurate SoftwareApplication JSON-LD description. Same claim as the
 * page description, without the tagline prefix.
 */
export const HOMEPAGE_JSON_LD_DESCRIPTION =
  "Galaxia computes the real birth chart of everyone in your life (your partner, your parents, your friends, the ones you have lost) and tells you what each of them needs from you. Real astrology, plain language, no horoscopes.";

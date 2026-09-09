import { SIGN_GLYPH } from "../../lib/design";

/**
 * Purely decorative zodiac glyph strip for the /blog index — the same
 * SIGN_GLYPH unicode set the chart wheel uses on /chart and /compare
 * (see components/chart-wheel.tsx), faded to a low-contrast trail along the
 * top edge rather than rendered as a functional wheel. Gives the blog the
 * same "astrology" visual signature as the rest of the product instead of
 * reading like a generic dark-mode content template.
 *
 * aria-hidden: decoration only, adds nothing a screen reader user needs.
 */
const SIGNS_ORDER = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
];

export function BlogZodiacTrail() {
  return (
    <div className="blog-zodiac-trail" aria-hidden="true">
      {SIGNS_ORDER.map((sign, i) => {
        // Gentle organic wave rather than a flat identical row — alternating
        // vertical offset and a slow opacity ramp left-to-right.
        const rise = i % 2 === 0 ? 0 : 7;
        const fade = 0.16 + (i / (SIGNS_ORDER.length - 1)) * 0.14;
        return (
          <span
            key={sign}
            className="blog-zodiac-trail-glyph"
            style={{ transform: `translateY(${rise}px)`, opacity: fade }}
          >
            {SIGN_GLYPH[sign]}
          </span>
        );
      })}
    </div>
  );
}

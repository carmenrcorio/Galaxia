/**
 * Sign, planet, and aspect glyphs — from design/reference/galaxia.jsx
 * (SIGN / PLANET / ASPGLY). One map for web SVG and mobile react-native-svg.
 */

import { elementOfSign, normalizeZodiacSign, type ChipElement } from "./person-chip-color";

export const SIGN_GLYPH: Record<string, string> = {
  Aries: "\u2648",
  Taurus: "\u2649",
  Gemini: "\u264A",
  Cancer: "\u264B",
  Leo: "\u264C",
  Virgo: "\u264D",
  Libra: "\u264E",
  Scorpio: "\u264F",
  Sagittarius: "\u2650",
  Capricorn: "\u2651",
  Aquarius: "\u2652",
  Pisces: "\u2653",
};

export const BODY_GLYPH: Record<string, string> = {
  Sun: "\u2609",
  Moon: "\u263D",
  Mercury: "\u263F",
  Venus: "\u2640",
  Mars: "\u2642",
  Jupiter: "\u2643",
  Saturn: "\u2644",
  Uranus: "\u2645",
  Neptune: "\u2646",
  Pluto: "\u2647",
  sun: "\u2609",
  moon: "\u263D",
  mercury: "\u263F",
  venus: "\u2640",
  mars: "\u2642",
  jupiter: "\u2643",
  saturn: "\u2644",
  uranus: "\u2645",
  neptune: "\u2646",
  pluto: "\u2647",
};

export const ASPECT_GLYPH: Record<string, string> = {
  conjunction: "\u260C",
  sextile: "\u26B9",
  square: "\u25A1",
  trine: "\u25B3",
  opposition: "\u260D",
};

/**
 * Element for a free-text sign. Unknown names fall through to water, matching
 * the historical web helper so a mistyped placement never throws.
 */
export function signElement(sign: string): ChipElement {
  const known = normalizeZodiacSign(sign);
  return known ? elementOfSign(known) : "water";
}

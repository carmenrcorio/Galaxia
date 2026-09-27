import type { ZodiacSign } from "./person-chip-color";

/**
 * Stone hues for the sign-reference card. These are visual identifiers, not
 * additional astrological claims; the associated stone names remain owned by
 * `@galaxia/astro` sign metadata.
 */
export const BIRTHSTONE_COLORS: Readonly<Record<ZodiacSign, string>> = {
  Aries: "#E8EEF2",
  Taurus: "#50A878",
  Gemini: "#C98F65",
  Cancer: "#C9D6E4",
  Leo: "#A7C957",
  Virgo: "#4F6FB2",
  Libra: "#D8B4C8",
  Scorpio: "#D89A4C",
  Sagittarius: "#40B7B2",
  Capricorn: "#7B1E32",
  Aquarius: "#9966CC",
  Pisces: "#7CCBD1",
};

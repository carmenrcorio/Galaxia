/**
 * Design utilities
 * Glyph maps ported from design/reference/galaxia.jsx (SIGN, PLANET, ASPGLY).
 * Avatar palette from landing .avatar gradient patterns.
 */

/* Deterministic avatar colour class from name hash */
export function avatarColorClass(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return `av-${Math.abs(hash) % 6}`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]?.charAt(0).toUpperCase() ?? "?";
  return ((parts[0]?.charAt(0) ?? "") + (parts[parts.length - 1]?.charAt(0) ?? "")).toUpperCase();
}

/* Sign glyphs — from galaxia.jsx SIGN object (unicode codepoints) */
export const SIGN_GLYPH: Record<string, string> = {
  Aries: "\u2648", Taurus: "\u2649", Gemini: "\u264A", Cancer: "\u264B",
  Leo: "\u264C", Virgo: "\u264D", Libra: "\u264E", Scorpio: "\u264F",
  Sagittarius: "\u2650", Capricorn: "\u2651", Aquarius: "\u2652", Pisces: "\u2653"
};

/* Planet glyphs — from galaxia.jsx PLANET object */
export const BODY_GLYPH: Record<string, string> = {
  Sun: "\u2609", Moon: "\u263D", Mercury: "\u263F", Venus: "\u2640", Mars: "\u2642",
  Jupiter: "\u2643", Saturn: "\u2644", Uranus: "\u2645", Neptune: "\u2646", Pluto: "\u2647",
  // lower-case variants for engine output
  sun: "\u2609", moon: "\u263D", mercury: "\u263F", venus: "\u2640", mars: "\u2642",
  jupiter: "\u2643", saturn: "\u2644", uranus: "\u2645", neptune: "\u2646", pluto: "\u2647",
};

/* Aspect glyphs — from galaxia.jsx ASPGLY */
export const ASPECT_GLYPH: Record<string, string> = {
  conjunction: "\u260C", sextile: "\u26B9", square: "\u25A1",
  trine: "\u25B3", opposition: "\u260D"
};

/* Aspect one-liners — from galaxia.jsx ASPLINE */
export const ASPECT_LINE: Record<string, string> = {
  conjunction:  "fused — one charged focus",
  sextile:      "easy, supportive talent",
  square:       "inner friction that drives growth",
  trine:        "natural, effortless gift",
  opposition:   "a balancing act, pulled two ways",
};

/* Element for a sign */
export function signElement(sign: string): "fire" | "earth" | "air" | "water" {
  if (["Aries","Leo","Sagittarius"].includes(sign)) return "fire";
  if (["Taurus","Virgo","Capricorn"].includes(sign)) return "earth";
  if (["Gemini","Libra","Aquarius"].includes(sign)) return "air";
  return "water";
}

/**
 * Qualitative label for a synastry score.
 * Bands are deliberately wide to avoid false precision, but distinct enough
 * that genuinely different scores (e.g. 30 vs 55) produce different words.
 *
 * Distribution: ≥76 Effortless, ≥65 Easy & warm, ≥54 Workable, ≥43 Tender,
 * ≥32 Some friction, <32 Charged
 */
export function compatWord(score: number): { word: string; cls: string } {
  if (score >= 76) return { word: "Effortless",     cls: "compat-high" };
  if (score >= 65) return { word: "Easy & warm",    cls: "compat-high" };
  if (score >= 54) return { word: "Workable",        cls: "compat-mid"  };
  if (score >= 43) return { word: "Tender",          cls: "compat-mid"  };
  if (score >= 32) return { word: "Some friction",   cls: "compat-low"  };
  return              { word: "Charged",          cls: "compat-low"  };
}

/* Dimension display labels — from galaxia.jsx DIM_LABEL */
export const COMPAT_LABELS: Record<string, string> = {
  overall:       "Overall",
  emotional:     "Emotional ease",
  communication: "Communication",
  warmth:        "Warmth",
  values:        "Shared values",
  stability:     "Stability",
};


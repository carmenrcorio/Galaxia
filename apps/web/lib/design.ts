/**
 * Deterministic avatar color from name string.
 * Returns a CSS class name: av-0 through av-5
 */
export function avatarColorClass(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return `av-${Math.abs(hash) % 6}`;
}

/** Initial(s) from a display name */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]?.charAt(0).toUpperCase() ?? "?";
  return ((parts[0]?.charAt(0) ?? "") + (parts[parts.length - 1]?.charAt(0) ?? "")).toUpperCase();
}

/** Zodiac glyph symbol map */
export const SIGN_GLYPH: Record<string, string> = {
  Aries: "♈", Taurus: "♉", Gemini: "♊", Cancer: "♋",
  Leo: "♌", Virgo: "♍", Libra: "♎", Scorpio: "♏",
  Sagittarius: "♐", Capricorn: "♑", Aquarius: "♒", Pisces: "♓"
};

/** Planet glyph symbol map */
export const BODY_GLYPH: Record<string, string> = {
  sun: "☉", moon: "☽", mercury: "☿", venus: "♀",
  mars: "♂", jupiter: "♃", saturn: "♄", uranus: "♅",
  neptune: "♆", pluto: "♇", asc: "AC", mc: "MC"
};

/** Element for a zodiac sign */
export function signElement(sign: string): "fire" | "earth" | "air" | "water" {
  if (["Aries","Leo","Sagittarius"].includes(sign)) return "fire";
  if (["Taurus","Virgo","Capricorn"].includes(sign)) return "earth";
  if (["Gemini","Libra","Aquarius"].includes(sign)) return "air";
  return "water";
}

/** Map a 0-100 compatibility score to a colored word */
export function compatWord(score: number): { word: string; cls: string } {
  if (score >= 72) return { word: "Effortless", cls: "compat-high" };
  if (score >= 58) return { word: "Workable",   cls: "compat-mid"  };
  if (score >= 44) return { word: "Tender",     cls: "compat-mid"  };
  return              { word: "Charged",     cls: "compat-low"  };
}

/** Dimension labels for the compat grid */
export const COMPAT_LABELS: Record<string, string> = {
  overall: "Overall", emotional: "Emotional", communication: "Communication",
  warmth: "Warmth", values: "Values", stability: "Stability"
};

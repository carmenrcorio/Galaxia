/**
 * Template-based interpretation copy for placements.
 * One warm one-liner per body × sign, used on the person detail page.
 * No LLM needed — instant, deterministic, zero cost.
 */

type BodyKey = "sun" | "moon" | "mercury" | "venus" | "mars" | "jupiter" | "saturn" | "uranus" | "neptune" | "pluto";

const BODY_LABEL: Record<BodyKey, string> = {
  sun: "Core identity", moon: "Emotional world", mercury: "Mind & voice",
  venus: "How they love", mars: "Drive & desire", jupiter: "Where they expand",
  saturn: "Where they discipline", uranus: "Where they break rules",
  neptune: "Where they dream", pluto: "Where they transform"
};

const SIGN_ONE_LINER: Record<string, string> = {
  Aries:       "direct, fast, leading with instinct",
  Taurus:      "steady, sensory, building slowly and surely",
  Gemini:      "curious, adaptable, always in dialogue",
  Cancer:      "tender, intuitive, protecting what they love",
  Leo:         "warm, expressive, needing to be seen and valued",
  Virgo:       "careful, devoted to doing things right",
  Libra:       "harmonising, beauty-seeking, weighing everything",
  Scorpio:     "intense, private, all-or-nothing in depth",
  Sagittarius: "expansive, truth-chasing, free in spirit",
  Capricorn:   "ambitious, structured, playing a long game",
  Aquarius:    "original, collective-minded, ahead of the crowd",
  Pisces:      "absorbent, compassionate, permeable to the unseen"
};

/**
 * Returns a warm two-part one-liner for a body + sign pair.
 * E.g. "Emotional world · tender, protective, building slowly"
 */
export function interpretPlacement(body: string, sign: string): string {
  const label = BODY_LABEL[body as BodyKey];
  const signText = SIGN_ONE_LINER[sign];
  if (!label || !signText) return "";
  return `${label} · ${signText}`;
}

/**
 * One-liner for the Big Three specifically, in a more personal voice.
 */
export function interpretBigThree(placement: "sun" | "moon" | "rising", sign: string): string {
  const s = SIGN_ONE_LINER[sign] ?? "";
  switch (placement) {
    case "sun":    return `They shine through being ${s}`;
    case "moon":   return `Emotionally they are ${s}`;
    case "rising": return `They come across as ${s}`;
    default:       return s;
  }
}

/**
 * Short narrative for an aspect pair in the compare view.
 */
export function narrateAspect(from: string, type: string, to: string, harmony: number): string {
  const positive = harmony >= 0;
  const fromLabel = BODY_LABEL[from as BodyKey] ?? from;
  const toLabel   = BODY_LABEL[to as BodyKey]   ?? to;
  const adjective = positive
    ? (type === "trine" ? "flows effortlessly" : type === "sextile" ? "connects well" : "blends")
    : (type === "square" ? "creates productive friction" : type === "opposition" ? "pulls in opposite directions" : "challenges");
  return `${fromLabel} ${adjective} with ${toLabel}`;
}

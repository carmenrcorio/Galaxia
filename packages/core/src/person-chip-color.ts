/**
 * Person initial-chip color — one resolution point for web + mobile chips.
 *
 * Constellation nodes (`resolveNodeColor`) paint from relation / `star_color`.
 * Chips paint from the person's Sun, so two friends are not the same fire
 * disc just because they share a bond type. Both systems use the brand
 * element hues as the base; chips add a per-sign mix inside each element
 * so Cancer and Pisces stay in the water family without being identical.
 *
 * Fallback when no confident Sun exists: stable hash of person id into the
 * same 12-sign palette. Components must not invent a third color path.
 */

import { ELEMENT_NODE_COLORS } from "./star-color";
import { hash01 } from "./galaxy-seat";

export const ZODIAC_SIGNS = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces",
] as const;

export type ZodiacSign = (typeof ZODIAC_SIGNS)[number];
export type ChipElement = "fire" | "earth" | "air" | "water";

/** Deep navy canvas (`globals.css --ink`). */
export const CHIP_NAVY = "#0a0717";
/** Card navy (`globals.css --ink2`). */
export const CHIP_INK2 = "#16102e";
/** Initial on a light chip — same ink the shipped `.avatar` used. */
export const CHIP_INITIAL_DARK = "#1a1206";
/** Initial on a dark chip — brand cream. */
export const CHIP_INITIAL_LIGHT = "#F4ECDB";

const SIGN_BY_LOWER = new Map<string, ZodiacSign>(
  ZODIAC_SIGNS.map((sign) => [sign.toLowerCase(), sign])
);

const ELEMENT_OF_SIGN: Record<ZodiacSign, ChipElement> = {
  Aries: "fire",
  Leo: "fire",
  Sagittarius: "fire",
  Taurus: "earth",
  Virgo: "earth",
  Capricorn: "earth",
  Gemini: "air",
  Libra: "air",
  Aquarius: "air",
  Cancer: "water",
  Scorpio: "water",
  Pisces: "water",
};

/**
 * Brand mix stops already shipped on chips / tokens — not new saturations.
 * `--gold-bright`, `--gold`, `--gold-soft`, `--cream`, `--mist`, plus the
 * darker teal / moss stops from the old `.av-0` / `.av-5` gradients.
 */
const BRAND = {
  fire: ELEMENT_NODE_COLORS.fire,
  earth: ELEMENT_NODE_COLORS.earth,
  air: ELEMENT_NODE_COLORS.air,
  water: ELEMENT_NODE_COLORS.water,
  gold: ELEMENT_NODE_COLORS.gold,
  dawn: "#f0c089",
  goldSoft: "#caa06f",
  cream: CHIP_INITIAL_LIGHT,
  mist: "#b9aede",
  tideDeep: "#4d8a91",
  mossDeep: "#9a8a50",
} as const;

function parseHex(hex: string): { r: number; g: number; b: number } {
  const n = hex.replace("#", "");
  return {
    r: parseInt(n.slice(0, 2), 16),
    g: parseInt(n.slice(2, 4), 16),
    b: parseInt(n.slice(4, 6), 16),
  };
}

function formatHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

/** Mix `b` into `a` by `t` (0 = a, 1 = b). */
export function mixHex(a: string, b: string, t: number): string {
  const pa = parseHex(a);
  const pb = parseHex(b);
  return formatHex(
    Math.round(pa.r * (1 - t) + pb.r * t),
    Math.round(pa.g * (1 - t) + pb.g * t),
    Math.round(pa.b * (1 - t) + pb.b * t)
  );
}

function srgbChannel(value: number): number {
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const { r, g, b } = parseHex(hex);
  return (
    0.2126 * srgbChannel(r / 255) +
    0.7152 * srgbChannel(g / 255) +
    0.0722 * srgbChannel(b / 255)
  );
}

export function contrastRatio(a: string, b: string): number {
  const L1 = relativeLuminance(a);
  const L2 = relativeLuminance(b);
  const [hi, lo] = L1 > L2 ? [L1, L2] : [L2, L1];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Per-sign fill. Cardinal sign of each element is the constellation element
 * hex so chips and galaxy nodes share a family; fixed / mutable mix in a
 * neighbouring brand stop.
 */
export const SIGN_CHIP_COLORS: Record<ZodiacSign, string> = {
  Aries: BRAND.fire,
  Leo: mixHex(BRAND.fire, BRAND.dawn, 0.55),
  Sagittarius: mixHex(BRAND.fire, BRAND.gold, 0.5),
  Taurus: BRAND.earth,
  Virgo: mixHex(BRAND.earth, BRAND.cream, 0.38),
  Capricorn: mixHex(BRAND.earth, BRAND.mossDeep, 0.42),
  Gemini: BRAND.air,
  Libra: mixHex(BRAND.air, BRAND.cream, 0.38),
  Aquarius: mixHex(BRAND.air, BRAND.water, 0.42),
  Cancer: BRAND.water,
  Scorpio: mixHex(BRAND.water, BRAND.tideDeep, 0.55),
  Pisces: mixHex(BRAND.water, BRAND.mist, 0.45),
};

export function normalizeZodiacSign(value: string | null | undefined): ZodiacSign | null {
  if (value == null || value === "") return null;
  return SIGN_BY_LOWER.get(value.trim().toLowerCase()) ?? null;
}

export function elementOfSign(sign: ZodiacSign): ChipElement {
  return ELEMENT_OF_SIGN[sign];
}

export function initialInkForFill(fill: string): string {
  return contrastRatio(CHIP_INITIAL_DARK, fill) >= 4.5 ? CHIP_INITIAL_DARK : CHIP_INITIAL_LIGHT;
}

export interface ChipChartLike {
  placements?: ReadonlyArray<{
    body: string;
    sign: string;
    confident?: boolean;
  }>;
}

/** Confident tropical Sun only — year-only / uncertain signs do not color the chip. */
export function sunSignFromChart(chart: ChipChartLike | null | undefined): ZodiacSign | null {
  const sun = chart?.placements?.find((p) => p.body.toLowerCase() === "sun");
  if (!sun || sun.confident === false) return null;
  return normalizeZodiacSign(sun.sign);
}

export interface PersonChipInput {
  /** Stable person id (hashed when no Sun is available). */
  id: string;
  sunSign?: string | null;
}

export interface PersonChipColor {
  fill: string;
  initial: string;
  element: ChipElement;
  sign: ZodiacSign;
  source: "sun-sign" | "id-hash";
}

function signFromId(id: string): ZodiacSign {
  const idx = Math.floor(hash01(id) * ZODIAC_SIGNS.length);
  return ZODIAC_SIGNS[Math.min(idx, ZODIAC_SIGNS.length - 1)]!;
}

/**
 * Chip fill + initial ink for a person. Sun sign wins; otherwise a stable
 * id hash into the same 12-color palette. Never a random or name-hash color.
 */
export function personChipColor(person: PersonChipInput): PersonChipColor {
  const fromSun = normalizeZodiacSign(person.sunSign);
  const sign = fromSun ?? signFromId(person.id);
  const fill = SIGN_CHIP_COLORS[sign];
  return {
    fill,
    initial: initialInkForFill(fill),
    element: elementOfSign(sign),
    sign,
    source: fromSun ? "sun-sign" : "id-hash",
  };
}

export function personInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return (parts[0]?.charAt(0) ?? "?").toUpperCase();
  return ((parts[0]?.charAt(0) ?? "") + (parts[parts.length - 1]?.charAt(0) ?? "")).toUpperCase();
}

/**
 * Constellation node visual scale — shared by the web canvas and mobile glance.
 * Seat position is independent of these numbers (`galaxyGeometry` / `effectiveSeat`).
 */

/** Memorial stick-figure half-extent (CSS px) at star_scale 1. */
export const GLYPH_BASE_PX = 34;
/** lowPerf memorial half-extent (CSS px) at star_scale 1. */
export const GLYPH_BASE_PX_LITE = 26;
/** Soft wash behind a memorial glyph, as a multiple of the stick-figure radius. */
export const GLYPH_WASH_SCALE = 1.55;

export const STAR_CORE_RADIUS = {
  self: 7,
  binary: 7,
  ancient: 3.4,
  moon: 4.2,
  default: 5,
} as const;

export function starCoreRadius(form: string): number {
  if (form === "self") return STAR_CORE_RADIUS.self;
  if (form === "binary") return STAR_CORE_RADIUS.binary;
  if (form === "ancient") return STAR_CORE_RADIUS.ancient;
  if (form === "moon") return STAR_CORE_RADIUS.moon;
  return STAR_CORE_RADIUS.default;
}

/** Outer-halo loudness on radius + alphas. Web canvas uses the same constant. */
export const GLOW_OUTER_SCALE = 0.7;

export function birthPrecisionSharpness(precision: string | null | undefined): number {
  if (precision === "exact") return 1;
  if (precision === "date") return 0.62;
  return 0.32;
}

export function glowHaloMultiplier(sharpness: number): number {
  return sharpness === 1 ? 5 : sharpness > 0.5 ? 7.5 : 10.5;
}

export const STAR_SCALE_MIN = 0.6;
export const STAR_SCALE_MAX = 2.0;
export const STAR_SCALE_DEFAULT = 1.0;

/** Null / non-finite → 1.0. Clamps into the authored 0.6–2.0 range. */
export function normalizeStarScale(value: unknown): number {
  if (value == null || value === "") return STAR_SCALE_DEFAULT;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return STAR_SCALE_DEFAULT;
  return Math.min(STAR_SCALE_MAX, Math.max(STAR_SCALE_MIN, n));
}

export function glyphRadiusPx(lite: boolean, starScale: unknown): number {
  const base = lite ? GLYPH_BASE_PX_LITE : GLYPH_BASE_PX;
  return base * normalizeStarScale(starScale);
}

/**
 * Largest drawn radius (CSS px) of a node at rest: outer glow, or memorial
 * glyph wash, after `star_scale`. Used by `maxSeatRadius` so a scaled glyph
 * stops further from the canvas edge than a plain star.
 */
export function nodeDrawnExtent(opts: {
  form: string;
  memorial?: boolean;
  lite?: boolean;
  precision?: string | null;
  starScale?: unknown;
}): number {
  const scale = normalizeStarScale(opts.starScale);
  if (opts.memorial) {
    return glyphRadiusPx(Boolean(opts.lite), scale) * GLYPH_WASH_SCALE;
  }
  const core = starCoreRadius(opts.form);
  const sharpness = birthPrecisionSharpness(opts.precision);
  return core * glowHaloMultiplier(sharpness) * scale * GLOW_OUTER_SCALE;
}

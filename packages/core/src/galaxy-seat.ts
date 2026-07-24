/**
 * Stable constellation seats for `/app`.
 *
 * A seat is a pure function of (person id, own semantic ring) — never of the
 * peer set, fetch order, or which other rings happen to be occupied. That is
 * what makes the map learnable:
 *   - same account, two loads, no data change → identical seats
 *   - adding one person → only that person appears; everyone else stays put
 *
 * Hash collisions (two ids mapping to the same angle on the same ring) stack
 * at the same seat. We do NOT peer-resolve by walking neighbors: any resolution
 * that looks at the set would move existing people when the set changes.
 */

/** Outermost semantic ring from `ringIndex` (ancestors / passed). */
export const GALAXY_MAX_RING = 7;

/** Innermost non-self normalised radius — keeps partners clear of the core. */
export const GALAXY_RING_MIN = 0.34;

/**
 * Stable value in [0, 1) from a string — full 32-bit FNV-1a (not truncated to
 * 1e5 buckets). Same input → same output on every load.
 */
export function hash01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

/**
 * Normalised ring radius in [0, 1] from the person's OWN semantic ring
 * (0 = self at the core). Absolute — does not collapse over occupied rings.
 * Ring 1 (partner) sits at GALAXY_RING_MIN; ring 7 (ancient light) at the rim.
 */
export function ringNormAbsolute(ring: number): number {
  if (ring <= 0) return 0;
  const r = Math.min(Math.max(ring, 1), GALAXY_MAX_RING);
  return GALAXY_RING_MIN + (1 - GALAXY_RING_MIN) * ((r - 1) / (GALAXY_MAX_RING - 1));
}

export interface GalaxySeatInput {
  id: string;
  isSelf: boolean;
  /** Semantic ring from `ringIndex` (0 = self). */
  ring: number;
}

export interface GalaxySeatNorm {
  /** Unit-ellipse coords relative to centre (self = 0,0). */
  nx: number;
  ny: number;
  /** Radians; 0 = +x (canvas right), grows clockwise-down with canvas y. */
  angle: number;
  /** Normalised radius in [0, 1]. */
  rn: number;
}

/**
 * Seat as a pure function of (id, own ring). Angle from hash(id); radius from
 * own ring plus a tiny id-stable radial jitter. No peer inputs.
 */
export function galaxySeatNorm(input: GalaxySeatInput): GalaxySeatNorm {
  if (input.isSelf || input.ring <= 0) {
    return { nx: 0, ny: 0, angle: 0, rn: 0 };
  }
  const jA = hash01(`${input.id}\0a`);
  const jR = hash01(`${input.id}\0r`);
  const rn = ringNormAbsolute(input.ring) * (1 + (jR - 0.5) * 0.08); /* ±4% */
  /* −π/2 so hash 0 sits at 12 o'clock — familiar top-of-ring default. */
  const angle = -Math.PI / 2 + jA * Math.PI * 2;
  return {
    nx: rn * Math.cos(angle),
    ny: rn * Math.sin(angle),
    angle,
    rn,
  };
}

/** Map a normalised seat onto an elliptical canvas geometry. */
export function galaxySeatXY(
  seat: GalaxySeatNorm,
  geom: { cx: number; cy: number; radX: number; radY: number },
): { x: number; y: number } {
  return {
    x: geom.cx + seat.nx * geom.radX,
    y: geom.cy + seat.ny * geom.radY,
  };
}

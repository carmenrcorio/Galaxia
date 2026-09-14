/**
 * Stable constellation seats for `/app` (and mobile home).
 *
 * ONE radius function: `ringBandRadius(ring)`. Person seats and guide rings
 * both use it — a parent sits on the parents band, at the same normalised
 * radius the guide stroke uses.
 *
 * Angle is a pure function of person id. Radius is the ring's fixed band
 * radius plus id-stable within-band jitter (never enough to cross into a
 * neighbouring band).
 *
 * Learnable-map contract:
 *   - same account, two loads, no data change → identical seats
 *   - adding a person → only that person (or their same-ring collision
 *     cluster) moves; other people's radii never change
 *
 * Near-hash collisions on the same ring are separated by `galaxySeatsResolved`.
 */

/**
 * Outermost semantic ring from `ringIndex` (passed / ancestor tag).
 * P1 sketch: 0 self · 1 partner · 2–5 guide rings · 6 ancient outer.
 */
export const GALAXY_MAX_RING = 6;

/**
 * Partner binary radius (semantic ring 1). Far enough from self that both
 * nodes and both labels stay legible at 375px — two distinct stars, not a smudge.
 */
export const GALAXY_RING_MIN = 0.46;

/**
 * Fixed band radii — the single source of truth for seats AND guide strokes.
 * Sketch legend: Ring 1 = children (2) · Ring 2 = parents/sibs (3) ·
 * Ring 3 = friends (4) · Ring 4 = colleagues (5).
 */
export const GALAXY_RING_NORMS: Readonly<Record<number, number>> = {
  0: 0,
  1: GALAXY_RING_MIN,
  2: 0.58,
  3: 0.72,
  4: 0.84,
  5: 0.93,
  6: 1.0,
};

/** Semantic rings that draw soft concentric guides (sketch Rings 1–4). */
export const GALAXY_GUIDE_RINGS = [2, 3, 4, 5] as const;

/** Horizontal inset from the stage edge to the galaxy ellipse. */
export const GALAXY_GUTTER_X = 44;
/** Vertical inset from the stage edge to the galaxy ellipse. */
export const GALAXY_GUTTER_Y = 48;
/** Floor for radX / radY so a tiny stage still has a readable core. */
export const GALAXY_MIN_R = 70;
/** Cap |radX/radY| so the galaxy never looks squashed. */
export const GALAXY_MAX_ECC = 1.3;
/** Pixel pad between a node's drawn extent and the canvas edge. */
export const GALAXY_SEAT_MARGIN = 6;

export type GalaxyGeometry = {
  cx: number;
  cy: number;
  radX: number;
  radY: number;
};

/**
 * Single geometry source for web and mobile. Independent axes, then an
 * eccentricity cap so a wide stage fills horizontally without a pancake.
 */
export function galaxyGeometry(width: number, height: number): GalaxyGeometry {
  let radX = Math.max(GALAXY_MIN_R, width / 2 - GALAXY_GUTTER_X);
  let radY = Math.max(GALAXY_MIN_R, height / 2 - GALAXY_GUTTER_Y);
  if (radY > 0 && radX / radY > GALAXY_MAX_ECC) radX = radY * GALAXY_MAX_ECC;
  if (radX > 0 && radY / radX > GALAXY_MAX_ECC) radY = radX * GALAXY_MAX_ECC;
  return { cx: width / 2, cy: height / 2, radX, radY };
}

/** Soft nebula-band colours for the four guide rings. Keys match `GALAXY_GUIDE_RINGS`. */
export const RING_BAND_COLORS = {
  2: { core: "#d4a855", glow: "#f0d9a6", width: 1.8, opacity: 0.50 },
  3: { core: "#a87cdb", glow: "#c4a8ea", width: 1.6, opacity: 0.42 },
  4: { core: "#e87cad", glow: "#f5b8d4", width: 1.5, opacity: 0.38 },
  5: { core: "#94909c", glow: "#c0bcc8", width: 1.3, opacity: 0.32 },
} as const;

/**
 * Nominal radial jitter amplitude as a fraction of band radius (±).
 * Kept tiny so seats read as ON the guide stroke, not in the gap; still
 * clamped to the band half-gap (see `ringSeatRadius`).
 */
export const GALAXY_RING_JITTER = 0.012;

/**
 * Raw angular proximity (radians) that joins two seats on the same ring into a
 * collision cluster. Tuned so Carmen's Abuelita Rosa / Stevie / Viejita stack
 * (~8°) and Emilio / Gabriel (~12°) both resolve, without sweeping half a ring.
 */
export const GALAXY_COLLISION_JOIN = (14 * Math.PI) / 180;

/**
 * Angular step (radians) between resolved seats inside a collision cluster.
 * Large enough for name labels to stay legible on the web canvas.
 */
export const GALAXY_COLLISION_SEP = (20 * Math.PI) / 180;

/** Label centres closer than this (CSS px) get deterministic push-apart. */
export const GALAXY_LABEL_JOIN_PX = 36;

/**
 * Mean advance width (CSS px) per character for constellation labels at
 * `11px Inter`. Conservative (slightly wide) so long names clear neighbours.
 */
export const GALAXY_LABEL_CHAR_PX = 6.2;

/**
 * Approximate half-width (CSS px) of a constellation name at 11px Inter.
 * Used for placement join checks — not measured from canvas metrics.
 * Floors at half of `GALAXY_LABEL_JOIN_PX` so short names keep the old join.
 */
export function galaxyLabelHalfWidthPx(displayName: string): number {
  return Math.max(GALAXY_LABEL_JOIN_PX / 2, (displayName.length * GALAXY_LABEL_CHAR_PX) / 2);
}

/** CSS-px inset that keeps a measured name fully inside the constellation canvas. */
export const GALAXY_LABEL_EDGE_MARGIN_PX = 8;

/**
 * Clamp a centred constellation name so the full measured glyph stays inside
 * the canvas. Does not move the star; the label may detach at the edge.
 * `rawX`/`rawY` and the result are CSS pixels (the motion canvas is drawn
 * after `setTransform(DPR, …)`).
 */
export function clampGalaxyLabelPosition(
  rawX: number,
  rawY: number,
  textWidth: number,
  textHeight: number,
  canvasW: number,
  canvasH: number,
  margin: number = GALAXY_LABEL_EDGE_MARGIN_PX,
): { x: number; y: number } {
  return {
    x: Math.max(textWidth / 2 + margin, Math.min(canvasW - textWidth / 2 - margin, rawX)),
    y: Math.max(textHeight / 2 + margin, Math.min(canvasH - textHeight / 2 - margin, rawY)),
  };
}

/** Stable value in [0, 1) from a string — full 32-bit FNV-1a. */
export function hash01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

/**
 * THE radius function. Person seats and guide rings both call this.
 * Self / ring 0 → 0. Every other semantic ring → its fixed band radius.
 */
export function ringBandRadius(ring: number): number {
  if (ring <= 0) return 0;
  const r = Math.min(Math.max(Math.round(ring), 1), GALAXY_MAX_RING);
  return GALAXY_RING_NORMS[r] ?? 1;
}

/** @deprecated Alias of `ringBandRadius` — kept for call-site clarity in older tests. */
export function ringNormAbsolute(ring: number): number {
  return ringBandRadius(ring);
}

/**
 * Half-gap (normalised) from `ring` toward its nearer neighbour band.
 * Jitter must stay inside this so a seat never crosses into another band.
 */
export function ringBandHalfGap(ring: number): number {
  const r = Math.min(Math.max(Math.round(ring), 1), GALAXY_MAX_RING);
  const base = ringBandRadius(r);
  if (base <= 0) return 0;
  const prev = r <= 1 ? 0 : ringBandRadius(r - 1);
  const next = r >= GALAXY_MAX_RING ? base + (base - prev) : ringBandRadius(r + 1);
  return Math.min(base - prev, next - base) / 2;
}

/**
 * Seat radius for a person: band radius + id-stable within-band jitter.
 * Jitter is clamped so the seat cannot cross into a neighbouring band.
 */
export function ringSeatRadius(id: string, ring: number): number {
  if (ring <= 0) return 0;
  const base = ringBandRadius(ring);
  const jR = hash01(`${id}\0r`);
  const nominal = base * GALAXY_RING_JITTER; /* ±3% of band */
  const maxDelta = ringBandHalfGap(ring) * 0.85; /* stay clearly inside band */
  const delta = (jR - 0.5) * 2 * Math.min(nominal, maxDelta);
  return base + delta;
}

/**
 * Occupied-ring → band-radius map (fixed norms, no redistribution).
 * Empty rings are omitted so callers can skip their guides if desired.
 * Prefer `ringBandRadius` directly for seat/guide drawing.
 */
export function ringNormsOccupied(occupiedRings: Iterable<number>): Map<number, number> {
  const out = new Map<number, number>();
  out.set(0, 0);
  for (const raw of occupiedRings) {
    const r = Math.round(raw);
    if (r <= 0) continue;
    const ring = Math.min(Math.max(r, 1), GALAXY_MAX_RING);
    out.set(ring, ringBandRadius(ring));
  }
  return out;
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
  /** Normalised radius (band seats in ~[0, 1]; custom seats may exceed 1). */
  rn: number;
}

function seatFromAngleRn(angle: number, rn: number): GalaxySeatNorm {
  return {
    nx: rn * Math.cos(angle),
    ny: rn * Math.sin(angle),
    angle,
    rn,
  };
}

/**
 * Seat as a pure function of (id, own ring) using the fixed band table.
 * Prefer `galaxySeatsResolved` when same-ring collision separation is needed.
 */
export function galaxySeatNorm(input: GalaxySeatInput): GalaxySeatNorm {
  if (input.isSelf || input.ring <= 0) {
    return { nx: 0, ny: 0, angle: 0, rn: 0 };
  }
  const rn = ringSeatRadius(input.id, input.ring);
  const angle = galaxySeatAngle(input.id);
  return seatFromAngleRn(angle, rn);
}

/** Angle from id only — independent of ring. */
export function galaxySeatAngle(id: string): number {
  return -Math.PI / 2 + hash01(`${id}\0a`) * Math.PI * 2;
}

/** Smallest absolute angle between two radians on the circle. */
export function angularDiff(a: number, b: number): number {
  let d = Math.abs(a - b) % (Math.PI * 2);
  if (d > Math.PI) d = Math.PI * 2 - d;
  return d;
}

/** Circular mean of angles (radians). Empty → 0. */
function circularMean(angles: readonly number[]): number {
  if (angles.length === 0) return 0;
  let x = 0;
  let y = 0;
  for (const a of angles) {
    x += Math.cos(a);
    y += Math.sin(a);
  }
  return Math.atan2(y / angles.length, x / angles.length);
}

interface RawMember {
  id: string;
  ring: number;
  raw: GalaxySeatNorm;
}

function clusterIds(members: readonly RawMember[], join: number): string[][] {
  const parent = new Map<string, string>();
  const rank = new Map<string, number>();
  for (const m of members) {
    parent.set(m.id, m.id);
    rank.set(m.id, 0);
  }
  const find = (id: string): string => {
    let cur = id;
    while (parent.get(cur) !== cur) {
      const p = parent.get(cur)!;
      parent.set(cur, parent.get(p)!);
      cur = p;
    }
    return cur;
  };
  const unite = (a: string, b: string) => {
    let ra = find(a);
    let rb = find(b);
    if (ra === rb) return;
    if (rank.get(ra)! < rank.get(rb)! || (rank.get(ra) === rank.get(rb) && ra > rb)) {
      const tmp = ra;
      ra = rb;
      rb = tmp;
    }
    parent.set(rb, ra);
    if (rank.get(ra) === rank.get(rb)) rank.set(ra, rank.get(ra)! + 1);
  };

  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      if (angularDiff(members[i].raw.angle, members[j].raw.angle) < join) {
        unite(members[i].id, members[j].id);
      }
    }
  }

  const groups = new Map<string, string[]>();
  const sorted = [...members].sort((a, b) => a.id.localeCompare(b.id));
  for (const m of sorted) {
    const root = find(m.id);
    const list = groups.get(root);
    if (list) list.push(m.id);
    else groups.set(root, [m.id]);
  }
  return [...groups.values()].sort((a, b) => a[0].localeCompare(b[0]));
}

/**
 * Resolve seats for a whole constellation.
 *
 * Angle = f(id). Radius = ringBandRadius(own ring) + within-band jitter.
 * Same-ring near-collisions are re-spaced by id order. Adding a person on a
 * new or existing ring never changes another person's radius.
 */
export function galaxySeatsResolved(
  people: readonly GalaxySeatInput[],
  opts?: { join?: number; sep?: number },
): Map<string, GalaxySeatNorm> {
  const join = opts?.join ?? GALAXY_COLLISION_JOIN;
  const sep = opts?.sep ?? GALAXY_COLLISION_SEP;
  const out = new Map<string, GalaxySeatNorm>();
  const byRing = new Map<number, RawMember[]>();

  for (const p of people) {
    if (p.isSelf || p.ring <= 0) {
      out.set(p.id, { nx: 0, ny: 0, angle: 0, rn: 0 });
      continue;
    }
    const rn = ringSeatRadius(p.id, p.ring);
    const angle = galaxySeatAngle(p.id);
    const raw = seatFromAngleRn(angle, rn);
    out.set(p.id, raw);
    const list = byRing.get(p.ring);
    const member = { id: p.id, ring: p.ring, raw };
    if (list) list.push(member);
    else byRing.set(p.ring, [member]);
  }

  for (const members of byRing.values()) {
    if (members.length < 2) continue;
    const byId = new Map(members.map((m) => [m.id, m]));
    for (const ids of clusterIds(members, join)) {
      if (ids.length < 2) continue;
      const angles = ids.map((id) => byId.get(id)!.raw.angle);
      const mean = circularMean(angles);
      const mid = (ids.length - 1) / 2;
      for (let i = 0; i < ids.length; i++) {
        const m = byId.get(ids[i])!;
        const angle = mean + (i - mid) * sep;
        out.set(m.id, seatFromAngleRn(angle, m.raw.rn));
      }
    }
  }

  return out;
}

/** Map a normalised seat onto canvas geometry (circular or elliptical). */
export function galaxySeatXY(
  seat: GalaxySeatNorm,
  geom: { cx: number; cy: number; radX: number; radY: number },
): { x: number; y: number } {
  return {
    x: geom.cx + seat.nx * geom.radX,
    y: geom.cy + seat.ny * geom.radY,
  };
}

/**
 * Owner-chosen polar seat on the constellation (`people.custom_position`).
 * `radius_pct` is the same space as `GalaxySeatNorm.rn`. Floor 0.05; no
 * authored ceiling of 1. The live bound is `maxSeatRadius` (canvas geometry).
 * `CUSTOM_RADIUS_SANITY_MAX` is a data-guard only (DB check constraint).
 */
export type CustomGalaxyPosition = {
  angle: number;
  radius_pct: number;
};

export const CUSTOM_RADIUS_MIN = 0.05;
/** Data-guard ceiling. Never the binding limit in normal drag/render. */
export const CUSTOM_RADIUS_SANITY_MAX = 2.5;
/** @deprecated Use CUSTOM_RADIUS_SANITY_MAX. Not a live geometry cap. */
export const CUSTOM_RADIUS_MAX = CUSTOM_RADIUS_SANITY_MAX;

/**
 * Largest `rn` that keeps a node of `extent` (CSS px) inside the canvas.
 * Axes bound independently so the ellipse never walks off an edge.
 */
export function maxSeatRadius(
  angle: number,
  geo: GalaxyGeometry,
  extent: number,
  margin: number = GALAXY_SEAT_MARGIN,
): number {
  const halfW = geo.cx - margin - extent;
  const halfH = geo.cy - margin - extent;
  const absC = Math.abs(Math.cos(angle));
  const absS = Math.abs(Math.sin(angle));
  const limX = absC < 1e-6 ? Number.POSITIVE_INFINITY : halfW / (absC * geo.radX);
  const limY = absS < 1e-6 ? Number.POSITIVE_INFINITY : halfH / (absS * geo.radY);
  return Math.max(CUSTOM_RADIUS_MIN, Math.min(limX, limY));
}

export function clampSeatRn(
  angle: number,
  rn: number,
  geo: GalaxyGeometry,
  extent: number,
  margin: number = GALAXY_SEAT_MARGIN,
): number {
  const maxRn = maxSeatRadius(angle, geo, extent, margin);
  return Math.min(maxRn, Math.max(CUSTOM_RADIUS_MIN, rn));
}

export function parseCustomPosition(raw: unknown): CustomGalaxyPosition | null {
  if (raw == null || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  if (typeof rec.angle !== "number" || !Number.isFinite(rec.angle)) return null;
  if (typeof rec.radius_pct !== "number" || !Number.isFinite(rec.radius_pct)) return null;
  return { angle: rec.angle, radius_pct: rec.radius_pct };
}

/** Floor only. The canvas-edge bound is `maxSeatRadius`, not a constant. */
export function clampCustomPosition(pos: CustomGalaxyPosition): CustomGalaxyPosition {
  return {
    angle: pos.angle,
    radius_pct: Math.max(CUSTOM_RADIUS_MIN, pos.radius_pct),
  };
}

/**
 * Polar seat from a CSS-pixel pointer. Inverts the same ellipse as
 * `effectiveSeat`: nx = dx/radX, ny = dy/radY, rn = hypot(nx, ny).
 */
export function pointerToCustomPosition(
  px: number,
  py: number,
  geom: GalaxyGeometry,
): CustomGalaxyPosition {
  const dx = px - geom.cx;
  const dy = py - geom.cy;
  const nx = dx / (geom.radX || 1);
  const ny = dy / (geom.radY || 1);
  return {
    angle: Math.atan2(ny, nx),
    radius_pct: Math.max(CUSTOM_RADIUS_MIN, Math.hypot(nx, ny)),
  };
}

export function customPositionToSeat(pos: CustomGalaxyPosition): GalaxySeatNorm {
  const { angle, radius_pct } = clampCustomPosition(pos);
  return seatFromAngleRn(angle, radius_pct);
}

export type PersonWithCustomPos = {
  is_self?: boolean;
  custom_position?: CustomGalaxyPosition | null;
};

export type SeatEdgeClamp = {
  /** Largest drawn radius of this node (glow or glyph), CSS px. */
  extent: number;
  margin?: number;
};

/**
 * Pixel seat for a person. Self is always the galactic core.
 * Place at cx + cos(a)*rn*radX, cy + sin(a)*rn*radY.
 * When `clamp` is passed, `rn` is bounded by `maxSeatRadius` before x/y.
 */
export function effectiveSeat(
  person: PersonWithCustomPos,
  defaultAngle: number,
  defaultRn: number,
  geom: GalaxyGeometry,
  clamp?: SeatEdgeClamp,
): { x: number; y: number; angle: number; rn: number } {
  if (person.is_self) {
    return { x: geom.cx, y: geom.cy, angle: 0, rn: 0 };
  }
  const custom = parseCustomPosition(person.custom_position);
  let angle = defaultAngle;
  let rn = defaultRn;
  if (custom) {
    const clamped = clampCustomPosition(custom);
    angle = clamped.angle;
    rn = clamped.radius_pct;
  }
  if (clamp) {
    rn = clampSeatRn(angle, rn, geom, clamp.extent, clamp.margin ?? GALAXY_SEAT_MARGIN);
  }
  return {
    x: geom.cx + Math.cos(angle) * rn * geom.radX,
    y: geom.cy + Math.sin(angle) * rn * geom.radY,
    angle,
    rn,
  };
}

export interface GalaxyLabelAnchor {
  id: string;
  /** Default label centre (CSS px), before offset. */
  x: number;
  y: number;
  /**
   * Approx half-width of the label text (CSS px). When set, pair join is
   * `halfW_a + halfW_b` (floored by `opts.join` / `GALAXY_LABEL_JOIN_PX`).
   * Defaults to `GALAXY_LABEL_JOIN_PX / 2`.
   */
  halfW?: number;
}

/**
 * Deterministic label push-apart for neighbouring anchors.
 * Same input → same offsets. Lexicographically smaller id is nudged one way,
 * larger the other — no fetch-order dependence. Several passes so chains settle.
 * Pair join uses approx text half-widths when provided so long names clear
 * short neighbours (placement-time only — not a post-draw correction).
 */
export function galaxyLabelOffsets(
  anchors: readonly GalaxyLabelAnchor[],
  opts?: { join?: number; passes?: number },
): Map<string, { dx: number; dy: number }> {
  const minJoin = opts?.join ?? GALAXY_LABEL_JOIN_PX;
  const defaultHalf = GALAXY_LABEL_JOIN_PX / 2;
  const passes = opts?.passes ?? 6;
  const offsets = new Map<string, { dx: number; dy: number }>();
  for (const a of anchors) offsets.set(a.id, { dx: 0, dy: 0 });
  const sorted = [...anchors].sort((a, b) => a.id.localeCompare(b.id));

  for (let pass = 0; pass < passes; pass++) {
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const a = sorted[i];
        const b = sorted[j];
        const oa = offsets.get(a.id)!;
        const ob = offsets.get(b.id)!;
        const ax = a.x + oa.dx;
        const ay = a.y + oa.dy;
        const bx = b.x + ob.dx;
        const by = b.y + ob.dy;
        const dx = bx - ax;
        const dy = by - ay;
        const dist = Math.hypot(dx, dy);
        const join = Math.max(
          minJoin,
          (a.halfW ?? defaultHalf) + (b.halfW ?? defaultHalf),
        );
        if (dist >= join) continue;
        const gap = join - (dist || 0.001);
        const push = gap / 2 + 0.25;
        const ux = dist < 1e-6 ? 1 : dx / dist;
        const uy = dist < 1e-6 ? 0 : dy / dist;
        oa.dx -= ux * push;
        oa.dy -= uy * push;
        ob.dx += ux * push;
        ob.dy += uy * push;
      }
    }
  }
  return offsets;
}

/**
 * Placeholder seats for the constellation loading field. Same ring-band
 * geometry as the live view (`ringBandRadius` / `galaxySeatsResolved`).
 * These are not people: ids are the `skel:` prefix so they can never be
 * confused with a row from `people`.
 */
export interface ConstellationSkeletonSeat extends GalaxySeatNorm {
  id: string;
  /** 0–1 stagger for the CSS opacity pulse. */
  pulse: number;
  /** 0–1 point-size variation. */
  size: number;
  accent: "gold" | "violet";
}

/** One core + partner band + the four guide rings. */
const SKELETON_RING_COUNTS: ReadonlyArray<readonly [ring: number, count: number]> = [
  [0, 1],
  [1, 2],
  [2, 5],
  [3, 6],
  [4, 7],
  [5, 6],
];

export function constellationSkeletonSeats(): ConstellationSkeletonSeat[] {
  const inputs: GalaxySeatInput[] = [];
  for (const [ring, count] of SKELETON_RING_COUNTS) {
    for (let i = 0; i < count; i++) {
      inputs.push({
        id: `skel:${ring}:${i}`,
        isSelf: ring === 0,
        ring,
      });
    }
  }
  const resolved = galaxySeatsResolved(inputs);
  return inputs.map((input) => {
    const seat = resolved.get(input.id) ?? galaxySeatNorm(input);
    return {
      id: input.id,
      nx: seat.nx,
      ny: seat.ny,
      angle: seat.angle,
      rn: seat.rn,
      pulse: hash01(`${input.id}\0p`),
      size: hash01(`${input.id}\0s`),
      accent: hash01(`${input.id}\0c`) < 0.55 ? "gold" : "violet",
    };
  });
}

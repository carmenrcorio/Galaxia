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
  /** Normalised radius in [0, 1] (+ small within-band jitter). */
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

export interface GalaxyLabelAnchor {
  id: string;
  /** Default label centre (CSS px), before offset. */
  x: number;
  y: number;
}

/**
 * Deterministic label push-apart for neighbouring anchors.
 * Same input → same offsets. Lexicographically smaller id is nudged one way,
 * larger the other — no fetch-order dependence. Several passes so chains settle.
 */
export function galaxyLabelOffsets(
  anchors: readonly GalaxyLabelAnchor[],
  opts?: { join?: number; passes?: number },
): Map<string, { dx: number; dy: number }> {
  const join = opts?.join ?? GALAXY_LABEL_JOIN_PX;
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

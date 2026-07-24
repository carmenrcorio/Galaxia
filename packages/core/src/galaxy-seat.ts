/**
 * Stable constellation seats for `/app` (and mobile home).
 *
 * A seat starts as a pure function of (person id, own semantic ring) — never of
 * fetch order or which other rings happen to be occupied. That is what makes
 * the map learnable:
 *   - same account, two loads, no data change → identical seats
 *   - adding one unrelated person → only that person appears; everyone else
 *     stays put
 *
 * Near-hash collisions on the same ring (two ids mapping to nearly the same
 * angle) are separated by `galaxySeatsResolved`: within a raw-proximity cluster
 * we nudge along the ring by a stable id ordering. Adding someone outside the
 * cluster cannot move cluster members; adding someone into the cluster may
 * re-spread that cluster only.
 */

/** Outermost semantic ring from `ringIndex` (ancestors / passed). */
export const GALAXY_MAX_RING = 7;

/** Innermost non-self normalised radius — keeps partners clear of the core. */
export const GALAXY_RING_MIN = 0.34;

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

function seatFromAngleRn(angle: number, rn: number): GalaxySeatNorm {
  return {
    nx: rn * Math.cos(angle),
    ny: rn * Math.sin(angle),
    angle,
    rn,
  };
}

/**
 * Seat as a pure function of (id, own ring). Angle from hash(id); radius from
 * own ring plus a tiny id-stable radial jitter. No peer inputs — for the
 * learnable raw seat. Call `galaxySeatsResolved` when rendering a set so
 * near-collisions on a ring are separated.
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
  return seatFromAngleRn(angle, rn);
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

/**
 * Union-find helpers for collision clusters on one ring.
 * Path compression + union-by-rank; deterministic unions (always attach the
 * lexicographically larger root under the smaller) so component shape does not
 * depend on encounter order.
 */
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
    /* Deterministic: smaller id is always the root preference via rank+id. */
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
  /* Stable cluster order: by lexicographically smallest member id. */
  return [...groups.values()].sort((a, b) => a[0].localeCompare(b[0]));
}

/**
 * Resolve seats for a whole constellation.
 *
 * Raw seat = f(id, own ring). On each semantic ring, people whose raw angles
 * fall within `GALAXY_COLLISION_JOIN` form a cluster; within a cluster we
 * re-space by `GALAXY_COLLISION_SEP` around the circular mean, ordered by id.
 * People outside a cluster are untouched — adding an unrelated person cannot
 * move them.
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
    const raw = galaxySeatNorm(p);
    out.set(p.id, raw);
    if (p.isSelf || p.ring <= 0) continue;
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
      /* ids already sorted lexicographically from clusterIds. */
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

/**
 * Constellation layout twin of `apps/web/app/app/page.tsx` paintFrame.
 * Geometry, seats, labels, ignition, bezier, and EMA live here so Vitest
 * can lock numbers without React Native. Skia paint is ConstellationMap.
 */

import {
  ELEMENT_NODE_COLORS,
  GALAXY_GUIDE_RINGS,
  RING_BAND_COLORS,
  birthPrecisionSharpness,
  clampGalaxyLabelPosition,
  effectiveSeat,
  formFromRelation,
  galaxyGeometry,
  galaxyLabelHalfWidthPx,
  galaxyLabelOffsets,
  galaxySeatsResolved,
  glyphRadiusPx,
  hash01,
  nodeDrawnExtent,
  normalizeStarScale,
  ringBandRadius,
  ringIndex,
  starCoreRadius,
  usesMemorialGlyph,
  type CustomGalaxyPosition,
  type GalaxyGeometry,
  type HonorEdge,
} from "@galaxia/core";

export const CONSTELLATION_STAGE_ASPECT = 1.12;
export const CONSTELLATION_STAGE_MIN_H = 380;
export const CONSTELLATION_STAGE_MAX_H = 680;
export const CONSTELLATION_STAGE_VH = 0.72;

/**
 * Atmosphere wash — same radial vignette as web `renderWash` in
 * `apps/web/app/app/page.tsx` (center open, edges night). Not a linear fade.
 */
export const GALAXY_WASH_STOPS = [
  { pos: 0, color: "rgba(22,16,46,0.34)" },
  { pos: 0.6, color: "rgba(12,8,32,0.55)" },
  { pos: 1, color: "rgba(6,4,18,0.82)" },
] as const;
export const GALAXY_WASH_RADIUS = 0.72;
/** Web `ATM_BAKE_MS` — nebula drift re-raster ~4×/s once settled. */
export const ATM_BAKE_MS = 240;
/** Web `paintNebulaBand` glow `shadowBlur = band.width * 5`. */
export const RING_GLOW_BLUR_MUL = 5;
/** Web inner-band `shadowBlur = band.width * 2`. */
export const RING_CORE_BLUR_MUL = 2;
export const RING_GLOW_WIDTH_MUL = 1.8;
export const RING_CORE_WIDTH_MUL = 0.7;
/** Web constellation grain overlay: opacity 0.045, mix-blend overlay, 160 tile. */
export const GALAXY_GRAIN_TILE = 160;
export const GALAXY_GRAIN_OPACITY = 0.045;
/** Web memorial ignition flare: `R0 * 2.2 * (1.1 + 0.5 * ign.flare)`. */
export const MEMORIAL_FLARE_R = 2.2;

export const LABEL_PAD_X = 36;
export const LABEL_PAD_TOP = 22;
export const LABEL_PAD_BOTTOM = 26;
export const LABEL_FONT_PX = 11;

export const REDUCED_FADE_MS = 900;
export const SELF_DUR = 650;
export const NODE_DUR = 520;
export const NODE_GAP = 130;
export const NODE_LEAD = 440;
export const LINK_DUR = 480;

export const EMA_METEOR_OFF_MS = 24;
export const EMA_LOW_PERF_MS = 26;
export const EMA_LOW_PERF_RECOVER_MS = 23;
export const EMA_METEOR_RECOVER_MS = 21;
export const EMA_WARMUP_FRAMES = 12;
export const EMA_PREV = 0.9;
export const EMA_SAMPLE = 0.1;

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

export const SIGN_INDEX: Record<string, number> = Object.fromEntries(
  ZODIAC_SIGNS.map((sign, i) => [sign, i]),
);

export type ConstellationPerson = {
  id: string;
  display_name: string;
  relation: string;
  birth_precision: "exact" | "date" | "year" | "none";
  is_self: boolean;
  is_minor?: boolean;
  birth_date?: string | null;
  passed_at?: string | null;
  star_color?: string | null;
  memorial_constellation?: string | null;
  custom_position?: CustomGalaxyPosition | null;
  star_scale?: number | null;
};

export type SynastryLink = {
  fromId: string;
  toId: string;
  scoreA: number;
  elA: string;
  elB: string;
};

export type Ignition = {
  alpha: number;
  scale: number;
  flare: number;
  raw: number;
};

export type LabelAnchor = {
  x: number;
  y: number;
  baseDy: number;
  flip: boolean;
};

export type PersonPhase = { ph: number; sp: number };

export type ConstellationModel = {
  people: ConstellationPerson[];
  links: SynastryLink[];
  honorEdges: HonorEdge[];
  geom: GalaxyGeometry;
  width: number;
  height: number;
  seatsById: Map<string, { nx: number; ny: number; angle: number; rn: number }>;
  semanticRing: Map<string, number>;
  schedule: Map<string, { delay: number; dur: number }>;
  totalDuration: number;
  phases: PersonPhase[];
  selfId: string | undefined;
};

export function constellationStageHeight(width: number, viewportHeight: number): number {
  const fromAspect = width * CONSTELLATION_STAGE_ASPECT;
  const maxH = Math.min(viewportHeight * CONSTELLATION_STAGE_VH, CONSTELLATION_STAGE_MAX_H);
  return Math.round(Math.max(CONSTELLATION_STAGE_MIN_H, Math.min(fromAspect, maxH)));
}

export function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

export function easeOutCubic(x: number): number {
  return 1 - Math.pow(1 - x, 3);
}

export function easeOutBack(x: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

export function hexA(hex: string, a: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(3 + 2, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

export function bezierCP(ax: number, ay: number, bx: number, by: number): { cpx: number; cpy: number } {
  const mx = (ax + bx) / 2;
  const my = (ay + by) / 2;
  let nx = -(by - ay);
  let ny = bx - ax;
  const len = Math.hypot(nx, ny) || 1;
  nx /= len;
  ny /= len;
  const off = Math.hypot(bx - ax, by - ay) * 0.12;
  return { cpx: mx + nx * off, cpy: my + ny * off };
}

export function quadraticPoint(
  ax: number,
  ay: number,
  cpx: number,
  cpy: number,
  bx: number,
  by: number,
  t: number,
): { x: number; y: number } {
  const mt = 1 - t;
  return {
    x: mt * mt * ax + 2 * mt * t * cpx + t * t * bx,
    y: mt * mt * ay + 2 * mt * t * cpy + t * t * by,
  };
}

export function elementStrokeColor(key: string): string {
  return ELEMENT_NODE_COLORS[key as keyof typeof ELEMENT_NODE_COLORS] ?? "#B79AD8";
}

/** Web `cohortHsla` as rgba so Skia can parse it. Hue 196° teal → 328° rose. */
export function cohortRgba(signIndex: number, alpha: number): string {
  const hue = 196 + (signIndex / 11) * 132;
  const [r, g, b] = hslToRgb(hue, 0.46, 0.66);
  return `rgba(${r},${g},${b},${alpha})`;
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = ((h % 360) + 360) % 360 / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;
  if (hp < 1) {
    r = c;
    g = x;
  } else if (hp < 2) {
    r = x;
    g = c;
  } else if (hp < 3) {
    g = c;
    b = x;
  } else if (hp < 4) {
    g = x;
    b = c;
  } else if (hp < 5) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  const m = l - c / 2;
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

export function personExtent(person: ConstellationPerson, lite: boolean): number {
  return nodeDrawnExtent({
    form: formFromRelation(person.is_self, person.relation, person.passed_at),
    memorial: usesMemorialGlyph(person),
    lite,
    precision: person.birth_precision,
    starScale: person.star_scale,
  });
}

export function coreRadius(person: ConstellationPerson, lite: boolean): number {
  const scale = normalizeStarScale(person.star_scale);
  if (usesMemorialGlyph(person)) return glyphRadiusPx(lite, scale);
  const form = formFromRelation(person.is_self, person.relation, person.passed_at);
  return starCoreRadius(form) * scale;
}

/** Half-extent of the Skia saveLayer so glows, flares, and labels are not clipped. */
export function bodyLayerPad(person: ConstellationPerson, lite: boolean): number {
  const R0 = coreRadius(person, lite);
  const extent = personExtent(person, lite);
  const flare = usesMemorialGlyph(person) ? R0 * MEMORIAL_FLARE_R * 1.6 : R0 * 8 * 1.8;
  return Math.ceil(Math.max(160, extent, flare) + 56);
}

export function personPhases(people: readonly ConstellationPerson[]): PersonPhase[] {
  return people.map((p) => ({
    ph: hash01(`${p.id}\0ph`) * Math.PI * 2,
    sp: 0.35 + hash01(`${p.id}\0sp`) * 0.4,
  }));
}

export function buildConstellationModel(input: {
  people: ConstellationPerson[];
  links: SynastryLink[];
  honorEdges: HonorEdge[];
  width: number;
  height: number;
}): ConstellationModel {
  const { people, links, honorEdges, width, height } = input;
  const geom = galaxyGeometry(width, height);
  const semanticRing = new Map<string, number>();
  for (const p of people) {
    semanticRing.set(p.id, ringIndex(!!p.is_self, p.relation, p.passed_at));
  }
  const seatsById = galaxySeatsResolved(
    people.map((p) => ({
      id: p.id,
      isSelf: !!p.is_self,
      ring: semanticRing.get(p.id) ?? 4,
    })),
  );
  const selfP = people.find((p) => p.is_self);
  const selfId = selfP?.id ?? people[0]?.id;
  const scoreToSelf = (id: string) => {
    const l = links.find(
      (k) => (k.fromId === selfId && k.toId === id) || (k.toId === selfId && k.fromId === id),
    );
    return l ? l.scoreA : 0;
  };
  const ordered = people
    .filter((p) => !p.is_self)
    .sort(
      (a, b) =>
        (semanticRing.get(a.id) ?? 4) - (semanticRing.get(b.id) ?? 4) ||
        scoreToSelf(b.id) - scoreToSelf(a.id) ||
        a.id.localeCompare(b.id),
    );
  const schedule = new Map<string, { delay: number; dur: number }>();
  if (selfId) schedule.set(selfId, { delay: 0, dur: SELF_DUR });
  ordered.forEach((p, k) => schedule.set(p.id, { delay: NODE_LEAD + k * NODE_GAP, dur: NODE_DUR }));

  let totalDuration = SELF_DUR;
  schedule.forEach((s) => {
    totalDuration = Math.max(totalDuration, s.delay + s.dur);
  });
  for (const link of links) {
    const a = schedule.get(link.fromId);
    const b = schedule.get(link.toId);
    const start = Math.max((a?.delay ?? 0) + (a?.dur ?? 0) * 0.5, (b?.delay ?? 0) + (b?.dur ?? 0) * 0.5);
    totalDuration = Math.max(totalDuration, start + LINK_DUR);
  }

  return {
    people,
    links,
    honorEdges,
    geom,
    width,
    height,
    seatsById,
    semanticRing,
    schedule,
    totalDuration,
    phases: personPhases(people),
    selfId,
  };
}

export function ignitionAt(
  model: ConstellationModel,
  id: string,
  elapsed: number,
  reduced: boolean,
  globalFade: number,
): Ignition {
  if (reduced) {
    return { alpha: globalFade, scale: 0.7 + 0.3 * globalFade, flare: 0, raw: globalFade };
  }
  const s = model.schedule.get(id) ?? { delay: 0, dur: NODE_DUR };
  const local = clamp01((elapsed - s.delay) / s.dur);
  return {
    alpha: easeOutCubic(local),
    scale: local <= 0 ? 0 : easeOutBack(local),
    flare: local > 0 && local < 1 ? Math.sin(local * Math.PI) : 0,
    raw: local,
  };
}

export function linkProgress(
  model: ConstellationModel,
  fromId: string,
  toId: string,
  elapsed: number,
  reduced: boolean,
  globalFade: number,
  endpointFraction = 0.5,
): number {
  if (reduced) return globalFade;
  const a = model.schedule.get(fromId);
  const b = model.schedule.get(toId);
  const start = Math.max(
    (a?.delay ?? 0) + (a?.dur ?? 0) * endpointFraction,
    (b?.delay ?? 0) + (b?.dur ?? 0) * endpointFraction,
  );
  return clamp01((elapsed - start) / LINK_DUR);
}

export function effectiveFor(
  model: ConstellationModel,
  person: ConstellationPerson,
  lite: boolean,
): { x: number; y: number; angle: number; rn: number } {
  const seat = model.seatsById.get(person.id) ?? { nx: 0, ny: 0, angle: 0, rn: 0 };
  return effectiveSeat(person, seat.angle, seat.rn, model.geom, {
    extent: personExtent(person, lite),
  });
}

export function basePos(model: ConstellationModel, person: ConstellationPerson, lite: boolean): { x: number; y: number } {
  const geom = model.geom;
  let { x, y } = effectiveFor(model, person, lite);
  const minX = LABEL_PAD_X;
  const maxX = model.width - LABEL_PAD_X;
  const minY = LABEL_PAD_TOP;
  const maxY = model.height - LABEL_PAD_BOTTOM;
  if (x < minX || x > maxX || y < minY || y > maxY) {
    const dx = x - geom.cx;
    const dy = y - geom.cy;
    let s = 1;
    if (dx > 0) s = Math.min(s, (maxX - geom.cx) / dx);
    if (dx < 0) s = Math.min(s, (minX - geom.cx) / dx);
    if (dy > 0) s = Math.min(s, (maxY - geom.cy) / dy);
    if (dy < 0) s = Math.min(s, (minY - geom.cy) / dy);
    if (s < 1 && s > 0) {
      x = geom.cx + dx * s;
      y = geom.cy + dy * s;
    } else {
      x = Math.min(maxX, Math.max(minX, x));
      y = Math.min(maxY, Math.max(minY, y));
    }
  }
  return { x, y };
}

/**
 * Freeze: reduced-motion, self, or a custom seat never take tangential drift.
 * Same contract as web `if (reduced || p.is_self || overlay.custom_position) return base`.
 */
export function nodePos(
  model: ConstellationModel,
  index: number,
  t: number,
  elapsed: number,
  reduced: boolean,
  globalFade: number,
  lite: boolean,
): { x: number; y: number } {
  const person = model.people[index];
  const base = basePos(model, person, lite);
  if (reduced || person.is_self || person.custom_position) return base;
  const { ph, sp } = model.phases[index];
  const settle = clamp01(ignitionAt(model, person.id, elapsed, reduced, globalFade).raw);
  const ang = effectiveFor(model, person, lite).angle;
  const amp = Math.sin(t * 0.00045 * sp + ph) * 6 * settle;
  return {
    x: base.x + Math.cos(ang + Math.PI / 2) * amp,
    y: base.y + Math.sin(ang + Math.PI / 2) * amp,
  };
}

export function labelAnchors(
  model: ConstellationModel,
  positions: { x: number; y: number }[],
  lite: boolean,
): Map<string, LabelAnchor> {
  const map = new Map<string, LabelAnchor>();
  for (let i = 0; i < model.people.length; i++) {
    const p = model.people[i];
    const q = positions[i];
    const form = formFromRelation(p.is_self, p.relation, p.passed_at);
    const memorial = usesMemorialGlyph(p);
    const R0 = memorial
      ? 17
      : form === "self"
        ? 7
        : form === "ancient"
          ? 3.4
          : form === "moon"
            ? 4.2
            : 5;
    const below = form === "fixed" ? R0 * 3.9 + 12 : R0 * 2.9 + 12;
    const above = form === "fixed" ? R0 * 3.9 + 14 : R0 * 2.9 + 14;
    const outward = form === "fixed" ? R0 * 3.9 + 14 : R0 * 2.9 + 14;
    if (p.is_self) {
      map.set(p.id, { x: q.x, y: q.y + below + 6, baseDy: below + 6, flip: false });
      continue;
    }
    if (form === "binary" || (model.semanticRing.get(p.id) ?? 4) === 1) {
      const ang = effectiveFor(model, p, lite).angle;
      map.set(p.id, {
        x: q.x + Math.cos(ang) * 10,
        y: q.y - above - 2,
        baseDy: -(above + 2),
        flip: true,
      });
      continue;
    }
    const ang = effectiveFor(model, p, lite).angle;
    const ox = Math.cos(ang) * outward;
    const oy = Math.sin(ang) * outward;
    map.set(p.id, { x: q.x + ox, y: q.y + oy, baseDy: oy, flip: oy < 0 });
  }
  return map;
}

export function labelPositions(
  model: ConstellationModel,
  positions: { x: number; y: number }[],
  lite: boolean,
): Map<string, { x: number; y: number }> {
  const anchors = labelAnchors(model, positions, lite);
  const labelOff = galaxyLabelOffsets(
    [...anchors.entries()].map(([id, a]) => ({
      id,
      x: a.x,
      y: a.y,
      halfW: galaxyLabelHalfWidthPx(model.people.find((p) => p.id === id)?.display_name ?? ""),
    })),
  );
  const labelPosById = new Map<string, { x: number; y: number }>();
  for (const [id, a] of anchors) {
    const o = labelOff.get(id) ?? { dx: 0, dy: 0 };
    labelPosById.set(id, { x: a.x + o.dx, y: a.y + o.dy });
  }
  const selfId = model.people.find((p) => p.is_self)?.id;
  const partnerId = model.people.find((p) => !p.is_self && model.semanticRing.get(p.id) === 1)?.id;
  if (selfId && partnerId) {
    const a = labelPosById.get(selfId);
    const b = labelPosById.get(partnerId);
    if (a && b && Math.hypot(a.x - b.x, a.y - b.y) < 40) {
      const partner = model.people.find((p) => p.id === partnerId);
      const ang = partner ? effectiveFor(model, partner, lite).angle : 0;
      b.x += Math.cos(ang) * 20;
      b.y += Math.sin(ang) * 20;
      a.y += 10;
    }
  }
  return labelPosById;
}

export function hitTestAt(
  model: ConstellationModel,
  mx: number,
  my: number,
  positions: { x: number; y: number }[],
  lite: boolean,
): ConstellationPerson | null {
  let best: ConstellationPerson | null = null;
  let bestD = Infinity;
  for (let i = 0; i < model.people.length; i++) {
    const q = positions[i];
    const hitR = Math.max(
      usesMemorialGlyph(model.people[i]) ? 28 : 22,
      personExtent(model.people[i], lite) * 0.55,
    );
    const d = Math.hypot(mx - q.x, my - q.y);
    if (d < hitR && d < bestD) {
      bestD = d;
      best = model.people[i];
    }
  }
  return best;
}

export function nextEmaFrameMs(prev: number, dt: number): number {
  return prev * EMA_PREV + dt * EMA_SAMPLE;
}

export type EmaShed = {
  emaFrameMs: number;
  warmup: number;
  meteorsOff: boolean;
  lowPerf: boolean;
};

export function applyEmaShed(state: EmaShed, dt: number, reduced: boolean): EmaShed {
  const next = { ...state };
  if (next.warmup < EMA_WARMUP_FRAMES) {
    next.warmup += 1;
    return next;
  }
  next.emaFrameMs = nextEmaFrameMs(next.emaFrameMs, dt);
  if (!next.meteorsOff && next.emaFrameMs > EMA_METEOR_OFF_MS) next.meteorsOff = true;
  if (!next.lowPerf && next.emaFrameMs > EMA_LOW_PERF_MS) {
    next.lowPerf = true;
    next.meteorsOff = true;
  }
  if (next.lowPerf && next.emaFrameMs < EMA_LOW_PERF_RECOVER_MS) next.lowPerf = false;
  if (!reduced && next.meteorsOff && !next.lowPerf && next.emaFrameMs < EMA_METEOR_RECOVER_MS) {
    next.meteorsOff = false;
  }
  return next;
}

export function twinkleAt(phase: PersonPhase, t: number, reduced: boolean): number {
  if (reduced) return 1;
  return (
    1 +
    0.04 * Math.sin(t * 0.00018 * phase.sp + phase.ph) +
    0.025 * Math.sin(t * 0.0001 + phase.ph * 1.7)
  );
}

export function ringStardustPrng(n: number, seed: number): number {
  return ((Math.sin(n * 127.1 + seed * 311.7) * 43758.5453) % 1 + 1) % 1;
}

export { GALAXY_GUIDE_RINGS, RING_BAND_COLORS, ringBandRadius, birthPrecisionSharpness, clampGalaxyLabelPosition };

"use client";

/**
 * /app — Galaxia Mea
 *
 * Constellation rendering ported from:
 *   design/reference/galaxia-constellation-prototype.html
 *   design/reference/galaxia-landing-v2.html (living constellation)
 *
 * Key reference decisions:
 * - Node forms derived from bond type (self / binary-partner / moon-child / fixed-parent / star-sibling / ancient-ancestor)
 * - P1 concentric rings: soft circular guides at sketch Rings 1–4; partner is a
 *   tight binary at the core (not a guide). Seat radius = guide radius =
 *   ringBandRadius(own ring) (+ small within-band jitter). Angle = f(id).
 *   Geometry is a true circle (radX === radY) so co-ring parents share one
 *   Euclidean pixel radius — an ellipse made Mommy/Daddy read as different bands.
 * - Radial glow halo: createRadialGradient, 5-11×R depending on data precision (sharp=crisp, year=diffuse)
 * - Links: quadratic bezier + gradient between node element colours + travelling light pulse
 * - Gentle tangential drift (stays on band), disabled under prefers-reduced-motion
 * - Ambient shooting stars: short calm streaks, max 1–2 live, infrequent; decoration
 *   only (never aimed at a person / never a transit signal). Off under reduced-motion;
 *   shed first under lowPerf before any existing layer degrades.
 * - Hover: inspector panel slides in (glass-card style) from right; click routes to /app/person/[id]
 * - Duplicate bottom nav row: DELETED per spec
 */

import {
  computeSynastry,
  type NatalChart,
  type TransitHit,
  todayTransitsForChart,
  interpretTransit,
  transitNotation,
} from "@galaxia/astro";
import {
  ELEMENT_NODE_COLORS,
  GALAXY_GUIDE_RINGS,
  HONOR_LINE_STYLE,
  HONOR_RELATION_TYPE,
  elementFromRelation,
  formFromRelation,
  galaxyLabelOffsets,
  galaxySeatXY,
  galaxySeatsResolved,
  hash01,
  getMemorialConstellation,
  hasPassed,
  honorEdgesFromDeclaredRows,
  isMinorForSafety,
  peopleForTodaySky,
  resolveNodeColor,
  ringBandRadius,
  ringIndex,
  usesMemorialGlyph,
  type HonorEdge,
  type MemorialConstellation,
} from "@galaxia/core";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { InitialAvatar } from "../../components/initial-avatar";
import { ThreadMenu } from "../../components/thread-menu";
import { setThreadStatus } from "../../lib/record";
import { createSupabaseBrowserClient } from "../../lib/supabase/client";

interface PersonRow {
  id: string;
  display_name: string;
  relation: string;
  birth_precision: "exact" | "date" | "year" | "none";
  birth_date?: string | null;
  is_self: boolean;
  is_minor: boolean;
  /** Remembrance: when marked as passed. NULL = present. Chart data untouched. */
  passed_at?: string | null;
  /** Curated palette hex; null = element-derived node color. */
  star_color?: string | null;
  /** Assigned memorial pattern id; null = ancient light when passed. */
  memorial_constellation?: string | null;
}
interface LinkRow { fromId: string; toId: string; scoreA: number; elA: string; elB: string; }
interface ThreadChip { id: string; mode: "ask" | "shared"; preview: string; }
/* One person's real sky today — computed from THEIR OWN natal chart.
   `transits` is empty for year-only / chart-less people (see `hedge`). */
interface PersonSky {
  id: string;
  name: string;
  isSelf: boolean;
  isMinor: boolean;
  precision: PersonRow["birth_precision"];
  hasChart: boolean;
  transits: TransitHit[];
}

/* Element / legend colours — shared with resolveNodeColor in @galaxia/core. */
const EL_COLOR = ELEMENT_NODE_COLORS;

/* Orbit helpers (elementFromRelation / formFromRelation / ringIndex /
   resolveNodeColor) and stable seats (galaxySeatsResolved / hash01) live in
   @galaxia/core so Remembrance can reuse ancient light without a new visual
   language, seats are shared with mobile home, and the mapping is unit-tested. */

/* precision sharpness (from prototype sharp()) */
function sharp(precision: string): number {
  if (precision === "exact") return 1;
  if (precision === "date")  return 0.62;
  return 0.32;
}

function hexA(hex: string, a: number): string {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${a})`;
}

/* ── generational cohort colour, DERIVED from the outer-planet signature ──
   A cohort is anchored by its Pluto sign (the slowest visible planet, ~12–30
   yrs/sign — the classic generational band); people who share a Pluto sign
   share a nebula and a colour. The colour is computed deterministically from
   the sign, never assigned or tied to app usage (ENGINEERING.md §12/§13): the
   zodiac order maps onto a tasteful cyan→indigo→violet→rose arc within the
   brand's cosmic palette, so the hue is a readable fact of the record. */
const ZODIAC = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"] as const;
const SIGN_INDEX: Record<string, number> = Object.fromEntries(ZODIAC.map((s, i) => [s, i]));
function cohortHsla(signIndex: number, alpha: number): string {
  const hue = 196 + (signIndex / 11) * 132; // 196° teal → 328° rose-magenta
  return `hsla(${hue.toFixed(1)}, 46%, 66%, ${alpha})`;
}

/* quadratic bezier control point — same as prototype curve() */
function bezierCP(ax: number, ay: number, bx: number, by: number) {
  const mx = (ax+bx)/2, my = (ay+by)/2;
  let nx = -(by-ay), ny = bx-ax;
  const len = Math.hypot(nx, ny) || 1; nx /= len; ny /= len;
  const off = Math.hypot(bx-ax, by-ay) * 0.12;
  return { cpx: mx + nx*off, cpy: my + ny*off };
}

export default function AppHomePage() {
  const supabase  = useMemo(() => createSupabaseBrowserClient(), []);
  const router    = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  /* entrance ignition timeline — persists across effect re-runs (e.g. hover)
     so the arrival sequence plays once on data load, not on every state change */
  const entranceStartRef = useRef<number | null>(null);
  const entranceKeyRef   = useRef<string>("");

  const [welcomeName, setWelcomeName] = useState("stargazer");
  const [people, setPeople]           = useState<PersonRow[]>([]);
  const [links, setLinks]             = useState<LinkRow[]>([]);
  /* Honor-constellation edges — declared relationships rows only (Phase 3).
     Never derived from synastry scores or people.relation. Empty = no layer. */
  const [honorEdges, setHonorEdges]   = useState<HonorEdge[]>([]);
  /* personId → Pluto sign: the generational cohort key. Derived from each
     person's computed chart (outer-planet signature); people without a chart
     get no cohort and no nebula — we don't fabricate a generation. */
  const [cohortByPerson, setCohortByPerson] = useState<Record<string, string>>({});
  const [personSkies, setPersonSkies]           = useState<PersonSky[]>([]);
  const [threadChips, setThreadChips]           = useState<ThreadChip[]>([]);
  const [homeStatus, setHomeStatus]             = useState<string | null>(null);
  const [loading, setLoading]                   = useState(true);
  const [hoverPerson, setHoverPerson]           = useState<PersonRow | null>(null);

  /* Nodes shimmer when that person has a real tight transit today — derived
     from each person's own computed sky, never a shared flag. */
  const activeTransitIds = useMemo(
    () => personSkies.filter(s => s.transits.length > 0).map(s => s.id),
    [personSkies]
  );

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      loadHome(user.id, user.email ?? "");
    });
  }, [supabase]);

  /* ─── canvas constellation ─────────────────────────────────────────── */
  useEffect(() => {
    if (loading || people.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cx = canvas.getContext("2d");
    if (!cx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const DPR     = Math.min(window.devicePixelRatio || 1, 2);
    let raf = 0;
    let t   = 0;

    /* the deep-field wash + vignette only changes on resize, so it is
       rasterised ONCE into an offscreen canvas and blitted each frame
       (drawImage) instead of re-filling a full-canvas radial gradient every
       frame — the single biggest per-frame saving on mobile. */
    const washCanvas = document.createElement("canvas");
    const washCtx = washCanvas.getContext("2d");
    const renderWash = () => {
      if (!washCtx) return;
      washCanvas.width = canvas.width; washCanvas.height = canvas.height;
      const w = canvas.width, h = canvas.height;
      const wg = washCtx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.72);
      wg.addColorStop(0,   "rgba(22,16,46,0.34)");   /* --ink2 indigo centre */
      wg.addColorStop(0.6, "rgba(12,8,32,0.55)");
      wg.addColorStop(1,   "rgba(6,4,18,0.82)");     /* deep-ink edge vignette */
      washCtx.clearRect(0, 0, w, h);
      washCtx.fillStyle = wg; washCtx.fillRect(0, 0, w, h);
    };

    /* offscreen nebula layer — see renderNebulae/draw for the throttle */
    const nebCanvas = document.createElement("canvas");
    const nebCtx = nebCanvas.getContext("2d");
    let lastNebRender = -1e9;

    const resize = () => {
      const rect = canvas.parentElement!.getBoundingClientRect();
      canvas.width  = rect.width  * DPR;
      canvas.height = rect.height * DPR;
      canvas.style.width  = rect.width  + "px";
      canvas.style.height = rect.height + "px";
      cx.setTransform(DPR, 0, 0, DPR, 0, 0);
      nebCanvas.width = canvas.width; nebCanvas.height = canvas.height;
      nebCtx?.setTransform(DPR, 0, 0, DPR, 0, 0);
      lastNebRender = -1e9; /* force a re-render at the new size */
      renderWash();
    };
    resize();
    window.addEventListener("resize", resize);

    const W = () => canvas.width  / DPR;
    const H = () => canvas.height / DPR;

    /* ── easing + small helpers ── */
    const clamp01     = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
    const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);
    /* overshoot ease: gives the "flare then settle into form" ignition feel */
    const easeOutBack  = (x: number) => {
      const c1 = 1.70158, c3 = c1 + 1;
      return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
    };

    /* ── derived orbital seats (learnable map) ─────────────────────────────
       Angle = f(id). Radius = ringBandRadius(own ring) + within-band jitter
       (same function the guide strokes use). Same data → same seats; adding
       a person moves only that person / their same-ring collision cluster. */
    const semanticRing = new Map<string, number>();
    for (const p of people) {
      semanticRing.set(p.id, ringIndex(!!p.is_self, p.relation, p.passed_at));
    }
    const seatInputs = people.map((p) => ({
      id: p.id,
      isSelf: !!p.is_self,
      ring: semanticRing.get(p.id) ?? 4, /* unknown fallback = sketch Ring 3 */
    }));
    const seatsById = galaxySeatsResolved(seatInputs);

    /* ── entrance timeline ─────────────────────────────────────────────
       The constellation ARRIVES: the self star (galactic core) ignites first,
       then people kindle CASCADING OUTWARD along the spiral — inner rings
       (partner, children) light before the outer arms (colleagues, ancestors),
       and within a ring the strongest synastry to self leads. Lines draw
       themselves in behind them. Persisted via refs so it plays once on data
       load, not on every hover/state re-run of this effect. */
    const selfP  = people.find(p => p.is_self);
    const selfId = selfP?.id ?? people[0]?.id;
    const scoreToSelf = (id: string) => {
      const l = links.find(k =>
        (k.fromId === selfId && k.toId === id) || (k.toId === selfId && k.fromId === id));
      return l ? l.scoreA : 0;
    };
    /* inner rings kindle first (outward cascade); strongest bond leads within a
       ring; id break so the sequence is stable when scores tie. */
    const ordered = people.filter(p => !p.is_self)
      .sort((a, b) =>
        (semanticRing.get(a.id) ?? 4) - (semanticRing.get(b.id) ?? 4)
        || scoreToSelf(b.id) - scoreToSelf(a.id)
        || a.id.localeCompare(b.id));

    const SELF_DUR = 650, NODE_DUR = 520, NODE_GAP = 130, NODE_LEAD = 440, LINK_DUR = 480;
    const schedule = new Map<string, { delay: number; dur: number }>();
    schedule.set(selfId, { delay: 0, dur: SELF_DUR });
    ordered.forEach((p, k) => schedule.set(p.id, { delay: NODE_LEAD + k * NODE_GAP, dur: NODE_DUR }));

    /* a line starts once both endpoints are ~half-ignited, finishing with them */
    const linkSchedule = (link: LinkRow) => {
      const a = schedule.get(link.fromId), b = schedule.get(link.toId);
      const start = Math.max((a?.delay ?? 0) + (a?.dur ?? 0) * 0.5,
                             (b?.delay ?? 0) + (b?.dur ?? 0) * 0.5);
      return { start, dur: LINK_DUR };
    };

    let totalDuration = SELF_DUR;
    schedule.forEach(s => { totalDuration = Math.max(totalDuration, s.delay + s.dur); });
    for (const link of links) {
      const { start, dur } = linkSchedule(link);
      totalDuration = Math.max(totalDuration, start + dur);
    }
    const REDUCED_FADE = 900; /* reduced-motion: a single gentle fade, no sequence */

    /* reset the entrance only when the actual set of people changes (sorted
       so fetch order cannot re-trigger the arrival sequence). */
    const entranceKey = [...people.map(p => p.id)].sort().join(",");
    if (entranceKey !== entranceKeyRef.current) {
      entranceKeyRef.current = entranceKey;
      entranceStartRef.current = null;
    }

    let elapsed = 0;      /* ms since entrance start (updated each frame) */
    let globalFade = 1;   /* reduced-motion fade progress */

    /* ── adaptive performance: drop the extra bloom layer if a frame budget
       is blown, so mobile degrades (fewer glow layers) rather than janks.
       Ambient shooting stars shed FIRST — before any existing layer degrades. ── */
    let lowPerf = Math.min(W(), H()) < 380 || DPR >= 2 && W() < 430;
    /* Meteors are the cheapest atmosphere to drop — EMA kills them before
       flipping lowPerf, and they stay off once any lowPerf path is active. */
    let meteorsOff = reduced || lowPerf;
    /* TEMP-DEMO: ?meteors=force — one streak every 2s, uncapped, ignores lowPerf
       shed so draw path can be confirmed separate from spawn timing. */
    const forceMeteors = typeof window !== "undefined"
      && new URLSearchParams(window.location.search).get("meteors") === "force";
    if (forceMeteors && !reduced) meteorsOff = false;
    let emaFrameMs = 16.7;
    let lastFrame = performance.now();
    let warmup = 0;

    /* Ambient shooting stars — decoration only. Not aimed at seats, not
       element-coloured, not a transit signal. Cap 2; short life; infrequent. */
    type Meteor = { x0: number; y0: number; x1: number; y1: number; born: number; life: number };
    const meteors: Meteor[] = [];
    let nextMeteorAt = 0; /* set on first draw once entrance has settled */

    /* TEMP-DEMO: expose shed/spawn state for Playwright diagnose */
    const publishDemo = () => {
      const w = window as unknown as { __meteorDiag?: Record<string, unknown> };
      w.__meteorDiag = {
        lowPerf, meteorsOff, reduced, forceMeteors,
        meteorCount: meteors.length, emaFrameMs,
        canvasCssW: W(), canvasCssH: H(), dpr: DPR,
        initialLowPerfHeuristic: Math.min(W(), H()) < 380 || DPR >= 2 && W() < 430,
      };
    };

    /* per-person stable phase for drift/twinkle — seeded from id, not index */
    const phases = people.map((p) => ({
      ph: hash01(`${p.id}\0ph`) * Math.PI * 2,
      sp: 0.35 + hash01(`${p.id}\0sp`) * 0.4,
    }));

    /* ignition state for a person this frame */
    function ignition(id: string): { alpha: number; scale: number; flare: number; raw: number } {
      if (reduced) return { alpha: globalFade, scale: 0.7 + 0.3 * globalFade, flare: 0, raw: globalFade };
      const s = schedule.get(id) ?? { delay: 0, dur: NODE_DUR };
      const local = clamp01((elapsed - s.delay) / s.dur);
      return {
        alpha: easeOutCubic(local),
        scale: local <= 0 ? 0 : easeOutBack(local),
        flare: local > 0 && local < 1 ? Math.sin(local * Math.PI) : 0,
        raw: local,
      };
    }

    /* TRUE CIRCLES — radX === radY. An ellipse makes the same seat `rn` land
       at different Euclidean distances by angle, so co-ring parents (Mommy at
       ~−25° / Daddy at ~104°) read as different bands: one near the guide,
       one "dropped" toward the rim. Same rn must mean the same pixel radius. */
    function ringGeom() {
      const cx = W() / 2, cy = H() / 2;
      const rad = Math.max(70, Math.min(W() / 2 - 44, H() / 2 - 48));
      return { cx, cy, radX: rad, radY: rad };
    }

    /* Label clearance used when clamping seats into the frame (CSS px). */
    const LABEL_PAD_X = 36;
    const LABEL_PAD_TOP = 22;
    const LABEL_PAD_BOTTOM = 26;

    /* stable base (pre-drift) seat — band radius + same-ring collision
       separation. Edge clamp preserves angle (scales along the ray) so a
       person stays on their ring instead of being squashed into a gap. */
    function basePos(i: number): { x: number; y: number } {
      const p = people[i];
      const geom = ringGeom();
      const seat = seatsById.get(p.id) ?? { nx: 0, ny: 0, angle: 0, rn: 0 };
      let { x, y } = galaxySeatXY(seat, geom);
      const minX = LABEL_PAD_X, maxX = W() - LABEL_PAD_X;
      const minY = LABEL_PAD_TOP, maxY = H() - LABEL_PAD_BOTTOM;
      if (x < minX || x > maxX || y < minY || y > maxY) {
        const dx = x - geom.cx, dy = y - geom.cy;
        const dist = Math.hypot(dx, dy) || 1;
        /* Largest scale ≤1 that keeps the point inside the pad box. */
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

    /* Default label centres (pre neighbor-offset), then deterministic push-apart. */
    function labelAnchors(positions: { x: number; y: number }[]): Map<string, { x: number; y: number; baseDy: number; flip: boolean }> {
      const map = new Map<string, { x: number; y: number; baseDy: number; flip: boolean }>();
      for (let i = 0; i < people.length; i++) {
        const p = people[i];
        const q = positions[i];
        const form = formFromRelation(p.is_self, p.relation, p.passed_at);
        const memorial = usesMemorialGlyph(p);
        const R0 = memorial
          ? 17
          : form === "self" ? 7 : form === "ancient" ? 3.4 : form === "moon" ? 4.2 : 5;
        const below = form === "fixed" ? R0 * 3.9 + 12 : R0 * 2.9 + 12;
        const above = form === "fixed" ? R0 * 3.9 + 14 : R0 * 2.9 + 14;
        /* Prefer labels toward the core so a Ring-2 parent at the bottom
           (Daddy) is not named past the outer bands. Edge clamp still wins. */
        const geom = ringGeom();
        const preferAbove = q.y >= geom.cy;
        let flip = preferAbove || q.y + below > H() - 8;
        if (!preferAbove && q.y - above < 8) flip = false;
        let dy = flip ? -above : below;
        if (p.is_self) {
          /* Self name always under the core. */
          map.set(p.id, { x: q.x, y: q.y + below + 6, baseDy: below + 6, flip: false });
          continue;
        }
        if (form === "binary" || (semanticRing.get(p.id) ?? 4) === 1) {
          const seat = seatsById.get(p.id);
          const ang = seat?.angle ?? 0;
          /* Partner name always ABOVE its node (+ slight outward), opposite self. */
          map.set(p.id, {
            x: q.x + Math.cos(ang) * 10,
            y: q.y - above - 2,
            baseDy: -(above + 2),
            flip: true,
          });
          continue;
        }
        map.set(p.id, { x: q.x, y: q.y + dy, baseDy: dy, flip });
      }
      return map;
    }

    /* Tangential drift only — amplitude along the ring, never radial, so the
       person stays on their band. Settles in with ignition. */
    function nodePos(i: number): { x: number; y: number } {
      const p = people[i];
      const base = basePos(i);
      if (reduced || p.is_self) return base;
      const { ph, sp } = phases[i];
      const settle = clamp01(ignition(p.id).raw);
      const ang = seatsById.get(p.id)?.angle ?? 0;
      const amp = Math.sin(t * 0.00045 * sp + ph) * 6 * settle;
      return {
        x: base.x + Math.cos(ang + Math.PI / 2) * amp,
        y: base.y + Math.sin(ang + Math.PI / 2) * amp,
      };
    }

    function coreR(p: PersonRow): number {
      if (usesMemorialGlyph(p)) return 17; /* glyph half-extent for labels / flare (≥+50%) */
      const form = formFromRelation(p.is_self, p.relation, p.passed_at);
      const base = form === "self" ? 7 : form === "ancient" ? 3.4 : form === "moon" ? 4.2 : 5;
      return base;
    }

    /**
     * Memorial constellation glyph — stroke-light point-and-line pattern centered
     * on the seat (centroid). No per-star glow stack. Honor edges attach here.
     * Radius ≥+50% vs. the prior 12/14 seat so patterns read on the galaxy;
     * lineW / starR stay thin so the frame budget does not grow with area.
     * lowPerf: thinner stroke, skip soft wash. reduced: no shimmer.
     */
    function drawMemorialGlyph(
      q: { x: number; y: number },
      col: string,
      pattern: MemorialConstellation,
      scale: number,
      twinkle: number,
      isHovered: boolean,
    ) {
      const radius = (lowPerf ? 18 : 21) * scale * (isHovered ? 1.08 : 1);
      /* stroke-light on purpose — larger seat, not thicker ink */
      const lineW = lowPerf ? 0.85 : 1.05;
      const starR = (lowPerf ? 1.25 : 1.45) * scale;
      const lineA = (isHovered ? 0.78 : 0.58) * (reduced ? 1 : twinkle);
      const starA = (isHovered ? 0.95 : 0.82) * (reduced ? 1 : twinkle);

      /* single soft wash behind the whole glyph — not a per-star glow stack */
      if (!lowPerf) {
        const wash = cx.createRadialGradient(q.x, q.y, 0, q.x, q.y, radius * 1.55);
        wash.addColorStop(0, hexA(col, 0.14 * (isHovered ? 1.35 : 1)));
        wash.addColorStop(1, hexA(col, 0));
        cx.beginPath();
        cx.arc(q.x, q.y, radius * 1.55, 0, Math.PI * 2);
        cx.fillStyle = wash;
        cx.fill();
      }

      const pts = pattern.stars.map(([nx, ny]) => ({
        x: q.x + nx * radius,
        /* Dec-north up → canvas y down */
        y: q.y - ny * radius,
      }));

      cx.strokeStyle = hexA(col, lineA);
      cx.lineWidth = lineW;
      cx.lineCap = "round";
      cx.lineJoin = "round";
      for (const [a, b] of pattern.lines) {
        const pa = pts[a];
        const pb = pts[b];
        if (!pa || !pb) continue;
        cx.beginPath();
        cx.moveTo(pa.x, pa.y);
        cx.lineTo(pb.x, pb.y);
        cx.stroke();
      }

      for (const pt of pts) {
        cx.beginPath();
        cx.arc(pt.x, pt.y, starR, 0, Math.PI * 2);
        cx.fillStyle = hexA(col, starA);
        cx.fill();
      }
    }

    /* ── layered radial glow: soft element-hued halo + a bright inner core.
       precision→brightness kept sacred: exact = crisp & bright (tight halo,
       hot core); year-only ancient light = soft & diffuse (wide, dim). ── */
    function drawGlow(q: { x: number; y: number }, col: string, R: number, s: number,
                      intensity: number, isHovered: boolean, scale: number) {
      const haloR = R * (s === 1 ? 5 : s > 0.5 ? 7.5 : 10.5) * (isHovered ? 1.3 : 1) * scale;
      const halo  = cx.createRadialGradient(q.x, q.y, 0, q.x, q.y, haloR);
      halo.addColorStop(0,    hexA(col, (0.5 * s + 0.16) * intensity * (isHovered ? 1.35 : 1)));
      halo.addColorStop(0.35, hexA(col, 0.12 * s * intensity));
      halo.addColorStop(1,    hexA(col, 0));
      cx.beginPath(); cx.arc(q.x, q.y, haloR, 0, Math.PI * 2); cx.fillStyle = halo; cx.fill();

      /* inner white-hot bloom — the second glow layer, dropped on lowPerf */
      if (!lowPerf) {
        const coreR2 = R * (s === 1 ? 2.8 : s > 0.5 ? 2.4 : 2.0) * scale;
        const core   = cx.createRadialGradient(q.x, q.y, 0, q.x, q.y, coreR2);
        core.addColorStop(0,   hexA("#ffffff", (0.55 * s + 0.12) * intensity));
        core.addColorStop(0.5, hexA(col, 0.28 * s * intensity));
        core.addColorStop(1,   hexA(col, 0));
        cx.beginPath(); cx.arc(q.x, q.y, coreR2, 0, Math.PI * 2); cx.fillStyle = core; cx.fill();
      }
    }

    /* ── draw a single celestial body (from prototype drawBody) ── */
    function drawBody(
      i: number,
      q: { x: number; y: number },
      isHovered: boolean,
      isActive: boolean,
      labelPos: { x: number; y: number },
    ) {
      const p     = people[i];
      /* Single resolution point — star_color ?? element/self gold. */
      const col   = resolveNodeColor(p);
      const s     = sharp(p.birth_precision);
      const R0    = coreR(p);
      const form  = formFromRelation(p.is_self, p.relation, p.passed_at);
      const memorialPattern = usesMemorialGlyph(p)
        ? getMemorialConstellation(p.memorial_constellation)
        : null;
      const ign   = ignition(p.id);
      if (ign.alpha <= 0.001) return; /* not yet kindled */
      const scale = reduced ? 1 : Math.max(0.001, ign.scale);
      const R     = R0 * scale;
      /* gentle organic twinkle (two slow summed sines — NOT a flicker).
         Periods stretched again so living light reads as calm shimmer, not
         pulse: ~45–100s (was ~14–30s). Amplitude unchanged (~0.065). Same
         rate under lowPerf — no faster path on small viewports. Per-star
         phase (phases[i].ph) staggers them so they don't pulse in unison. */
      const tw    = reduced ? 1 : (1 + 0.04 * Math.sin(t * 0.00018 * phases[i].sp + phases[i].ph)
                                     + 0.025 * Math.sin(t * 0.0001 + phases[i].ph * 1.7));

      cx.save();
      cx.globalAlpha = reduced ? globalFade : easeOutCubic(ign.raw);

      /* Memorial glyph replaces ancient-light body — no drawGlow stack. */
      if (memorialPattern) {
        if (ign.flare > 0 && !lowPerf) {
          const fr = R0 * 2.2 * (1.1 + 0.5 * ign.flare);
          const fg = cx.createRadialGradient(q.x, q.y, 0, q.x, q.y, fr);
          fg.addColorStop(0, hexA(col, 0.22 * ign.flare));
          fg.addColorStop(1, hexA(col, 0));
          cx.beginPath(); cx.arc(q.x, q.y, fr, 0, Math.PI * 2); cx.fillStyle = fg; cx.fill();
        }
        drawMemorialGlyph(q, col, memorialPattern, scale, tw, isHovered);
        if (isActive && !reduced) {
          cx.beginPath();
          cx.arc(q.x, q.y, R0 * (1.55 + 0.25 * Math.sin(t * 0.025 + phases[i].ph)), 0, Math.PI * 2);
          cx.strokeStyle = hexA(col, 0.22); cx.lineWidth = 1; cx.stroke();
        }
        const litM = isHovered ? 0.96 : Math.max(0.78, 0.45 + 0.4 * s);
        const uncertainM = !p.is_self && s < 1;
        cx.font = `${isHovered ? "500" : "400"}${uncertainM ? " italic" : ""} 11px Inter, sans-serif`;
        cx.fillStyle = uncertainM
          ? `rgba(168,160,198,${litM})`
          : `rgba(185,174,222,${litM})`;
        cx.textAlign = "center";
        const lxM = Math.min(W() - 8, Math.max(8, labelPos.x));
        const lyM = Math.min(H() - 6, Math.max(12, labelPos.y));
        cx.fillText(p.display_name, lxM, lyM);
        cx.restore();
        return;
      }

      /* layered glow */
      drawGlow(q, col, R0, s, tw, isHovered, scale);

      /* ignition flare — a brief extra bloom as the star lights, brightest for self */
      if (ign.flare > 0) {
        const fr = R0 * (s === 1 ? 5.5 : 8) * (1.2 + 0.6 * ign.flare);
        const fg = cx.createRadialGradient(q.x, q.y, 0, q.x, q.y, fr);
        fg.addColorStop(0, hexA("#ffffff", (p.is_self ? 0.5 : 0.32) * ign.flare));
        fg.addColorStop(0.5, hexA(col, 0.2 * ign.flare));
        fg.addColorStop(1, hexA(col, 0));
        cx.beginPath(); cx.arc(q.x, q.y, fr, 0, Math.PI * 2); cx.fillStyle = fg; cx.fill();
      }

      /* celestial form body */
      if (form === "binary") {
        /* Primary body + thin orbit + one smaller companion on the OUTWARD side
           of the seat (never toward self) so the core stays two distinct stars. */
        const seat = seatsById.get(p.id);
        const baseAng = seat?.angle ?? 0;
        const a = reduced ? baseAng : baseAng + t * 0.000286;
        const sep = 10;
        const cx2 = q.x + Math.cos(a) * sep;
        const cy2 = q.y + Math.sin(a) * sep * 0.55;
        cx.strokeStyle = hexA(col, 0.34); cx.lineWidth = 1;
        cx.beginPath(); cx.ellipse(q.x, q.y, sep, sep * 0.55, 0, 0, Math.PI * 2); cx.stroke();
        cx.beginPath(); cx.arc(q.x, q.y, R * 0.92, 0, Math.PI * 2); cx.fillStyle = col; cx.fill();
        cx.beginPath(); cx.arc(q.x, q.y, R * 0.4, 0, Math.PI * 2); cx.fillStyle = "rgba(255,255,255,.92)"; cx.fill();
        const or_ = R * 0.48;
        const bg = cx.createRadialGradient(cx2, cy2, 0, cx2, cy2, or_ * 2.2);
        bg.addColorStop(0, hexA(col, 0.45 * tw)); bg.addColorStop(1, hexA(col, 0));
        cx.beginPath(); cx.arc(cx2, cy2, or_ * 2.2, 0, Math.PI * 2); cx.fillStyle = bg; cx.fill();
        cx.beginPath(); cx.arc(cx2, cy2, or_, 0, Math.PI * 2); cx.fillStyle = col; cx.fill();
      } else if (form === "moon") {
        cx.beginPath(); cx.arc(q.x, q.y, R, 0, Math.PI * 2); cx.fillStyle = hexA(col, 0.30); cx.fill();
        cx.save(); cx.beginPath(); cx.arc(q.x, q.y, R, 0, Math.PI * 2); cx.clip();
        const off = R * 0.62;
        /* soft crescent shading */
        cx.beginPath(); cx.arc(q.x - off * 0.55, q.y - off * 0.42, R * 1.02, 0, Math.PI * 2);
        cx.fillStyle = col; cx.fill();
        /* gentle shimmer riding the lit crescent */
        const sh = reduced ? 0 : (0.5 + 0.5 * Math.sin(t * 0.0012 + phases[i].ph));
        cx.beginPath(); cx.arc(q.x - off * 0.55, q.y - off * 0.42, R * 1.02, 0, Math.PI * 2);
        cx.fillStyle = `rgba(255,255,255,${0.06 + 0.08 * sh})`; cx.fill();
        cx.restore();
        cx.beginPath(); cx.arc(q.x, q.y, R, 0, Math.PI * 2);
        cx.strokeStyle = hexA(col, 0.5); cx.lineWidth = 0.8; cx.stroke();
      } else if (form === "fixed") {
        const fl = R * 3.1 * (isHovered ? 1.2 : 1);
        cx.strokeStyle = hexA(col, 0.42 * tw); cx.lineWidth = 0.9;
        cx.beginPath(); cx.moveTo(q.x - fl, q.y); cx.lineTo(q.x + fl, q.y);
        cx.moveTo(q.x, q.y - fl); cx.lineTo(q.x, q.y + fl); cx.stroke();
        cx.beginPath(); cx.arc(q.x, q.y, R, 0, Math.PI * 2); cx.fillStyle = col; cx.fill();
        cx.beginPath(); cx.arc(q.x, q.y, R * 0.42, 0, Math.PI * 2); cx.fillStyle = "rgba(255,255,255,.95)"; cx.fill();
      } else if (form === "ancient") {
        const rr = R * (1 + (reduced ? 0 : 0.06 * Math.sin(t * 0.0011 + phases[i].ph)));
        cx.beginPath(); cx.arc(q.x, q.y, rr, 0, Math.PI * 2); cx.fillStyle = hexA(col, 0.62); cx.fill();
        const ringR = R * (4.4 + (reduced ? 0 : (Math.sin(t * 0.0007 + phases[i].ph) + 1) * 1.5));
        cx.beginPath(); cx.arc(q.x, q.y, ringR, 0, Math.PI * 2);
        cx.strokeStyle = hexA(col, 0.13); cx.lineWidth = 1; cx.stroke();
      } else if (form === "self") {
        cx.beginPath(); cx.arc(q.x, q.y, R, 0, Math.PI * 2); cx.fillStyle = col; cx.fill();
        cx.beginPath(); cx.arc(q.x, q.y, R * 0.45, 0, Math.PI * 2); cx.fillStyle = "rgba(255,255,255,.97)"; cx.fill();
        cx.beginPath(); cx.arc(q.x, q.y, R * 1.85, 0, Math.PI * 2);
        cx.strokeStyle = hexA(col, 0.30); cx.lineWidth = 1; cx.stroke();
      } else {
        cx.beginPath(); cx.arc(q.x, q.y, R, 0, Math.PI * 2); cx.fillStyle = col; cx.fill();
        cx.beginPath(); cx.arc(q.x, q.y, R * 0.4, 0, Math.PI * 2); cx.fillStyle = "rgba(255,255,255,.90)"; cx.fill();
      }

      /* transit shimmer pulse ring */
      if (isActive && !reduced) {
        cx.beginPath(); cx.arc(q.x, q.y, R0 * (2.8 + 0.8 * Math.sin(t * 0.025 + phases[i].ph)), 0, Math.PI * 2);
        cx.strokeStyle = hexA(col, 0.25); cx.lineWidth = 1; cx.stroke();
      }

      /* name label — every ignited node keeps its name. Floor alpha so year/none
         stay legible (uncertainty is the softer mist colour + italic, not fade).
         Position comes from deterministic neighbor offsets (not only edge flip). */
      const lit = isHovered ? 0.96 : Math.max(0.78, 0.45 + 0.4 * s);
      const uncertain = !p.is_self && s < 1;
      cx.font = `${isHovered ? "500" : "400"}${uncertain ? " italic" : ""} 11px Inter, sans-serif`;
      cx.fillStyle = p.is_self
        ? `rgba(244,236,219,${Math.max(lit, 0.9)})`
        : uncertain
          ? `rgba(168,160,198,${lit})`
          : `rgba(185,174,222,${lit})`;
      cx.textAlign = "center";
      const lx = Math.min(W() - 8, Math.max(8, labelPos.x));
      const ly = Math.min(H() - 6, Math.max(12, labelPos.y));
      cx.fillText(p.display_name, lx, ly);

      cx.restore();
    }

    /* ── a bezier link that draws itself in (progress 0→1), with a travelling
       pulse once fully drawn (from prototype) ── */
    function drawLink(link: LinkRow, posA: { x: number; y: number }, posB: { x: number; y: number }, progress: number) {
      const { cpx, cpy } = bezierCP(posA.x, posA.y, posB.x, posB.y);
      const colA = EL_COLOR[link.elA] ?? "#B79AD8";
      const colB = EL_COLOR[link.elB] ?? "#B79AD8";

      /* gradient stroke */
      const grad = cx.createLinearGradient(posA.x, posA.y, posB.x, posB.y);
      grad.addColorStop(0,   hexA(colA, 0));
      grad.addColorStop(0.5, hexA(colA, link.scoreA >= 62 ? 0.28 : 0.16));
      grad.addColorStop(1,   hexA(colB, 0.05));
      cx.strokeStyle = grad;
      cx.lineWidth   = 0.8;

      if (progress >= 0.999) {
        cx.beginPath();
        cx.moveTo(posA.x, posA.y);
        cx.quadraticCurveTo(cpx, cpy, posB.x, posB.y);
        cx.stroke();
      } else {
        /* animated line growth — sample the curve up to the current progress */
        const steps = 22;
        cx.beginPath();
        cx.moveTo(posA.x, posA.y);
        for (let k = 1; k <= steps; k++) {
          const tt = (k / steps) * progress;
          const px = (1-tt)*(1-tt)*posA.x + 2*(1-tt)*tt*cpx + tt*tt*posB.x;
          const py = (1-tt)*(1-tt)*posA.y + 2*(1-tt)*tt*cpy + tt*tt*posB.y;
          cx.lineTo(px, py);
        }
        cx.stroke();
      }

      /* travelling light pulse — only once the line is fully drawn */
      if (!reduced && progress >= 0.999) {
        const linkIdx = links.indexOf(link);
        const tt = ((t * 0.0002 + linkIdx * 0.3) % 1);
        const px = (1-tt)*(1-tt)*posA.x + 2*(1-tt)*tt*cpx + tt*tt*posB.x;
        const py = (1-tt)*(1-tt)*posA.y + 2*(1-tt)*tt*cpy + tt*tt*posB.y;
        cx.beginPath();
        cx.arc(px, py, 1.2, 0, Math.PI * 2);
        cx.fillStyle = `rgba(244,236,219,${0.5 * Math.sin(tt * Math.PI)})`;
        cx.fill();
      }
    }

    /* ── Honor-constellation stroke — VISUALLY DISTINCT from synastry drawLink:
       dashed water→ancient stroke + soft wash, slower ethereal pulse.
       Attachment is the node / memorial-glyph seat centroid (same nodePos).
       Declaration data unchanged. Synastry uses solid element gradients + cream.
       Honor never uses synastry scores; source is declared relationships only. */
    function drawHonorLink(
      edge: HonorEdge,
      posA: { x: number; y: number },
      posB: { x: number; y: number },
      progress: number,
      edgeIndex: number
    ) {
      /* Defensive: honor layer only draws remembrance continuity edges. */
      if (edge.relationType !== HONOR_RELATION_TYPE) return;
      const { cpx, cpy } = bezierCP(posA.x, posA.y, posB.x, posB.y);
      const water = HONOR_LINE_STYLE.water;
      const ancient = HONOR_LINE_STYLE.ancient;

      /* soft wash under the dash — ancient-light halo, not an element gradient */
      const wash = cx.createLinearGradient(posA.x, posA.y, posB.x, posB.y);
      wash.addColorStop(0,   hexA(water, 0));
      wash.addColorStop(0.5, hexA(water, HONOR_LINE_STYLE.washAlpha * progress));
      wash.addColorStop(1,   hexA(ancient, 0));
      cx.save();
      cx.strokeStyle = wash;
      cx.lineWidth = HONOR_LINE_STYLE.lineWidth + 2.2;
      cx.setLineDash([]);
      cx.beginPath();
      cx.moveTo(posA.x, posA.y);
      cx.quadraticCurveTo(cpx, cpy, posB.x, posB.y);
      cx.stroke();

      /* dashed continuity stroke — the tell vs solid synastry edges */
      const stroke = cx.createLinearGradient(posA.x, posA.y, posB.x, posB.y);
      stroke.addColorStop(0,   hexA(water, HONOR_LINE_STYLE.strokeAlpha * 0.4 * progress));
      stroke.addColorStop(0.5, hexA(water, HONOR_LINE_STYLE.strokeAlpha * progress));
      stroke.addColorStop(1,   hexA(ancient, HONOR_LINE_STYLE.strokeAlpha * 0.85 * progress));
      cx.strokeStyle = stroke;
      cx.lineWidth = HONOR_LINE_STYLE.lineWidth;
      cx.setLineDash(progress >= 0.999 ? [...HONOR_LINE_STYLE.dash] : []);
      cx.lineDashOffset = reduced ? 0 : -t * 0.012;
      cx.beginPath();
      if (progress >= 0.999) {
        cx.moveTo(posA.x, posA.y);
        cx.quadraticCurveTo(cpx, cpy, posB.x, posB.y);
      } else {
        const steps = 22;
        cx.moveTo(posA.x, posA.y);
        for (let k = 1; k <= steps; k++) {
          const tt = (k / steps) * progress;
          const px = (1 - tt) * (1 - tt) * posA.x + 2 * (1 - tt) * tt * cpx + tt * tt * posB.x;
          const py = (1 - tt) * (1 - tt) * posA.y + 2 * (1 - tt) * tt * cpy + tt * tt * posB.y;
          cx.lineTo(px, py);
        }
      }
      cx.stroke();
      cx.setLineDash([]);

      /* slower water-tinted pulse — never the cream synastry bead */
      if (!reduced && progress >= 0.999) {
        const tt = ((t * 0.00011 + edgeIndex * 0.37) % 1);
        const px = (1 - tt) * (1 - tt) * posA.x + 2 * (1 - tt) * tt * cpx + tt * tt * posB.x;
        const py = (1 - tt) * (1 - tt) * posA.y + 2 * (1 - tt) * tt * cpy + tt * tt * posB.y;
        const pr = HONOR_LINE_STYLE.pulseRadius * (0.7 + 0.3 * Math.sin(tt * Math.PI));
        const pg = cx.createRadialGradient(px, py, 0, px, py, pr * 3);
        pg.addColorStop(0, hexA(water, 0.55 * Math.sin(tt * Math.PI)));
        pg.addColorStop(0.5, hexA(ancient, 0.22 * Math.sin(tt * Math.PI)));
        pg.addColorStop(1, hexA(water, 0));
        cx.beginPath();
        cx.arc(px, py, pr * 3, 0, Math.PI * 2);
        cx.fillStyle = pg;
        cx.fill();
      }
      cx.restore();
    }

    /* ── volumetric generational nebulae ────────────────────────────────
       Each cohort (people sharing a Pluto sign) gets a soft gas cloud sitting
       BEHIND its stars, so those stars glow through it — the visual payoff of
       "the sky you were all born under". Not a flat tint / hard circle: several
       offset radial puffs of different sizes give an organic edge, all built
       with 'lighter' compositing so overlapping cohorts ADD into brighter seams
       rather than stacking as opaque blobs. Colour is derived from the cohort's
       outer-planet signature (cohortHsla). No ctx.filter blur.

       Rendered into a throttled offscreen layer (see draw()): the drift is very
       slow, so re-rasterising the gradients only a few times a second and
       blitting the cache in between keeps mobile smooth. */
    function renderNebulae(tctx: CanvasRenderingContext2D, positions: { x: number; y: number }[], nebFade: number) {
      const groups = new Map<string, number[]>();
      for (let i = 0; i < people.length; i++) {
        const key = cohortByPerson[people[i].id];
        if (!key) continue; /* no chart → no cohort → no fabricated nebula */
        const arr = groups.get(key);
        if (arr) arr.push(i); else groups.set(key, [i]);
      }
      if (groups.size === 0) return;

      tctx.save();
      tctx.globalCompositeOperation = "lighter";
      groups.forEach((idxs, key) => {
        let cxm = 0, cym = 0;
        for (const i of idxs) { cxm += positions[i].x; cym += positions[i].y; }
        cxm /= idxs.length; cym /= idxs.length;
        let rad = 0;
        for (const i of idxs) rad = Math.max(rad, Math.hypot(positions[i].x - cxm, positions[i].y - cym));
        rad = Math.max(rad, 54) + 96; /* soft margin so the stars sit inside the cloud */
        const si = SIGN_INDEX[key] ?? 0;

        /* one broad puff + a couple of smaller offset ones for an organic edge */
        const puffCount = lowPerf ? 2 : 3;
        for (let k = 0; k < puffCount; k++) {
          const seed  = si * 13 + k * 7;
          const drift = reduced ? 0 : Math.sin(t * 0.0004 + seed);
          const ang   = seed * 1.7;
          const dist  = (k === 0 ? 0 : rad * 0.34) * (0.82 + 0.18 * drift);
          const ox    = cxm + Math.cos(ang) * dist;
          const oy    = cym + Math.sin(ang) * dist * 0.8;
          const pr    = rad * (k === 0 ? 1 : 0.66) * (1 + (reduced ? 0 : 0.05 * drift));
          const g = tctx.createRadialGradient(ox, oy, 0, ox, oy, pr);
          g.addColorStop(0,    cohortHsla(si, 0.12 * nebFade));
          g.addColorStop(0.5,  cohortHsla(si, 0.05 * nebFade));
          g.addColorStop(1,    cohortHsla(si, 0));
          tctx.beginPath(); tctx.arc(ox, oy, pr, 0, Math.PI * 2); tctx.fillStyle = g; tctx.fill();
        }
      });
      tctx.restore();
    }

    /* ── ambient shooting stars (atmosphere, not data) ── */
    function spawnMeteor() {
      if (reduced || meteorsOff) return;
      if (!forceMeteors && meteors.length >= 2) return;
      const w = W(), h = H();
      /* Short diagonal across a quiet patch of sky — never toward a person. */
      const x0 = w * (0.08 + Math.random() * 0.84);
      const y0 = h * (0.06 + Math.random() * 0.42);
      const dir = Math.random() < 0.5 ? 1 : -1;
      const ang = 0.35 + Math.random() * 0.55; /* gentle downward diagonal */
      const len = 56 + Math.random() * 48;     /* short path — calm, not a show */
      meteors.push({
        x0, y0,
        x1: x0 + Math.cos(ang) * len * dir,
        y1: y0 + Math.sin(ang) * len,
        born: t,
        life: 620 + Math.random() * 420,
      });
    }

    function drawMeteors() {
      if (reduced || meteorsOff) {
        if (meteors.length) meteors.length = 0;
        return;
      }
      /* Shipping: first try ~5.2–8s after draw starts, then every ~7–15s at 45%.
         TEMP-DEMO ?meteors=force: one every 2s, uncapped. */
      if (nextMeteorAt === 0) {
        nextMeteorAt = forceMeteors ? t + 200 : t + 5200 + Math.random() * 2800;
      }
      if (t >= nextMeteorAt) {
        nextMeteorAt = t + (forceMeteors ? 2000 : 7000 + Math.random() * 8000);
        if (forceMeteors || Math.random() < 0.45) spawnMeteor();
      }
      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i];
        const u = (t - m.born) / m.life;
        if (u >= 1) { meteors.splice(i, 1); continue; }
        const cxp = m.x0 + (m.x1 - m.x0) * u;
        const cyp = m.y0 + (m.y1 - m.y0) * u;
        const trail = 0.07;
        const pxp = m.x0 + (m.x1 - m.x0) * Math.max(0, u - trail);
        const pyp = m.y0 + (m.y1 - m.y0) * Math.max(0, u - trail);
        const fade = Math.sin(u * Math.PI);
        /* Soft cream only — no element hue (that would imply a person/transit). */
        const g = cx.createLinearGradient(pxp, pyp, cxp, cyp);
        g.addColorStop(0, "rgba(244,236,219,0)");
        g.addColorStop(1, `rgba(244,236,219,${0.38 * fade})`);
        cx.beginPath(); cx.moveTo(pxp, pyp); cx.lineTo(cxp, cyp);
        cx.strokeStyle = g; cx.lineWidth = 1.05; cx.stroke();
        cx.beginPath(); cx.arc(cxp, cyp, 1.05, 0, Math.PI * 2);
        cx.fillStyle = `rgba(244,236,219,${0.55 * fade})`; cx.fill();
      }
    }

    /* ── hit detection ── */
    function hitTest(mx: number, my: number): PersonRow | null {
      const positions = people.map((_, i) => nodePos(i));
      for (let i = 0; i < people.length; i++) {
        const q = positions[i];
        const hitR = usesMemorialGlyph(people[i]) ? 28 : 22;
        if (Math.hypot(mx - q.x, my - q.y) < hitR) return people[i];
      }
      return null;
    }

    /* ── render loop ── */
    const draw = () => {
      t = performance.now();
      if (entranceStartRef.current == null) entranceStartRef.current = t;
      elapsed = t - entranceStartRef.current;
      globalFade = reduced ? clamp01(elapsed / REDUCED_FADE) : 1;

      /* adaptive frame-budget tracking (skip warmup frames).
         Shed order: ambient meteors first, then existing lowPerf stack. */
      const dt = t - lastFrame; lastFrame = t;
      if (warmup > 8) {
        emaFrameMs = emaFrameMs * 0.9 + dt * 0.1;
        if (!forceMeteors && !meteorsOff && emaFrameMs > 24) meteorsOff = true; /* first: drop streaks */
        if (!lowPerf && emaFrameMs > 26) {
          lowPerf = true; /* ~<38fps: shed a glow layer */
          if (!forceMeteors) meteorsOff = true;
        }
      } else { warmup++; }
      publishDemo();

      cx.clearRect(0, 0, W(), H());

      /* atmospheric finish: blit the cached deep-field wash + vignette (faint
         indigo centre → deep-ink edges: colour depth, plus a rim that draws the
         eye to the user's star at centre). Cached offscreen, so this is a cheap
         drawImage rather than a per-frame radial-gradient fill. */
      cx.drawImage(washCanvas, 0, 0, W(), H());

      /* soft concentric guides — sketch Rings 1–4 at ringBandRadius (same
         function as person seats). Always drawn so the legend's four bands
         stay readable even when a band is empty. Alpha kept high enough on
         lowPerf (375px phones) that Ring 2 is actually countable — 0.10 was
         invisible against the wash, so parents looked "outer" by landmarks. */
      {
        const { cx: rcx, cy: rcy, radX, radY } = ringGeom();
        const breath = (!reduced && !lowPerf)
          ? 0.012 * Math.sin(t * 0.00035)
          : 0;
        const baseAlpha = lowPerf ? 0.22 : 0.20;
        cx.save();
        for (const ring of GALAXY_GUIDE_RINGS) {
          const rn = ringBandRadius(ring) * (1 + breath);
          cx.beginPath();
          cx.ellipse(rcx, rcy, radX * rn, radY * rn, 0, 0, Math.PI * 2);
          cx.strokeStyle = `rgba(183,154,216,${baseAlpha})`;
          cx.lineWidth = lowPerf ? 1 : 1.15;
          cx.stroke();
        }
        cx.restore();
      }

      const positions = people.map((_, i) => nodePos(i));
      const byId = new Map(people.map((p, i) => [p.id, positions[i]]));
      const anchors = labelAnchors(positions);
      const labelOff = galaxyLabelOffsets(
        [...anchors.entries()].map(([id, a]) => ({ id, x: a.x, y: a.y })),
      );
      const labelPosById = new Map<string, { x: number; y: number }>();
      for (const [id, a] of anchors) {
        const o = labelOff.get(id) ?? { dx: 0, dy: 0 };
        labelPosById.set(id, { x: a.x + o.dx, y: a.y + o.dy });
      }
      /* Extra core guarantee: self + partner names stay ≥40px apart. */
      {
        const selfId = people.find((p) => p.is_self)?.id;
        const partnerId = people.find((p) => !p.is_self && semanticRing.get(p.id) === 1)?.id;
        if (selfId && partnerId) {
          const a = labelPosById.get(selfId);
          const b = labelPosById.get(partnerId);
          if (a && b && Math.hypot(a.x - b.x, a.y - b.y) < 40) {
            const ang = seatsById.get(partnerId)?.angle ?? 0;
            b.x += Math.cos(ang) * 20;
            b.y += Math.sin(ang) * 20;
            a.y += 10;
          }
        }
      }

      /* generational nebulae behind everything — bloom in just after the self
         ignites so the "sky you were born under" arrives with the sky. Redrawn
         onto the offscreen layer at most ~11×/s (drift is far slower than that)
         and blitted additively each frame, so the gradient cost is amortised. */
      const nebFade = reduced ? globalFade : clamp01((elapsed - 200) / 1200);
      if (nebCtx && nebFade > 0.001 && t - lastNebRender > 90) {
        nebCtx.clearRect(0, 0, W(), H());
        renderNebulae(nebCtx, positions, nebFade);
        lastNebRender = t;
      }
      if (nebCtx && nebFade > 0.001) {
        cx.save();
        cx.globalCompositeOperation = "lighter";
        cx.drawImage(nebCanvas, 0, 0, W(), H());
        cx.restore();
      }

      /* synastry links first — chart-chemistry (solid element gradients) */
      for (const link of links) {
        const posA = byId.get(link.fromId);
        const posB = byId.get(link.toId);
        if (!posA || !posB) continue;
        const { start, dur } = linkSchedule(link);
        const progress = reduced ? globalFade : clamp01((elapsed - start) / dur);
        if (progress <= 0.001) continue;
        drawLink(link, posA, posB, progress);
      }

      /* honor-constellation layer — declared remembrance edges only.
         Dashed water/ancient strokes; never synastry-substituted. Empty = skip. */
      honorEdges.forEach((edge, edgeIndex) => {
        const posA = byId.get(edge.fromId);
        const posB = byId.get(edge.toId);
        if (!posA || !posB) return;
        const a = schedule.get(edge.fromId), b = schedule.get(edge.toId);
        const start = Math.max(
          (a?.delay ?? 0) + (a?.dur ?? 0) * 0.55,
          (b?.delay ?? 0) + (b?.dur ?? 0) * 0.55
        );
        const progress = reduced ? globalFade : clamp01((elapsed - start) / LINK_DUR);
        if (progress <= 0.001) return;
        drawHonorLink(edge, posA, posB, progress, edgeIndex);
      });

      /* ambient streaks behind the stars — atmosphere only, never data */
      drawMeteors();

      /* nodes */
      for (let i = 0; i < people.length; i++) {
        const q     = positions[i];
        const isHov = hoverPerson?.id === people[i].id;
        const isAct = activeTransitIds.includes(people[i].id);
        const lp    = labelPosById.get(people[i].id) ?? { x: q.x, y: q.y + 20 };
        drawBody(i, q, isHov, isAct, lp);
      }

      /* keep animating: idle life forever when not reduced; under reduced motion
         only until the gentle fade completes, then rest as a static sky */
      if (!reduced) raf = requestAnimationFrame(draw);
      else if (globalFade < 1) raf = requestAnimationFrame(draw);
    };

    draw();

    /* hover */
    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const hit  = hitTest(e.clientX - rect.left, e.clientY - rect.top);
      setHoverPerson(hit);
      canvas.style.cursor = hit ? "pointer" : "default";
    };
    const onClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const hit  = hitTest(e.clientX - rect.left, e.clientY - rect.top);
      if (hit) router.push(`/app/person/${hit.id}`);
    };

    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("click", onClick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("click", onClick);
    };
  }, [loading, people, links, honorEdges, activeTransitIds, hoverPerson, router, cohortByPerson]);

  /* ─── data loading ────────────────────────────────────────────── */
  async function loadHome(uid: string, email: string) {
    setLoading(true);
    try {
      const { data: idRows } = await supabase.from("people").select("id").eq("owner_id", uid);
      const personIds = (idRows ?? []).map(r => r.id as string);

      /* FOUND HOLE CLOSED (same class as Phase 2 person-page hole):
         loadHome previously selected is_minor but NOT birth_date / birth_precision,
         so isMinorForSafety could not run. Galaxy safety now loads those fields
         and gates via isMinorForSafety — never raw is_minor alone. */
      const [{ data: profile }, { data: peopleRows }, { data: chartRows }, { data: threadRows }, { data: relRows }] = await Promise.all([
        supabase.from("profiles").select("display_name").eq("id", uid).single(),
        supabase.from("people").select("id, display_name, relation, birth_precision, birth_date, is_self, is_minor, passed_at, star_color, memorial_constellation").eq("owner_id", uid).order("created_at", { ascending: true }),
        personIds.length ? supabase.from("charts").select("person_id, data").in("person_id", personIds) : Promise.resolve({ data: [] as any[] }),
        supabase.from("threads").select("id, mode").eq("owner_id", uid).eq("status", "active").order("created_at", { ascending: false }).limit(6),
        supabase.from("relationships").select("person_a, person_b, relation_type").eq("owner_id", uid).eq("relation_type", HONOR_RELATION_TYPE),
      ]);

      setWelcomeName(profile?.display_name ?? email.split("@")[0] ?? "stargazer");
      const castPeople = (peopleRows ?? []) as PersonRow[];
      setPeople(castPeople);

      const chartById = new Map<string, NatalChart>((chartRows ?? []).map(r => [r.person_id as string, r.data as NatalChart]));

      /* cohort per person = their Pluto sign, straight from the computed chart.
         No chart → no cohort (the nebula layer simply omits them). */
      const cohortMap: Record<string, string> = {};
      for (const p of castPeople) {
        const plutoSign = chartById.get(p.id)?.generational?.pluto?.sign;
        if (plutoSign) cohortMap[p.id] = plutoSign;
      }
      setCohortByPerson(cohortMap);

      /* build links with real synastry scores + element colours */
      const calcLinks: LinkRow[] = [];
      for (let i = 0; i < castPeople.length; i++) {
        for (let j = i + 1; j < castPeople.length; j++) {
          const ca = chartById.get(castPeople[i].id);
          const cb = chartById.get(castPeople[j].id);
          const score = ca && cb ? computeSynastry(ca, cb).scores.overall : 50;
          calcLinks.push({
            fromId: castPeople[i].id, toId: castPeople[j].id, scoreA: score,
            elA: elementFromRelation(castPeople[i].relation, castPeople[i].passed_at),
            elB: elementFromRelation(castPeople[j].relation, castPeople[j].passed_at),
          });
        }
      }
      setLinks(calcLinks.sort((a, b) => b.scoreA - a.scoreA).slice(0, 14));

      /* Honor layer — declared relationships rows ONLY. Empty declaration =
         empty constellation (no default, no synastry substitution). */
      setHonorEdges(
        honorEdgesFromDeclaredRows(
          (relRows ?? []) as Array<{ person_a: string; person_b: string; relation_type: string }>,
          castPeople
        )
      );

      /* Today's sky — computed PER PERSON against their OWN natal chart.
         `todayTransitsForChart` uses real ephemeris vs each person's stored
         longitudes, so every row is that person's own real transit (or, for
         year-only / chart-less people, an honest hedge rather than a fabricated
         transit — ENGINEERING §12). This is the same helper the person page
         ("Active today") uses, so the two surfaces can never disagree.
         CARE: passed people are excluded — they have no current day. Do not
         invent a replacement sky widget; hide cleanly. */
      const now = new Date().toISOString();
      const skies: PersonSky[] = peopleForTodaySky(castPeople).map(p => {
        const chart = chartById.get(p.id);
        return {
          id: p.id,
          name: p.display_name,
          isSelf: p.is_self,
          /* FOUND HOLE CLOSED: age-aware gate — never raw is_minor alone. */
          isMinor: isMinorForSafety({
            isMinor: p.is_minor,
            birthDate: p.birth_date,
            birthPrecision: p.birth_precision,
          }),
          precision: p.birth_precision,
          hasChart: Boolean(chart),
          transits: todayTransitsForChart(chart, now),
        };
      });
      setPersonSkies(skies);

      /* thread chips */
      const threads = (threadRows ?? []) as Array<{ id: string; mode: "ask" | "shared" }>;
      if (threads.length) {
        const { data: messages } = await supabase.from("messages").select("thread_id, body").in("thread_id", threads.map(t => t.id)).order("created_at", { ascending: false });
        const prev = new Map<string, string>();
        for (const r of messages ?? []) { const tid = r.thread_id as string; if (!prev.has(tid)) prev.set(tid, (r.body as string).slice(0, 68)); }
        setThreadChips(threads.map(t => ({ id: t.id, mode: t.mode, preview: prev.get(t.id) ?? "Resume" })));
      }
    } catch (err) { setHomeStatus(err instanceof Error ? err.message : "Unable to load."); }
    finally { setLoading(false); }
  }

  async function archiveThread(threadId: string) {
    setThreadChips(prev => prev.filter(tc => tc.id !== threadId)); // hide immediately
    await setThreadStatus(supabase, threadId, "archived");
  }

  // Deterministic: a unique index on people(owner_id) WHERE is_self makes
  // "more than one self" impossible at the database level, so `.find()`
  // here can never surface the wrong one among duplicates — there can be
  // at most one to find. No ordering (created_at or otherwise) is load-bearing.
  const selfPerson = people.find(p => p.is_self);

  return (
    <main className="app-content">
      {/* ── Header ── */}
      <div className="fade-in">
        <p className="eyebrow">Home</p>
        <h1 className="page-title">Galaxia Mea</h1>
        <p className="muted">Welcome back, {welcomeName}.</p>
      </div>

      {homeStatus ? <p className="error">{homeStatus}</p> : null}

      {/* ── Living constellation — full-width, real vertical presence ── */}
      <section className="glass-card fade-in" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "20px 24px 14px", borderBottom: "1px solid rgba(255,255,255,.05)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <p className="eyebrow" style={{ margin: 0 }}>Your constellation</p>
          {!loading && people.length > 0 ? (
            <Link href="/app/add-person" className="pill-link pill-link--gold" style={{ padding: "8px 16px", fontSize: ".82rem", textDecoration: "none", flexShrink: 0 }}>
              + Add person
            </Link>
          ) : null}
        </div>

        {loading ? (
          <div style={{ padding: 24 }}>
            <div className="skeleton" style={{ width: "100%", height: 400, borderRadius: 12 }} />
          </div>
        ) : people.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center" }}>
            <p className="muted" style={{ marginBottom: 16 }}>Your constellation is empty — start by adding yourself.</p>
            <Link href="/welcome" className="btn-primary">Add yourself &amp; your people</Link>
          </div>
        ) : (
          /* Near-square card: phone gets mild vertical room without a tall
             skinny ellipse; desktop grows with width but caps at 680 so a
             full-bleed row does not eat the viewport (see changelog). */
          <div style={{
            position: "relative",
            width: "100%",
            aspectRatio: "1 / 1.12",
            minHeight: 380,
            maxHeight: "min(72vh, 680px)",
          }}>
            <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, display: "block", width: "100%", height: "100%" }} />

            {/* fine film grain over the focal plane — texture, not static.
               Static SVG noise (same recipe as CosmicBackground), very low
               opacity, mix-blend overlay. A CSS overlay, so it costs nothing
               per frame — the animated canvas never touches it. */}
            <div aria-hidden style={{
              position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none",
              opacity: 0.045, mixBlendMode: "overlay",
              backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
            }} />

            {/* hover inspector — glass card floating over canvas */}
            {hoverPerson ? (
              <div style={{
                position: "absolute", top: 16, right: 16, zIndex: 2,
                width: 220, padding: "16px 18px", borderRadius: 16,
                background: "linear-gradient(165deg, rgba(255,255,255,.065), rgba(255,255,255,.018))",
                backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)",
                border: "1px solid rgba(230,174,108,.18)",
                boxShadow: "0 20px 50px -20px rgba(0,0,0,.8), inset 0 1px 0 rgba(255,255,255,.07)",
                pointerEvents: "none",
              }}>
                <p style={{ fontSize: ".6rem", fontWeight: 700, letterSpacing: ".2em", textTransform: "uppercase", color: "var(--gold)", marginBottom: 6 }}>
                  {formFromRelation(hoverPerson.is_self, hoverPerson.relation, hoverPerson.passed_at).replace(/-/g, " ")}
                  {hasPassed(hoverPerson) ? " · remembered" : ""}
                </p>
                <p style={{ fontFamily: "var(--serif)", fontSize: "1.1rem", color: "var(--cream)", marginBottom: 2 }}>{hoverPerson.display_name}</p>
                <p style={{ fontSize: ".74rem", color: "var(--mist2)", marginBottom: 10 }}>{hoverPerson.relation} · {hoverPerson.birth_precision}</p>
                <p style={{ fontSize: ".72rem", color: "var(--teal)", display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 100, background: "rgba(111,177,184,.1)", border: "1px solid rgba(111,177,184,.24)" }}>Click to open profile</p>
              </div>
            ) : null}
          </div>
        )}

        {/* Legend strip */}
        {people.length > 0 ? (
          <div style={{ padding: "12px 24px 18px", borderTop: "1px solid rgba(255,255,255,.05)", display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
            {[
              { label: "Partner / binary at core", color: EL_COLOR.air },
              { label: "Ring 1 · children", color: EL_COLOR.earth },
              { label: "Ring 2 · parents & siblings", color: EL_COLOR.water },
              { label: "Ring 3 · friends & relatives", color: EL_COLOR.fire },
              { label: "Ring 4 · colleagues", color: EL_COLOR.earth },
              { label: "Remembered / ancient light", color: "#DA8C8C" },
              ...(honorEdges.length > 0
                ? [{ label: "Honor / remembrance light", color: HONOR_LINE_STYLE.water }]
                : []),
            ].map(({ label, color }) => (
              <span key={label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: ".68rem", color: "var(--mist2)" }}>
                <span style={{
                  width: label.startsWith("Honor") ? 14 : 8,
                  height: label.startsWith("Honor") ? 2 : 8,
                  borderRadius: label.startsWith("Honor") ? 1 : "50%",
                  background: color,
                  display: "inline-block",
                  flexShrink: 0,
                  borderTop: label.startsWith("Honor") ? `1px dashed ${HONOR_LINE_STYLE.ancient}` : undefined,
                }} />
                {label}
              </span>
            ))}
            <span style={{ marginLeft: "auto", fontSize: ".68rem", color: "var(--mist2)" }}>Hover to preview · click to open</span>
          </div>
        ) : null}
      </section>

      {/* ── Today in your sky ──
         One row per person, each computed against THAT person's own natal chart.
         Distinct charts produce distinct transits/orbs; a shared transit only
         appears when it is genuinely true for both. Year-only / chart-less
         people are hedged honestly rather than given a fabricated transit. */}
      {!loading && personSkies.length > 0 ? (
        <section className="glass-card fade-in fade-in-delay-1">
          <p className="eyebrow">Today in your sky</p>
          <p className="muted" style={{ fontSize: ".78rem", marginBottom: 10 }}>
            {activeTransitIds.length > 0
              ? "Real transits, computed against each person's own chart — tap a row to see it applied."
              : "No tight transits touching anyone's chart right now."}
          </p>
          <div style={{ display: "grid", gap: 2 }}>
            {[...personSkies.filter(s => s.isSelf), ...personSkies.filter(s => !s.isSelf)].map(sky => {
              const top = sky.transits[0];
              /* Meaning-first: the plain-language line is the headline, the
                 notation ("Saturn square Uranus · 0.0°") demoted to small proof
                 beneath it. Accurate translation only — no fabrication (§8/§12);
                 `minorSafe` keeps a child's reading age-appropriate (§9/§13). */
              const detail: ReactNode = top
                ? (
                  <>
                    <span style={{ color: "var(--cream)", fontSize: ".84rem", lineHeight: 1.45 }}>
                      {interpretTransit(top, { possessive: sky.isSelf ? "your" : "their", minorSafe: sky.isMinor }).short}
                    </span>
                    <span style={{ display: "block", marginTop: 3, fontSize: ".7rem", color: "var(--mist2)" }}>
                      <span style={{ color: "var(--gold-soft)" }}>{transitNotation(top)} · {top.orb.toFixed(1)}°</span>
                      {sky.transits.length > 1 ? (
                        <span style={{ marginLeft: 8 }}>+{sky.transits.length - 1} more</span>
                      ) : null}
                    </span>
                  </>
                )
                : sky.precision === "year"
                  ? <span style={{ color: "var(--mist2)", fontStyle: "italic" }}>Birth year only — a birth date is needed for daily transits.</span>
                  : !sky.hasChart
                    ? <span style={{ color: "var(--mist2)", fontStyle: "italic" }}>No birth data yet — add it to see their sky.</span>
                    : <span style={{ color: "var(--mist2)" }}>No tight transits today.</span>;
              return (
                <Link
                  key={sky.id}
                  href={`/app/person/${sky.id}${top ? "?transit=1" : ""}`}
                  style={{
                    display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap",
                    padding: "9px 10px", borderRadius: 10, textDecoration: "none",
                    borderLeft: top ? "2px solid rgba(230,174,108,.4)" : "2px solid rgba(255,255,255,.06)",
                    background: top ? "rgba(230,174,108,.05)" : "transparent",
                  }}
                >
                  <span style={{ color: "var(--cream)", fontWeight: 600, fontSize: ".84rem", minWidth: 96 }}>
                    {sky.isSelf ? "You" : sky.name}
                  </span>
                  <span style={{ fontSize: ".8rem", flex: 1, minWidth: 0 }}>{detail}</span>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* ── Recent Vela threads ── */}
      {!loading && threadChips.length > 0 ? (
        <section className="glass-card fade-in fade-in-delay-1">
          <p className="eyebrow">Resume a thread</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
            {threadChips.map(tc => (
              <span key={tc.id} className="pill-link" style={{ gap: 8, display: "inline-flex", alignItems: "center" }}>
                <Link href={`/app/vela?threadId=${tc.id}`} style={{ display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none", color: "inherit" }}>
                  <span style={{ color: "var(--gold-soft)", fontSize: ".65rem", textTransform: "uppercase", letterSpacing: ".08em" }}>{tc.mode}</span>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200, fontSize: ".82rem" }}>{tc.preview}</span>
                </Link>
                <ThreadMenu threadId={tc.id} onArchive={archiveThread} />
              </span>
            ))}
          </div>
        </section>
      ) : null}

      {/* ── Contextual actions (global nav lives in the header — A7: no duplicate row) ──
         "+ Add person" lives in the constellation card header and routes to
         /app/add-person (standalone form — not /welcome onboarding). The only
         natural next step left here is opening your own chart. Compare/Groups/
         Vela/Quick Chart are one tap away in the sticky header. */}
      {!loading && selfPerson ? (
        <div className="fade-in fade-in-delay-2">
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link href={`/app/person/${selfPerson.id}`} className="pill-link">My chart</Link>
          </div>
        </div>
      ) : null}
    </main>
  );
}

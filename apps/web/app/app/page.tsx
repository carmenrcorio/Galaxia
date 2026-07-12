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
 * - Radial glow halo: createRadialGradient, 5-11×R depending on data precision (sharp=crisp, year=diffuse)
 * - Links: quadratic bezier + gradient between node element colours + travelling light pulse
 * - Gentle drift: sin/cos phase per person, disabled under prefers-reduced-motion
 * - Hover: inspector panel slides in (glass-card style) from right; click routes to /app/person/[id]
 * - Duplicate bottom nav row: DELETED per spec
 */

import { computeSynastry, type NatalChart, type TransitHit } from "@galaxia/astro";
import { isMinorForSafety } from "@galaxia/core";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { InitialAvatar } from "../../components/initial-avatar";
import { ThreadMenu } from "../../components/thread-menu";
import {
  HONOR_LINE_STYLE,
  HONOR_RELATION_TYPE,
  honorEdgesFromDeclaredRows,
  type HonorEdge,
} from "../../lib/honor-constellation";
import {
  elementFromRelation,
  formFromRelation,
  hasPassed,
  ringIndex,
} from "../../lib/galaxy-orbit";
import { setThreadStatus } from "../../lib/record";
import { createSupabaseBrowserClient } from "../../lib/supabase/client";
import { todayTransitsForChart } from "../../lib/transits";
import { interpretTransit, transitNotation } from "../../lib/transit-interpretations";

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

/* element colours from prototype ELEM / landing EL_SOLID */
const EL_COLOR: Record<string, string> = {
  fire: "#E0825C", earth: "#cdbd7a", air: "#B79AD8", water: "#6FB1B8",
  gold: "#E6AE6C" /* self */
};

/* Orbit helpers (elementFromRelation / formFromRelation / ringIndex) live in
   lib/galaxy-orbit.ts so Remembrance can reuse ancient light without a new
   visual language, and so the mapping is unit-tested. */

/* stable per-person value in [0,1) from a string id — deterministic FNV-1a hash,
   used for organic layout jitter so the galaxy isn't a rigid dartboard while
   staying identical frame-to-frame (never Math.random per frame). */
function hash01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 100000) / 100000;
}

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

    /* ── derived orbital layout (Galaxy Phase 1) ───────────────────────────
       Each person's semantic ring comes from their relationship (ringIndex);
       we then collapse the rings ACTUALLY present onto radii that FILL the
       canvas, so the closeness ORDER is always honoured while the galaxy
       expands/contracts to use available space (Phase 2/3 responsiveness):
       partner+kids alone spread out; 14+ people stay inside the frame. Within a
       ring, people are spaced evenly around the circle; each ring is rotated by
       the golden angle (spiral-arm feel) and every star gets small, stable
       radius+angle jitter so it reads as an organic galaxy, not a dartboard.
       Computed here (before the entrance timeline) so the arrival can cascade
       OUTWARD along the spiral, inner rings first. */
    const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5)); /* ~2.399 rad */
    const nonSelf = people.filter(p => !p.is_self);
    const semanticRing = new Map<string, number>();
    for (const p of nonSelf) semanticRing.set(p.id, ringIndex(false, p.relation, p.passed_at));
    /* distinct rings present, closest-first → ordinal used for radius + rotation */
    const occupiedRings = Array.from(new Set(semanticRing.values())).sort((a, b) => a - b);
    const ringOrdinal = new Map<number, number>(occupiedRings.map((r, i) => [r, i]));
    /* members per ring (stable people-order) for even angular distribution */
    const ringMembers = new Map<number, string[]>();
    for (const p of nonSelf) {
      const sr = semanticRing.get(p.id)!;
      const arr = ringMembers.get(sr);
      if (arr) arr.push(p.id); else ringMembers.set(sr, [p.id]);
    }
    const ordOf = (id: string) => ringOrdinal.get(semanticRing.get(id) ?? -1) ?? 0;

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
    /* inner rings kindle first (outward cascade); strongest bond leads within a ring */
    const ordered = people.filter(p => !p.is_self)
      .sort((a, b) => ordOf(a.id) - ordOf(b.id) || scoreToSelf(b.id) - scoreToSelf(a.id));

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

    /* reset the entrance only when the actual set of people changes */
    const entranceKey = people.map(p => p.id).join(",");
    if (entranceKey !== entranceKeyRef.current) {
      entranceKeyRef.current = entranceKey;
      entranceStartRef.current = null;
    }

    let elapsed = 0;      /* ms since entrance start (updated each frame) */
    let globalFade = 1;   /* reduced-motion fade progress */

    /* ── adaptive performance: drop the extra bloom layer if a frame budget
       is blown, so mobile degrades (fewer glow layers) rather than janks ── */
    let lowPerf = Math.min(W(), H()) < 380 || DPR >= 2 && W() < 430;
    let emaFrameMs = 16.7;
    let lastFrame = performance.now();
    let warmup = 0;

    /* per-person stable phase for drift/twinkle */
    const phases = people.map((_, i) => ({ ph: i * 1.7, sp: 0.35 + (i * 0.17 % 0.4) }));

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

    /* NORMALISED ring radius in [0,1] for a ring ordinal — 0 = at the core,
       1 = at the canvas margin. Only the rings ACTUALLY present are collapsed
       onto this range, so the closeness ORDER is always preserved while the
       galaxy expands to fill whatever space exists (few people spread out; 14+
       stay inside the frame). `RN_MIN` keeps the innermost ring clear of the
       self star; the outermost occupied ring always reaches 1 (the edge
       margin) so the spiral fills the frame instead of huddling in the centre. */
    const RN_MIN = 0.34;
    function ringNorm(ord: number): number {
      const n = occupiedRings.length;
      if (n <= 1) return 0.66; /* one ring: a comfortable single band */
      /* exponent < 1 biases rings OUTWARD so the arms reach the frame edges
         (mid rings sit well out, not bunched near the core) while the order is
         preserved and the innermost stays clear of the self star. */
      return RN_MIN + (1 - RN_MIN) * Math.pow(ord / (n - 1), 0.8);
    }

    /* ELLIPTICAL fill: the normalised radius maps onto SEPARATE x/y radii sized
       to the actual canvas (not min(W,H)), so a wide desktop canvas fills
       HORIZONTALLY and a tall mobile canvas fills VERTICALLY — the old scalar
       radius capped everything at the short side and left the wide edges dead
       (the "centre-third huddle"). Comfortable margins keep glow haloes + the
       name labels (which hang below each node) inside the frame at any size,
       incl. 375px. */
    function ringGeom() {
      const cxp = W() / 2, cyp = H() / 2;
      const radX = Math.max(60, W() / 2 - 34);
      const radY = Math.max(60, H() / 2 - 50); /* extra bottom room for labels */
      return { cxp, cyp, radX, radY };
    }

    /* stable base (pre-drift) position derived from the ring + within-ring slot.
       The angle gets a per-ring golden-angle rotation PLUS a continuous twist
       that grows with radius, so the arms sweep outward as a spiral rather than
       lining up into concentric bullseyes; small stable hash jitter keeps it a
       living galaxy, not a rigid dartboard. */
    const SPIRAL_TWIST = 1.15; /* rad of extra sweep from core to rim */
    function basePos(i: number): { x: number; y: number } {
      const p = people[i];
      const { cxp, cyp, radX, radY } = ringGeom();
      if (p.is_self) return { x: cxp, y: cyp };
      const sr = semanticRing.get(p.id)!;
      const ord = ringOrdinal.get(sr)!;
      const members = ringMembers.get(sr)!;
      const slot = members.indexOf(p.id);
      const count = Math.max(members.length, 1);
      const jA = hash01(p.id + "a"), jR = hash01(p.id + "r");
      const spacing = (Math.PI * 2) / count;
      const rn = ringNorm(ord) * (1 + (jR - 0.5) * 0.12); /* ±6% radius jitter */
      /* even spread + per-ring golden rotation + radius-scaled spiral twist + jitter */
      const angle = -Math.PI / 2 + ord * GOLDEN_ANGLE + rn * SPIRAL_TWIST
                  + slot * spacing + (jA - 0.5) * spacing * 0.3;
      return { x: cxp + rn * radX * Math.cos(angle), y: cyp + rn * radY * Math.sin(angle) };
    }

    /* compute position with drift — prototype pos() (drift settles in with ignition) */
    function nodePos(i: number): { x: number; y: number } {
      const p = people[i];
      const base = basePos(i);
      if (reduced || p.is_self) return base;
      const { ph, sp } = phases[i];
      const settle = clamp01(ignition(p.id).raw);
      return {
        x: base.x + Math.sin(t * 0.00045 * sp + ph) * 7 * settle,
        y: base.y + Math.cos(t * 0.00038 * sp + ph) * 7 * settle,
      };
    }

    function coreR(p: PersonRow): number {
      const form = formFromRelation(p.is_self, p.relation, p.passed_at);
      const base = form === "self" ? 7 : form === "ancient" ? 3.4 : form === "moon" ? 4.2 : 5;
      return base;
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
    function drawBody(i: number, q: { x: number; y: number }, isHovered: boolean, isActive: boolean) {
      const p     = people[i];
      const col   = p.is_self ? EL_COLOR.gold : (EL_COLOR[elementFromRelation(p.relation, p.passed_at)] ?? "#B79AD8");
      const s     = sharp(p.birth_precision);
      const R0    = coreR(p);
      const form  = formFromRelation(p.is_self, p.relation, p.passed_at);
      const ign   = ignition(p.id);
      if (ign.alpha <= 0.001) return; /* not yet kindled */
      const scale = reduced ? 1 : Math.max(0.001, ign.scale);
      const R     = R0 * scale;
      /* gentle organic twinkle (two slow summed sines — NOT the old fast blink).
         Calmed further so it doesn't compound with the background starfield
         into a busy shimmer: amplitude ~0.065 (was 0.10) and periods stretched
         to ~14–30s (was ~9–20s). Per-star phase (phases[i].ph) staggers them so
         they don't pulse in unison. */
      const tw    = reduced ? 1 : (1 + 0.04 * Math.sin(t * 0.0006 * phases[i].sp + phases[i].ph)
                                     + 0.025 * Math.sin(t * 0.00035 + phases[i].ph * 1.7));

      cx.save();
      cx.globalAlpha = reduced ? globalFade : easeOutCubic(ign.raw);

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
        /* two bodies slowly orbit their shared centre — very slow (~22s period),
           because that is what a binary star does */
        const sep = 8.5, a = reduced ? 0 : t * 0.000286;
        const ax = q.x + Math.cos(a) * sep, ay = q.y + Math.sin(a) * sep * 0.55;
        const bx = q.x - Math.cos(a) * sep, by = q.y - Math.sin(a) * sep * 0.55;
        cx.strokeStyle = hexA(col, 0.30); cx.lineWidth = 1;
        cx.beginPath(); cx.ellipse(q.x, q.y, sep, sep * 0.55, 0, 0, Math.PI * 2); cx.stroke();
        [[ax, ay, R * 0.72], [bx, by, R * 0.56]].forEach(([ox, oy, or_]) => {
          const bg = cx.createRadialGradient(ox, oy, 0, ox, oy, or_ * 2.4);
          bg.addColorStop(0, hexA(col, 0.5 * tw)); bg.addColorStop(1, hexA(col, 0));
          cx.beginPath(); cx.arc(ox, oy, or_ * 2.4, 0, Math.PI * 2); cx.fillStyle = bg; cx.fill();
          cx.beginPath(); cx.arc(ox, oy, or_, 0, Math.PI * 2); cx.fillStyle = col; cx.fill();
          cx.beginPath(); cx.arc(ox, oy, or_ * 0.42, 0, Math.PI * 2); cx.fillStyle = "rgba(255,255,255,.92)"; cx.fill();
        });
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

      /* name label */
      const lit = isHovered ? 0.96 : (0.30 + 0.5 * s);
      cx.font = (isHovered ? "500 " : "400 ") + "11px Inter, sans-serif";
      cx.fillStyle = p.is_self ? `rgba(244,236,219,${Math.max(lit, 0.9)})` : `rgba(185,174,222,${lit})`;
      cx.textAlign = "center";
      const labelY = form === "fixed" ? q.y + R0 * 3.9 + 12 : q.y + R0 * 2.9 + 12;
      cx.fillText(p.display_name, q.x, labelY);

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

    /* ── Honor-constellation stroke (Phase 3) — VISUALLY DISTINCT from synastry
       drawLink: dashed water→ancient stroke + soft wash, slower ethereal pulse.
       Synastry uses solid element-coloured gradients + warm cream pulse.
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

    /* ── hit detection ── */
    function hitTest(mx: number, my: number): PersonRow | null {
      const positions = people.map((_, i) => nodePos(i));
      for (let i = 0; i < people.length; i++) {
        const q = positions[i];
        if (Math.hypot(mx - q.x, my - q.y) < 22) return people[i];
      }
      return null;
    }

    /* ── render loop ── */
    const draw = () => {
      t = performance.now();
      if (entranceStartRef.current == null) entranceStartRef.current = t;
      elapsed = t - entranceStartRef.current;
      globalFade = reduced ? clamp01(elapsed / REDUCED_FADE) : 1;

      /* adaptive frame-budget tracking (skip warmup frames) */
      const dt = t - lastFrame; lastFrame = t;
      if (warmup > 8) {
        emaFrameMs = emaFrameMs * 0.9 + dt * 0.1;
        if (!lowPerf && emaFrameMs > 26) lowPerf = true; /* ~<38fps: shed a glow layer */
      } else { warmup++; }

      cx.clearRect(0, 0, W(), H());

      /* atmospheric finish: blit the cached deep-field wash + vignette (faint
         indigo centre → deep-ink edges: colour depth, plus a rim that draws the
         eye to the user's star at centre). Cached offscreen, so this is a cheap
         drawImage rather than a per-frame radial-gradient fill. */
      cx.drawImage(washCanvas, 0, 0, W(), H());

      const positions = people.map((_, i) => nodePos(i));
      const byId = new Map(people.map((p, i) => [p.id, positions[i]]));

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

      /* nodes */
      for (let i = 0; i < people.length; i++) {
        const q     = positions[i];
        const isHov = hoverPerson?.id === people[i].id;
        const isAct = activeTransitIds.includes(people[i].id);
        drawBody(i, q, isHov, isAct);
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
        supabase.from("people").select("id, display_name, relation, birth_precision, birth_date, is_self, is_minor, passed_at").eq("owner_id", uid).order("created_at", { ascending: true }),
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
         ("Active today") uses, so the two surfaces can never disagree. */
      const now = new Date().toISOString();
      const skies: PersonSky[] = castPeople.map(p => {
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
            <Link href="/welcome" className="pill-link pill-link--gold" style={{ padding: "8px 16px", fontSize: ".82rem", textDecoration: "none", flexShrink: 0 }}>
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
          <div style={{ position: "relative", width: "100%", minHeight: 440 }}>
            {/* full-width canvas fills container */}
            <canvas ref={canvasRef} style={{ display: "block", width: "100%", minHeight: 440 }} />

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
              { label: "Partner / binary star", color: EL_COLOR.air }, { label: "Child / moon", color: EL_COLOR.earth },
              { label: "Parent / fixed star", color: EL_COLOR.water }, { label: "Sibling / star", color: EL_COLOR.air },
              { label: "Friend / star", color: EL_COLOR.fire }, { label: "Colleague / star", color: EL_COLOR.earth },
              { label: "Ancestor / ancient light", color: "#DA8C8C" },
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
         "Add person" now lives as a prominent button in the constellation card
         header, so the only natural next step left here is opening your own
         chart. Compare/Groups/Vela/Quick Chart are one tap away in the sticky
         header. The old floating "Quick check" launcher was removed — it
         duplicated the header's Quick Chart with no distinct purpose. */}
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

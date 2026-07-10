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

import { computeSynastry, computeTransits, type NatalChart } from "@galaxia/astro";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { InitialAvatar } from "../../components/initial-avatar";
import { createSupabaseBrowserClient } from "../../lib/supabase/client";

interface PersonRow {
  id: string;
  display_name: string;
  relation: string;
  birth_precision: "exact" | "date" | "year";
  is_self: boolean;
}
interface LinkRow { fromId: string; toId: string; scoreA: number; elA: string; elB: string; }
interface ThreadChip { id: string; mode: "ask" | "shared"; preview: string; }

/* element colours from prototype ELEM / landing EL_SOLID */
const EL_COLOR: Record<string, string> = {
  fire: "#E0825C", earth: "#cdbd7a", air: "#B79AD8", water: "#6FB1B8",
  gold: "#E6AE6C" /* self */
};

/* infer element from person's stored chart data if available, else from id hash */
function elementFromRelation(rel: string): string {
  const r = rel?.toLowerCase() ?? "";
  if (r === "partner") return "air";
  if (r === "child" || r === "son" || r === "daughter") return "earth";
  if (r === "parent" || r === "mother" || r === "father" || r.includes("mom") || r.includes("dad")) return "water";
  if (r === "sibling" || r === "sister" || r === "brother") return "air";
  if (r === "ancestor" || r === "grandparent" || r.includes("grand")) return "water";
  return "fire";
}

/* node form from relation */
function formFromRelation(isSelf: boolean, rel: string): string {
  if (isSelf) return "self";
  const r = rel?.toLowerCase() ?? "";
  if (r === "partner") return "binary";
  if (r === "child" || r === "son" || r === "daughter") return "moon";
  if (r === "parent" || r === "mother" || r === "father" || r.includes("mom") || r.includes("dad")) return "fixed";
  if (r === "ancestor" || r === "grandparent" || r.includes("grand")) return "ancient";
  return "star";
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

  const [welcomeName, setWelcomeName] = useState("stargazer");
  const [people, setPeople]           = useState<PersonRow[]>([]);
  const [links, setLinks]             = useState<LinkRow[]>([]);
  const [activeTransitIds, setActiveTransitIds] = useState<string[]>([]);
  const [todayTransit, setTodayTransit]         = useState("No notable transits today.");
  const [threadChips, setThreadChips]           = useState<ThreadChip[]>([]);
  const [homeStatus, setHomeStatus]             = useState<string | null>(null);
  const [loading, setLoading]                   = useState(true);
  const [hoverPerson, setHoverPerson]           = useState<PersonRow | null>(null);

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
    let mouseX = 0, mouseY = 0;

    const resize = () => {
      const rect = canvas.parentElement!.getBoundingClientRect();
      canvas.width  = rect.width  * DPR;
      canvas.height = rect.height * DPR;
      canvas.style.width  = rect.width  + "px";
      canvas.style.height = rect.height + "px";
      cx.setTransform(DPR, 0, 0, DPR, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const W = () => canvas.width  / DPR;
    const H = () => canvas.height / DPR;

    /* per-person stable phase for drift */
    const phases = people.map((_, i) => ({ ph: i * 1.7, sp: 0.35 + (i * 0.17 % 0.4) }));

    /* compute position with drift — prototype pos() */
    function nodePos(i: number): { x: number; y: number } {
      const p = people[i];
      const selfIdx = people.findIndex(q => q.is_self);
      let baseX: number, baseY: number;
      if (p.is_self) {
        baseX = W() / 2;
        baseY = H() / 2;
      } else {
        const others = people.filter(q => !q.is_self);
        const oi = others.findIndex(q => q.id === p.id);
        const angle = (oi / Math.max(others.length, 1)) * Math.PI * 2 - Math.PI / 2;
        const r = Math.min(W(), H()) * 0.36;
        baseX = W() / 2 + r * Math.cos(angle);
        baseY = H() / 2 + r * Math.sin(angle);
      }
      if (reduced || p.is_self) return { x: baseX, y: baseY };
      const { ph, sp } = phases[i];
      return {
        x: baseX + Math.sin(t * 0.00045 * sp + ph) * 7,
        y: baseY + Math.cos(t * 0.00038 * sp + ph) * 7,
      };
    }

    function coreR(p: PersonRow): number {
      const form = formFromRelation(p.is_self, p.relation);
      const base = form === "self" ? 7 : form === "ancient" ? 3.4 : form === "moon" ? 4.2 : 5;
      return base;
    }

    /* ── draw a single celestial body (from prototype drawBody) ── */
    function drawBody(p: PersonRow, q: { x: number; y: number }, isHovered: boolean, isActive: boolean) {
      const col   = p.is_self ? EL_COLOR.gold : (EL_COLOR[elementFromRelation(p.relation)] ?? "#B79AD8");
      const s     = sharp(p.birth_precision);
      const R     = coreR(p);
      const form  = formFromRelation(p.is_self, p.relation);
      const pulse = reduced ? 1 : (0.9 + 0.1 * Math.sin(t * 0.0018 + phases[people.indexOf(p)].ph));

      /* radial glow halo — diffuse if year-precision (s=0.32) */
      const haloR = R * (s === 1 ? 5.5 : s > 0.5 ? 8 : 11) * (isHovered ? 1.3 : 1);
      const glow  = cx.createRadialGradient(q.x, q.y, 0, q.x, q.y, haloR);
      glow.addColorStop(0, hexA(col, (0.55 * s + 0.18) * pulse * (isHovered ? 1.35 : 1)));
      glow.addColorStop(0.4, hexA(col, 0.12 * s * pulse));
      glow.addColorStop(1,   hexA(col, 0));
      cx.beginPath();
      cx.arc(q.x, q.y, haloR, 0, Math.PI * 2);
      cx.fillStyle = glow;
      cx.fill();

      /* celestial form body */
      if (form === "binary") {
        const sep = 8.5, a = reduced ? 0 : t * 0.0012;
        const ax = q.x + Math.cos(a) * sep, ay = q.y + Math.sin(a) * sep * 0.55;
        const bx = q.x - Math.cos(a) * sep, by = q.y - Math.sin(a) * sep * 0.55;
        cx.strokeStyle = hexA(col, 0.30); cx.lineWidth = 1;
        cx.beginPath(); cx.ellipse(q.x, q.y, sep, sep * 0.55, 0, 0, Math.PI * 2); cx.stroke();
        [[ax, ay, R * 0.72], [bx, by, R * 0.56]].forEach(([ox, oy, or_]) => {
          cx.beginPath(); cx.arc(ox, oy, or_, 0, Math.PI * 2); cx.fillStyle = col; cx.fill();
          cx.beginPath(); cx.arc(ox, oy, or_ * 0.42, 0, Math.PI * 2); cx.fillStyle = "rgba(255,255,255,.92)"; cx.fill();
        });
      } else if (form === "moon") {
        cx.beginPath(); cx.arc(q.x, q.y, R, 0, Math.PI * 2); cx.fillStyle = hexA(col, 0.30); cx.fill();
        cx.save(); cx.beginPath(); cx.arc(q.x, q.y, R, 0, Math.PI * 2); cx.clip();
        const off = R * 0.62;
        cx.beginPath(); cx.arc(q.x - off * 0.55, q.y - off * 0.42, R * 1.02, 0, Math.PI * 2);
        cx.fillStyle = col; cx.fill(); cx.restore();
        cx.beginPath(); cx.arc(q.x, q.y, R, 0, Math.PI * 2);
        cx.strokeStyle = hexA(col, 0.5); cx.lineWidth = 0.8; cx.stroke();
      } else if (form === "fixed") {
        const fl = R * 3.1 * (isHovered ? 1.2 : 1);
        cx.strokeStyle = hexA(col, 0.42 * pulse); cx.lineWidth = 0.9;
        cx.beginPath(); cx.moveTo(q.x - fl, q.y); cx.lineTo(q.x + fl, q.y);
        cx.moveTo(q.x, q.y - fl); cx.lineTo(q.x, q.y + fl); cx.stroke();
        cx.beginPath(); cx.arc(q.x, q.y, R, 0, Math.PI * 2); cx.fillStyle = col; cx.fill();
        cx.beginPath(); cx.arc(q.x, q.y, R * 0.42, 0, Math.PI * 2); cx.fillStyle = "rgba(255,255,255,.95)"; cx.fill();
      } else if (form === "ancient") {
        const rr = R * (1 + (reduced ? 0 : 0.06 * Math.sin(t * 0.0011 + phases[people.indexOf(p)].ph)));
        cx.beginPath(); cx.arc(q.x, q.y, rr, 0, Math.PI * 2); cx.fillStyle = hexA(col, 0.62); cx.fill();
        const ringR = R * (4.4 + (reduced ? 0 : (Math.sin(t * 0.0007 + phases[people.indexOf(p)].ph) + 1) * 1.5));
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
        cx.beginPath(); cx.arc(q.x, q.y, R * (2.8 + 0.8 * Math.sin(t * 0.025 + phases[people.indexOf(p)].ph)), 0, Math.PI * 2);
        cx.strokeStyle = hexA(col, 0.25); cx.lineWidth = 1; cx.stroke();
      }

      /* name label */
      const lit = isHovered ? 0.96 : (0.30 + 0.5 * s);
      cx.font = (isHovered ? "500 " : "400 ") + "11px Inter, sans-serif";
      cx.fillStyle = p.is_self ? `rgba(244,236,219,${Math.max(lit, 0.9)})` : `rgba(185,174,222,${lit})`;
      cx.textAlign = "center";
      const labelY = form === "fixed" ? q.y + R * 3.9 + 12 : q.y + coreR(p) * 2.9 + 12;
      cx.fillText(p.display_name, q.x, labelY);
    }

    /* ── travelling pulse along a bezier link (from prototype) ── */
    function drawLink(link: LinkRow, posA: { x: number; y: number }, posB: { x: number; y: number }) {
      const { cpx, cpy } = bezierCP(posA.x, posA.y, posB.x, posB.y);
      const colA = EL_COLOR[link.elA] ?? "#B79AD8";
      const colB = EL_COLOR[link.elB] ?? "#B79AD8";

      /* gradient stroke */
      const grad = cx.createLinearGradient(posA.x, posA.y, posB.x, posB.y);
      grad.addColorStop(0,   hexA(colA, 0));
      grad.addColorStop(0.5, hexA(colA, link.scoreA >= 62 ? 0.28 : 0.16));
      grad.addColorStop(1,   hexA(colB, 0.05));
      cx.beginPath();
      cx.moveTo(posA.x, posA.y);
      cx.quadraticCurveTo(cpx, cpy, posB.x, posB.y);
      cx.strokeStyle = grad;
      cx.lineWidth   = 0.8;
      cx.stroke();

      /* travelling light pulse (from prototype) */
      if (!reduced) {
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
      cx.clearRect(0, 0, W(), H());

      const positions = people.map((_, i) => nodePos(i));
      const byId = new Map(people.map((p, i) => [p.id, positions[i]]));

      /* links first */
      for (const link of links) {
        const posA = byId.get(link.fromId);
        const posB = byId.get(link.toId);
        if (!posA || !posB) continue;
        drawLink(link, posA, posB);
      }

      /* nodes */
      for (let i = 0; i < people.length; i++) {
        const p     = people[i];
        const q     = positions[i];
        const isHov = hoverPerson?.id === p.id;
        const isAct = activeTransitIds.includes(p.id);
        drawBody(p, q, isHov, isAct);
      }

      if (!reduced) raf = requestAnimationFrame(draw);
    };

    draw();
    if (!reduced) raf = requestAnimationFrame(draw);

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
  }, [loading, people, links, activeTransitIds, hoverPerson, router]);

  /* ─── data loading ────────────────────────────────────────────── */
  async function loadHome(uid: string, email: string) {
    setLoading(true);
    try {
      const { data: idRows } = await supabase.from("people").select("id").eq("owner_id", uid);
      const personIds = (idRows ?? []).map(r => r.id as string);

      const [{ data: profile }, { data: peopleRows }, { data: chartRows }, { data: threadRows }] = await Promise.all([
        supabase.from("profiles").select("display_name").eq("id", uid).single(),
        supabase.from("people").select("id, display_name, relation, birth_precision, is_self").eq("owner_id", uid).order("created_at", { ascending: true }),
        personIds.length ? supabase.from("charts").select("person_id, data").in("person_id", personIds) : Promise.resolve({ data: [] as any[] }),
        supabase.from("threads").select("id, mode").eq("owner_id", uid).order("created_at", { ascending: false }).limit(6)
      ]);

      setWelcomeName(profile?.display_name ?? email.split("@")[0] ?? "stargazer");
      const castPeople = (peopleRows ?? []) as PersonRow[];
      setPeople(castPeople);

      const chartById = new Map<string, NatalChart>((chartRows ?? []).map(r => [r.person_id as string, r.data as NatalChart]));

      /* build links with real synastry scores + element colours */
      const calcLinks: LinkRow[] = [];
      for (let i = 0; i < castPeople.length; i++) {
        for (let j = i + 1; j < castPeople.length; j++) {
          const ca = chartById.get(castPeople[i].id);
          const cb = chartById.get(castPeople[j].id);
          const score = ca && cb ? computeSynastry(ca, cb).scores.overall : 50;
          calcLinks.push({
            fromId: castPeople[i].id, toId: castPeople[j].id, scoreA: score,
            elA: elementFromRelation(castPeople[i].relation),
            elB: elementFromRelation(castPeople[j].relation),
          });
        }
      }
      setLinks(calcLinks.sort((a, b) => b.scoreA - a.scoreA).slice(0, 14));

      /* transits */
      const transitActive: string[] = [];
      let transitSummary = "No notable transits today.";
      const now = new Date().toISOString();
      for (const p of castPeople) {
        if (p.birth_precision === "year") continue;
        const chart = chartById.get(p.id);
        if (!chart) continue;
        const hits = computeTransits(chart, now).filter(h => h.orb <= 1.5);
        if (hits.length) transitActive.push(p.id);
        if (p.is_self && hits[0]) transitSummary = `${hits[0].summary} (${hits[0].orb.toFixed(1)}° orb)`;
      }
      setActiveTransitIds(transitActive);
      setTodayTransit(transitSummary);

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
        <div style={{ padding: "20px 24px 14px", borderBottom: "1px solid rgba(255,255,255,.05)" }}>
          <p className="eyebrow" style={{ margin: 0 }}>Your constellation</p>
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

            {/* hover inspector — glass card floating over canvas */}
            {hoverPerson ? (
              <div style={{
                position: "absolute", top: 16, right: 16,
                width: 220, padding: "16px 18px", borderRadius: 16,
                background: "linear-gradient(165deg, rgba(255,255,255,.065), rgba(255,255,255,.018))",
                backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)",
                border: "1px solid rgba(230,174,108,.18)",
                boxShadow: "0 20px 50px -20px rgba(0,0,0,.8), inset 0 1px 0 rgba(255,255,255,.07)",
                pointerEvents: "none",
              }}>
                <p style={{ fontSize: ".6rem", fontWeight: 700, letterSpacing: ".2em", textTransform: "uppercase", color: "var(--gold)", marginBottom: 6 }}>
                  {formFromRelation(hoverPerson.is_self, hoverPerson.relation).replace(/-/g, " ")}
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
              { label: "Partner", color: "#B79AD8" }, { label: "Child / moon", color: "#cdbd7a" },
              { label: "Parent / fixed star", color: "#6FB1B8" }, { label: "Ancestor / ancient light", color: "#DA8C8C" },
            ].map(({ label, color }) => (
              <span key={label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: ".68rem", color: "var(--mist2)" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block", flexShrink: 0 }} />
                {label}
              </span>
            ))}
            <span style={{ marginLeft: "auto", fontSize: ".68rem", color: "var(--mist2)" }}>Hover to preview · click to open</span>
          </div>
        ) : null}
      </section>

      {/* ── Today in your sky ── */}
      {!loading ? (
        <section className="glass-card fade-in fade-in-delay-1">
          <p className="eyebrow">Today in your sky</p>
          <p className="muted">{todayTransit}</p>
          {activeTransitIds.length > 0 ? (
            <div style={{ marginTop: 8 }}>
              <p className="muted" style={{ fontSize: ".78rem", marginBottom: 6 }}>Tight transit touching — open a chart to see it applied:</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {activeTransitIds.map(id => {
                  const name = people.find(p => p.id === id)?.display_name;
                  if (!name) return null;
                  return (
                    <Link key={id} href={`/app/person/${id}?transit=1`} className="pill-link" style={{ fontSize: ".8rem" }}>
                      {name}
                    </Link>
                  );
                })}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* ── Recent Vela threads ── */}
      {!loading && threadChips.length > 0 ? (
        <section className="glass-card fade-in fade-in-delay-1">
          <p className="eyebrow">Resume a thread</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
            {threadChips.map(tc => (
              <Link key={tc.id} href={`/app/vela?threadId=${tc.id}`} className="pill-link" style={{ gap: 8 }}>
                <span style={{ color: "var(--gold-soft)", fontSize: ".65rem", textTransform: "uppercase", letterSpacing: ".08em" }}>{tc.mode}</span>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 220, fontSize: ".82rem" }}>{tc.preview}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* ── Contextual actions (global nav lives in the header — A7: no duplicate row) ──
         Only the two actions that are the natural next step from home remain:
         open your own chart, and grow the constellation. Compare/Groups/Vela are
         one tap away in the sticky header. */}
      {!loading ? (
        <div className="fade-in fade-in-delay-2">
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {selfPerson ? <Link href={`/app/person/${selfPerson.id}`} className="pill-link">My chart</Link> : null}
            <Link href="/welcome" className="pill-link">Add people</Link>
          </div>
        </div>
      ) : null}
    </main>
  );
}

"use client";

import { computeSynastry, computeTransits, type NatalChart } from "@galaxia/astro";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { InitialAvatar } from "../../components/initial-avatar";
import { avatarColorClass } from "../../lib/design";
import { createSupabaseBrowserClient } from "../../lib/supabase/client";

interface PersonRow { id: string; display_name: string; birth_precision: "exact"|"date"|"year"; is_self: boolean; }
interface LinkRow    { fromId: string; toId: string; score: number; }
interface ThreadChip { id: string; mode: "ask"|"shared"; preview: string; }

/* ── Avatar palette deterministic from name ─────────────────── */
const PALETTE: Record<string, string> = {
  "av-0": "#E6AE6C", "av-1": "#6FB1B8", "av-2": "#DA8C8C",
  "av-3": "#B79AD8", "av-4": "#E0825C", "av-5": "#cdbd7a"
};
function nodeColor(name: string, isSelf: boolean): string {
  if (isSelf) return "#E6AE6C";
  return PALETTE[avatarColorClass(name)] ?? "#6FB1B8";
}

export default function AppHomePage() {
  const supabase   = useMemo(() => createSupabaseBrowserClient(), []);
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const [welcomeName, setWelcomeName] = useState("stargazer");
  const [people, setPeople]           = useState<PersonRow[]>([]);
  const [links, setLinks]             = useState<LinkRow[]>([]);
  const [activeTransitIds, setActiveTransitIds] = useState<string[]>([]);
  const [todayTransit, setTodayTransit]         = useState("No notable transits today.");
  const [threadChips, setThreadChips]           = useState<ThreadChip[]>([]);
  const [homeStatus, setHomeStatus]             = useState<string | null>(null);
  const [loading, setLoading]                   = useState(true);
  const [hoveredId, setHoveredId]               = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await loadHome(user.id, user.email ?? "");
    };
    void load();
  }, [supabase]);

  /* ── Canvas constellation ─────────────────────────────────── */
  useEffect(() => {
    if (loading || people.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = window.devicePixelRatio || 1;
    let raf = 0;
    let t = 0;

    const resize = () => {
      const rect = canvas.parentElement!.getBoundingClientRect();
      canvas.width  = rect.width  * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width  = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const W = () => canvas.width  / dpr;
    const H = () => canvas.height / dpr;

    /* positions: radial layout, self at center */
    const selfIdx  = people.findIndex(p => p.is_self);
    const others   = people.filter(p => !p.is_self);
    const cx = W() / 2;
    const cy = H() / 2;
    const radius = Math.min(W(), H()) * 0.36;

    function positions() {
      const pos: Record<string, {x:number; y:number}> = {};
      const w = W(); const h = H();
      if (selfIdx >= 0) pos[people[selfIdx].id] = { x: w/2, y: h/2 };
      others.forEach((p, i) => {
        const angle = (i / Math.max(others.length, 1)) * Math.PI * 2 - Math.PI / 2;
        const r = Math.min(w, h) * 0.36;
        pos[p.id] = {
          x: w/2 + r * Math.cos(angle) + (reduced ? 0 : Math.sin(t * 0.0007 + i * 1.2) * 6),
          y: h/2 + r * Math.sin(angle) + (reduced ? 0 : Math.cos(t * 0.0009 + i * 0.9) * 5)
        };
      });
      return pos;
    }

    /* Bezier control point between two positions */
    function bezierCP(ax: number, ay: number, bx: number, by: number) {
      const mx = (ax + bx) / 2;
      const my = (ay + by) / 2;
      const nx = -(by - ay); const ny = bx - ax;
      const len = Math.sqrt(nx*nx+ny*ny) || 1;
      const curve = 0.18;
      return { cpx: mx + nx/len * len * curve, cpy: my + ny/len * len * curve };
    }

    const draw = () => {
      t++;
      ctx.clearRect(0, 0, W(), H());
      const pos = positions();

      /* links — bezier gradient */
      for (const link of links) {
        const a = pos[link.fromId]; const b = pos[link.toId];
        if (!a || !b) continue;
        const { cpx, cpy } = bezierCP(a.x, a.y, b.x, b.y);
        const warmColor = link.score >= 62 ? "rgba(230,174,108," : "rgba(218,140,140,";
        const alpha = reduced ? 0.22 : 0.12 + 0.1 * Math.abs(Math.sin(t * 0.008 + link.fromId.charCodeAt(0) * 0.1));

        const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
        grad.addColorStop(0,   warmColor + alpha + ")");
        grad.addColorStop(0.5, warmColor + (alpha * 1.6) + ")");
        grad.addColorStop(1,   warmColor + alpha + ")");
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.quadraticCurveTo(cpx, cpy, b.x, b.y);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }

      /* nodes */
      for (const person of people) {
        const p = pos[person.id];
        if (!p) continue;
        const color   = nodeColor(person.display_name, person.is_self);
        const r       = person.is_self ? 9 : 7;
        const hovered = hoveredId === person.id;
        const active  = activeTransitIds.includes(person.id);
        const pulse   = reduced ? 0 : Math.sin(t * 0.04 + person.id.charCodeAt(0) * 0.3) * 0.3 + 0.7;

        /* glow halo */
        const glowR = r * 5.5 * (hovered ? 1.4 : 1);
        const grd = ctx.createRadialGradient(p.x, p.y, r * 0.3, p.x, p.y, glowR);
        grd.addColorStop(0, color.replace(")", `, ${(active ? 0.35 : 0.18) * pulse})`).replace("rgb", "rgba").replace("rgba(rgba", "rgba"));
        grd.addColorStop(1, "rgba(0,0,0,0)");
        ctx.beginPath();
        ctx.arc(p.x, p.y, glowR, 0, Math.PI * 2);

        // Build proper rgba for the glow
        const hexToRgba = (hex: string, alpha: number) => {
          const r2 = parseInt(hex.slice(1,3),16);
          const g2 = parseInt(hex.slice(3,5),16);
          const b2 = parseInt(hex.slice(5,7),16);
          return `rgba(${r2},${g2},${b2},${alpha})`;
        };
        const haloGrd = ctx.createRadialGradient(p.x, p.y, r*0.3, p.x, p.y, glowR);
        haloGrd.addColorStop(0, hexToRgba(color, (active ? 0.38 : 0.22) * pulse));
        haloGrd.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = haloGrd;
        ctx.fill();

        /* core disc */
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        /* white inner highlight */
        ctx.beginPath();
        ctx.arc(p.x - r * 0.28, p.y - r * 0.28, r * 0.32, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${hovered ? 0.55 : 0.3})`;
        ctx.fill();

        /* name label */
        ctx.fillStyle = `rgba(244,236,219,${hovered ? 1 : 0.75})`;
        ctx.font = `${hovered ? "bold " : ""}11px var(--font-inter, system-ui)`;
        ctx.textAlign = "center";
        ctx.fillText(person.display_name, p.x, p.y + r + 16);
      }

      if (!reduced) raf = requestAnimationFrame(draw);
    };

    draw();
    if (!reduced) raf = requestAnimationFrame(draw);

    /* hover via pointer */
    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const px = (e.clientX - rect.left);
      const py = (e.clientY - rect.top);
      const pos2 = positions();
      let found: string | null = null;
      for (const person of people) {
        const p = pos2[person.id];
        if (!p) continue;
        const r = person.is_self ? 9 : 7;
        const dx = px - p.x; const dy = py - p.y;
        if (Math.sqrt(dx*dx+dy*dy) < r + 12) { found = person.id; break; }
      }
      setHoveredId(found);
      canvas.style.cursor = found ? "pointer" : "default";
    };
    const onClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const px = (e.clientX - rect.left);
      const py = (e.clientY - rect.top);
      const pos2 = positions();
      for (const person of people) {
        const p = pos2[person.id];
        if (!p) continue;
        const r = person.is_self ? 9 : 7;
        const dx = px - p.x; const dy = py - p.y;
        if (Math.sqrt(dx*dx+dy*dy) < r + 14) {
          window.location.href = `/app/person/${person.id}`;
          break;
        }
      }
    };
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("click", onClick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("click", onClick);
    };
  }, [loading, people, links, activeTransitIds, hoveredId]);

  async function loadHome(uid: string, email: string) {
    setLoading(true);
    try {
      const { data: idRows } = await supabase.from("people").select("id").eq("owner_id", uid);
      const personIds = (idRows ?? []).map(r => r.id as string);

      const [{ data: profile }, { data: peopleRows }, { data: chartRows }, { data: threadRows }] = await Promise.all([
        supabase.from("profiles").select("display_name").eq("id", uid).single(),
        supabase.from("people").select("id, display_name, birth_precision, is_self").eq("owner_id", uid).order("created_at", { ascending: true }),
        personIds.length ? supabase.from("charts").select("person_id, data").in("person_id", personIds) : Promise.resolve({ data: [] as any[] }),
        supabase.from("threads").select("id, mode").eq("owner_id", uid).order("created_at", { ascending: false }).limit(6)
      ]);

      setWelcomeName(profile?.display_name ?? email.split("@")[0] ?? "stargazer");
      const castPeople = (peopleRows ?? []) as PersonRow[];
      setPeople(castPeople);

      const chartById = new Map<string, NatalChart>((chartRows ?? []).map(r => [r.person_id as string, r.data as NatalChart]));
      const calcLinks: LinkRow[] = [];
      for (let i = 0; i < castPeople.length; i++) {
        for (let j = i + 1; j < castPeople.length; j++) {
          const ca = chartById.get(castPeople[i].id);
          const cb = chartById.get(castPeople[j].id);
          if (!ca || !cb) continue;
          calcLinks.push({ fromId: castPeople[i].id, toId: castPeople[j].id, score: computeSynastry(ca, cb).scores.overall });
        }
      }
      setLinks(calcLinks.sort((a, b) => b.score - a.score).slice(0, 14));

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

      const threads = (threadRows ?? []) as Array<{ id: string; mode: "ask"|"shared" }>;
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
      <div className="fade-in">
        <p className="eyebrow">Home</p>
        <h1 className="page-title">Galaxia Mea</h1>
        <p className="muted">Welcome back, {welcomeName}.</p>
      </div>

      {homeStatus ? <p className="error">{homeStatus}</p> : null}

      {/* Constellation */}
      <section className="glass-card fade-in" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "20px 24px 12px", borderBottom: "1px solid rgba(183,154,216,.1)" }}>
          <p className="eyebrow" style={{ margin: 0 }}>Your constellation</p>
        </div>
        {loading ? (
          <div style={{ padding: 24 }}>
            <div className="skeleton" style={{ width: "100%", height: 340, borderRadius: 12 }} />
          </div>
        ) : people.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center" }}>
            <p className="muted" style={{ marginBottom: 16 }}>Your constellation is empty — start by adding yourself.</p>
            <Link className="btn-primary" href="/welcome">Add yourself & your people</Link>
          </div>
        ) : (
          <div style={{ position: "relative", minHeight: 360 }}>
            <canvas ref={canvasRef} style={{ display: "block", width: "100%", minHeight: 360 }} />
          </div>
        )}
        {people.length > 0 ? (
          <div style={{ padding: "12px 24px 20px", display: "flex", gap: 8, flexWrap: "wrap", borderTop: "1px solid rgba(183,154,216,.08)" }}>
            {people.map(p => (
              <Link key={p.id} href={`/app/person/${p.id}`} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 100, border: "1px solid rgba(183,154,216,.15)", background: "rgba(255,255,255,.02)", textDecoration: "none" }}>
                <InitialAvatar name={p.display_name} size="sm" />
                <span style={{ color: "var(--cream)", fontSize: 13 }}>{p.display_name}</span>
              </Link>
            ))}
          </div>
        ) : null}
        <div style={{ padding: "0 24px 6px" }}>
          <p style={{ fontSize: 11, color: "var(--mist2)", margin: "0 0 12px" }}>
            Gold links flow · rose links catch · hover a node · click to open
          </p>
        </div>
      </section>

      {/* Today in your sky */}
      {!loading ? (
        <section className="glass-card fade-in fade-in-delay-1">
          <p className="eyebrow">Today in your sky</p>
          <p className="muted">{todayTransit}</p>
          {activeTransitIds.length > 0 ? (
            <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
              Active transit: {activeTransitIds.map(id => people.find(p => p.id === id)?.display_name).filter(Boolean).join(", ")}
            </p>
          ) : null}
        </section>
      ) : null}

      {/* Recent Vela threads */}
      {!loading && threadChips.length > 0 ? (
        <section className="glass-card fade-in fade-in-delay-1">
          <p className="eyebrow">Recent Vela threads</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
            {threadChips.map(t => (
              <Link key={t.id} href={`/app/vela?threadId=${t.id}`} className="pill-link" style={{ maxWidth: "100%", gap: 8 }}>
                <span style={{ color: "var(--gold-soft)", fontSize: 10, textTransform: "uppercase", letterSpacing: ".07em" }}>{t.mode}</span>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 220, fontSize: 13 }}>{t.preview}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* Quick nav — no duplicate, just the key shortcuts */}
      {!loading ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }} className="fade-in fade-in-delay-2">
          <Link href="/welcome" className="pill-link" style={{ fontSize: 13 }}>Add people</Link>
          {selfPerson ? <Link href={`/app/person/${selfPerson.id}`} className="pill-link" style={{ fontSize: 13 }}>My chart</Link> : null}
          <Link href="/app/compare" className="pill-link" style={{ fontSize: 13 }}>Compare</Link>
          <Link href="/app/groups"  className="pill-link" style={{ fontSize: 13 }}>Groups</Link>
          <Link href="/app/vela"    className="pill-link" style={{ fontSize: 13 }}>Vela</Link>
        </div>
      ) : null}
    </main>
  );
}

"use client";

import { computeSynastry, computeTransits, type NatalChart } from "@galaxia/astro";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { InitialAvatar } from "../../components/initial-avatar";
import { SIGN_GLYPH } from "../../lib/design";
import { createSupabaseBrowserClient } from "../../lib/supabase/client";

interface PersonRow {
  id: string;
  display_name: string;
  birth_precision: "exact" | "date" | "year";
  is_self: boolean;
}

interface LinkRow { fromId: string; toId: string; score: number; }
interface ThreadChip { id: string; mode: "ask" | "shared"; preview: string; }

export default function AppHomePage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [welcomeName, setWelcomeName] = useState("stargazer");
  const [people, setPeople] = useState<PersonRow[]>([]);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [activeTransitIds, setActiveTransitIds] = useState<string[]>([]);
  const [todayTransitSummary, setTodayTransitSummary] = useState("No notable transits today.");
  const [threadChips, setThreadChips] = useState<ThreadChip[]>([]);
  const [homeStatus, setHomeStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await loadHome(user.id, user.email ?? "");
    };
    void load();
  }, [supabase]);

  const positions = useMemo(() => {
    const radius = 130;
    const cx = 180; const cy = 180;
    return people.map((p, i) => {
      const angle = (i / Math.max(people.length, 1)) * Math.PI * 2 - Math.PI / 2;
      return { id: p.id, x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
    });
  }, [people]);

  const positionMap = useMemo(() => new Map(positions.map((p) => [p.id, p])), [positions]);

  async function loadHome(uid: string, email: string) {
    setLoading(true);
    try {
      const { data: idRows } = await supabase.from("people").select("id").eq("owner_id", uid);
      const personIds = (idRows ?? []).map((r) => r.id as string);

      const [{ data: profile }, { data: peopleRows }, { data: chartRows }, { data: threadRows }] = await Promise.all([
        supabase.from("profiles").select("display_name").eq("id", uid).single(),
        supabase.from("people").select("id, display_name, birth_precision, is_self").eq("owner_id", uid).order("created_at", { ascending: true }),
        personIds.length ? supabase.from("charts").select("person_id, data").in("person_id", personIds) : Promise.resolve({ data: [] as any[] }),
        supabase.from("threads").select("id, mode").eq("owner_id", uid).order("created_at", { ascending: false }).limit(6)
      ]);

      setWelcomeName(profile?.display_name ?? email.split("@")[0] ?? "stargazer");
      const castPeople = (peopleRows ?? []) as PersonRow[];
      setPeople(castPeople);

      const chartById = new Map<string, NatalChart>((chartRows ?? []).map((r) => [r.person_id as string, r.data as NatalChart]));
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
        const hits = computeTransits(chart, now).filter((h) => h.orb <= 1.5);
        if (hits.length) transitActive.push(p.id);
        if (p.is_self && hits[0]) {
          transitSummary = `${hits[0].summary} (${hits[0].orb.toFixed(1)}° orb)`;
        }
      }
      setActiveTransitIds(transitActive);
      setTodayTransitSummary(transitSummary);

      const threads = (threadRows ?? []) as Array<{ id: string; mode: "ask" | "shared" }>;
      if (threads.length) {
        const { data: messages } = await supabase
          .from("messages").select("thread_id, body")
          .in("thread_id", threads.map((t) => t.id))
          .order("created_at", { ascending: false });
        const prevByThread = new Map<string, string>();
        for (const r of messages ?? []) {
          const tid = r.thread_id as string;
          if (!prevByThread.has(tid)) prevByThread.set(tid, (r.body as string).slice(0, 68));
        }
        setThreadChips(threads.map((t) => ({ id: t.id, mode: t.mode, preview: prevByThread.get(t.id) ?? "Resume" })));
      }
    } catch (err) {
      setHomeStatus(err instanceof Error ? err.message : "Unable to load home.");
    } finally {
      setLoading(false);
    }
  }

  const selfPerson = people.find((p) => p.is_self);

  return (
    <main className="app-content">
      {/* ── Header ── */}
      <div>
        <p className="eyebrow">Home</p>
        <h1 className="page-title">Galaxia Mea</h1>
        <p className="muted">Welcome back, {welcomeName}.</p>
      </div>

      {homeStatus ? <p className="error">{homeStatus}</p> : null}

      {/* ── Constellation ── */}
      <section className="glass-card fade-in">
        <p className="eyebrow" style={{ marginBottom: 10 }}>Your constellation</p>
        {loading ? (
          <div>
            <div className="skeleton" style={{ width: 360, height: 360, borderRadius: 16, marginBottom: 12 }} />
            <div className="skeleton skeleton-text" style={{ width: "50%" }} />
          </div>
        ) : people.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <p className="muted">Your constellation is empty.</p>
            <Link className="pill-link pill-link--gold" href="/welcome" style={{ marginTop: 10 }}>Add yourself & your people</Link>
          </div>
        ) : (
          <>
            <svg viewBox="0 0 360 360" style={{ width: "100%", maxWidth: 360, borderRadius: 14, background: "linear-gradient(180deg,var(--ink2),var(--ink1))", border: "1px solid var(--line)", display: "block" }}>
              {/* Links */}
              {links.map((link) => {
                const from = positionMap.get(link.fromId);
                const to   = positionMap.get(link.toId);
                if (!from || !to) return null;
                return <line key={`${link.fromId}-${link.toId}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                  stroke={link.score >= 62 ? "rgba(230,174,108,.7)" : "rgba(218,140,140,.5)"} strokeWidth="1.5" />;
              })}
              {/* Nodes */}
              {positions.map((pos) => {
                const p = people.find((r) => r.id === pos.id);
                if (!p) return null;
                const active = activeTransitIds.includes(p.id);
                return (
                  <g key={p.id} style={{ cursor: "pointer" }} onClick={() => window.location.href = `/app/person/${p.id}`}>
                    <circle cx={pos.x} cy={pos.y} r={p.is_self ? 10 : 8}
                      fill={p.is_self ? "var(--gold)" : "var(--teal)"}
                      stroke="var(--cream)" strokeWidth="1.5"
                      opacity={active ? 1 : 0.85}>
                      {active && !window.matchMedia?.("(prefers-reduced-motion:reduce)").matches ? (
                        <animate attributeName="opacity" values="1;0.5;1" dur="2s" repeatCount="indefinite" />
                      ) : null}
                    </circle>
                    <text x={pos.x} y={pos.y + 22} textAnchor="middle" fill="var(--cream)" fontSize="11" opacity=".85">{p.display_name}</text>
                  </g>
                );
              })}
            </svg>
            {/* Person chips */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
              {people.map((p) => (
                <Link key={p.id} href={`/app/person/${p.id}`} className="pill-link" style={{ gap: 7, fontSize: 13 }}>
                  <InitialAvatar name={p.display_name} size="sm" />
                  {p.display_name}
                </Link>
              ))}
            </div>
          </>
        )}
      </section>

      {/* ── Today in your sky ── */}
      {!loading ? (
        <section className="glass-card fade-in fade-in-delay-1">
          <p className="eyebrow" style={{ marginBottom: 6 }}>Today in your sky</p>
          <p className="muted">{todayTransitSummary}</p>
          {activeTransitIds.length > 0 ? (
            <p className="muted" style={{ fontSize: 13 }}>
              {activeTransitIds.map((id) => people.find((p) => p.id === id)?.display_name).filter(Boolean).join(", ")} {activeTransitIds.length === 1 ? "has" : "have"} a tight transit today.
            </p>
          ) : null}
        </section>
      ) : null}

      {/* ── Vela threads ── */}
      {!loading && threadChips.length > 0 ? (
        <section className="glass-card fade-in fade-in-delay-2">
          <p className="eyebrow" style={{ marginBottom: 8 }}>Recent Vela threads</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {threadChips.map((t) => (
              <Link key={t.id} href={`/app/vela?threadId=${t.id}`} className="pill-link" style={{ maxWidth: "100%", gap: 8 }}>
                <span style={{ color: "var(--gold-soft)", fontSize: 11, textTransform: "uppercase", letterSpacing: ".05em" }}>{t.mode}</span>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 240 }}>{t.preview}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* ── Nav ── */}
      {!loading ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }} className="fade-in fade-in-delay-2">
          <Link href="/welcome" className="pill-link">Add people</Link>
          {selfPerson ? <Link href={`/app/person/${selfPerson.id}`} className="pill-link">My chart</Link> : null}
          <Link href="/app/compare" className="pill-link">Compare</Link>
          <Link href="/app/groups" className="pill-link">Groups</Link>
          <Link href="/app/vela" className="pill-link">Ask Vela</Link>
        </div>
      ) : null}
    </main>
  );
}

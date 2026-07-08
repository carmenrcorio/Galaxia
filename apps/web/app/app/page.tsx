"use client";

import { computeSynastry, computeTransits, type NatalChart } from "@galaxia/astro";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "../../lib/supabase/client";

interface PersonRow {
  id: string;
  display_name: string;
  birth_precision: "exact" | "date" | "year";
  is_self: boolean;
}

interface LinkRow {
  fromId: string;
  toId: string;
  score: number;
}

interface ThreadChip {
  id: string;
  mode: "ask" | "shared";
  preview: string;
}

export default function AppHomePage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [userId, setUserId] = useState<string | null>(null);
  const [welcomeName, setWelcomeName] = useState("stargazer");
  const [people, setPeople] = useState<PersonRow[]>([]);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [activeTransitIds, setActiveTransitIds] = useState<string[]>([]);
  const [todayTransitSummary, setTodayTransitSummary] = useState<string>("No notable transits today.");
  const [threadChips, setThreadChips] = useState<ThreadChip[]>([]);
  const [homeStatus, setHomeStatus] = useState<string | null>(null);
  const [homeLoading, setHomeLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      await loadHome(user.id, user.email ?? "");
    };
    void load();
  }, [supabase]);

  const positions = useMemo(() => {
    const radius = 140;
    const centerX = 180;
    const centerY = 180;
    return people.map((person, index) => {
      const angle = (index / Math.max(people.length, 1)) * Math.PI * 2 - Math.PI / 2;
      return {
        id: person.id,
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle)
      };
    });
  }, [people]);

  const positionMap = useMemo(() => new Map(positions.map((position) => [position.id, position])), [positions]);

  async function loadHome(uid: string, email: string) {
    setHomeLoading(true);
    try {
      const { data: idRows } = await supabase.from("people").select("id").eq("owner_id", uid);
      const personIds = (idRows ?? []).map((row) => row.id as string);
      const [{ data: profile }, { data: peopleRows }, { data: chartRows }, { data: threadRows }] = await Promise.all([
        supabase.from("profiles").select("display_name").eq("id", uid).single(),
        supabase.from("people").select("id, display_name, birth_precision, is_self").eq("owner_id", uid).order("created_at", { ascending: true }),
        personIds.length ? supabase.from("charts").select("person_id, data").in("person_id", personIds) : Promise.resolve({ data: [] as any[] }),
        supabase.from("threads").select("id, mode").eq("owner_id", uid).order("created_at", { ascending: false }).limit(8)
      ]);

      setWelcomeName(profile?.display_name ?? email.split("@")[0] ?? "stargazer");
      const castPeople = (peopleRows ?? []) as PersonRow[];
      setPeople(castPeople);

      const chartById = new Map<string, NatalChart>((chartRows ?? []).map((row) => [row.person_id as string, row.data as NatalChart]));
      const calculatedLinks: LinkRow[] = [];
      for (let i = 0; i < castPeople.length; i += 1) {
        for (let j = i + 1; j < castPeople.length; j += 1) {
          const a = castPeople[i];
          const b = castPeople[j];
          const chartA = chartById.get(a.id);
          const chartB = chartById.get(b.id);
          if (!chartA || !chartB) continue;
          const synastry = computeSynastry(chartA, chartB);
          calculatedLinks.push({ fromId: a.id, toId: b.id, score: synastry.scores.overall });
        }
      }
      setLinks(calculatedLinks.sort((a, b) => b.score - a.score).slice(0, 14));

      const transitActive: string[] = [];
      let transitSummary = "No notable transits today.";
      const now = new Date().toISOString();
      for (const person of castPeople) {
        if (person.birth_precision === "year") continue;
        const chart = chartById.get(person.id);
        if (!chart) continue;
        const hits = computeTransits(chart, now).filter((hit) => hit.orb <= 1.5);
        if (hits.length > 0) transitActive.push(person.id);
        if (person.is_self && hits[0]) {
          transitSummary = `${hits[0].summary} (${hits[0].orb.toFixed(1)}° orb).`;
        }
      }
      setActiveTransitIds(transitActive);
      setTodayTransitSummary(transitSummary);

      const threads = (threadRows ?? []) as Array<{ id: string; mode: "ask" | "shared" }>;
      if (threads.length > 0) {
        const { data: messages } = await supabase
          .from("messages")
          .select("thread_id, body")
          .in("thread_id", threads.map((thread) => thread.id))
          .order("created_at", { ascending: false });
        const previewByThread = new Map<string, string>();
        for (const row of messages ?? []) {
          const threadId = row.thread_id as string;
          if (!previewByThread.has(threadId)) previewByThread.set(threadId, (row.body as string).slice(0, 72));
        }
        setThreadChips(
          threads.map((thread) => ({
            id: thread.id,
            mode: thread.mode,
            preview: previewByThread.get(thread.id) ?? "Resume this thread"
          }))
        );
      } else {
        setThreadChips([]);
      }
    } catch (error) {
      setHomeStatus(error instanceof Error ? error.message : "Unable to load home.");
    } finally {
      setHomeLoading(false);
    }
  }

  return (
    <main className="container" style={{ padding: "30px 0 80px", display: "grid", gap: 14 }}>
      <h1 className="auth-title">Galaxia Mea</h1>
      <p className="muted">Welcome back, {welcomeName}. Here’s your constellation at a glance.</p>
      {homeStatus ? <p className="success">{homeStatus}</p> : null}

      <section className="glass-card">
        <h2 style={{ marginTop: 0 }}>Constellation</h2>
        {homeLoading ? <p className="muted">Loading constellation…</p> : null}
        {!homeLoading && people.length === 0 ? <p className="muted">No constellation yet. Add people in /welcome first.</p> : null}
        <svg viewBox="0 0 360 360" style={{ width: "100%", maxWidth: 560, border: "1px solid var(--line)", borderRadius: 14, background: "var(--ink2)" }}>
          {links.map((link) => {
            const from = positionMap.get(link.fromId);
            const to = positionMap.get(link.toId);
            if (!from || !to) return null;
            return <line key={`${link.fromId}-${link.toId}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={link.score >= 62 ? "var(--gold)" : "var(--rose)"} opacity="0.65" strokeWidth="2" />;
          })}
          {positions.map((position) => {
            const person = people.find((row) => row.id === position.id);
            if (!person) return null;
            const active = activeTransitIds.includes(person.id);
            return (
              <g key={person.id}>
                <circle cx={position.x} cy={position.y} r={10} fill={person.is_self ? "var(--gold)" : "var(--teal)"} stroke="var(--cream)" strokeWidth="1" opacity={active ? 1 : 0.85} />
                <text x={position.x} y={position.y + 24} textAnchor="middle" fill="var(--cream)" fontSize="12">
                  {person.display_name}
                </text>
              </g>
            );
          })}
        </svg>
        {people.length > 0 ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
            {people.map((person) => (
              <Link key={person.id} href={`/app/person/${person.id}`} className="pill-link">
                {person.display_name}
                {person.is_self ? " (you)" : ""}
              </Link>
            ))}
          </div>
        ) : null}
      </section>

      <section className="glass-card">
        <h2 style={{ marginTop: 0 }}>Today in your sky</h2>
        <p className="muted">{todayTransitSummary}</p>
      </section>

      <section className="glass-card">
        <h2 style={{ marginTop: 0 }}>Jump back in</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {threadChips.length === 0 ? <p className="muted">No active Vela threads yet.</p> : null}
          {threadChips.map((thread) => (
            <Link key={thread.id} href={`/app/vela?threadId=${thread.id}`} className="pill-link">
              {thread.mode.toUpperCase()} · {thread.preview}
            </Link>
          ))}
        </div>
      </section>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Link href="/welcome" className="pill-link">
          Onboarding
        </Link>
        <Link href="/app/person/self" className="pill-link">
          My profile
        </Link>
        <Link href="/app/compare" className="pill-link">
          Compare
        </Link>
        <Link href="/app/groups" className="pill-link">
          Groups
        </Link>
        <Link href="/app/vela" className="pill-link">
          Vela
        </Link>
        <Link href="/app/settings" className="pill-link">
          Settings
        </Link>
        <Link href="/account" className="pill-link">
          Account
        </Link>
      </div>
      <small className="muted">Session user: {userId ?? "loading..."}</small>
    </main>
  );
}

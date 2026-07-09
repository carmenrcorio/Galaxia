"use client";

/**
 * /app/person/[id]
 *
 * Big Three chips ported from design/reference/galaxia-landing-v2.html .chip + .chips
 * Placement list from landing .pl (glyph, name, descriptor)
 * Glyph maps from design/reference/galaxia.jsx SIGN / PLANET / ASPGLY
 * Aspects sorted by orb, tight (<2°) gold border from spec
 * Degree displayed as 16°48′ (not decimal)
 */

import { computeSynastry, type NatalChart } from "@galaxia/astro";
import { describeGenerationalArchetype } from "@galaxia/core";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { EditPersonPanel } from "../../../../components/edit-person-panel";
import { InitialAvatar } from "../../../../components/initial-avatar";
import { ASPECT_GLYPH, ASPECT_LINE, BODY_GLYPH, SIGN_GLYPH, SIGN_VIBE, signElement } from "../../../../lib/design";
import { createSupabaseBrowserClient } from "../../../../lib/supabase/client";

interface PersonRow {
  id: string; display_name: string; relation: string;
  birth_precision: "exact" | "date" | "year"; is_minor: boolean;
  birth_date?: string | null; birth_time?: string | null;
  birth_place?: string | null; birth_lat?: number | null; birth_lng?: number | null;
}
interface NoteRow { id: string; body: string; created_at: string; }

/* convert decimal degrees to °mm′ (same as spec) */
function toDMS(deg: number): string {
  const d = Math.floor(deg);
  const m = Math.round((deg - d) * 60);
  return `${d}°${String(m).padStart(2,"0")}′`;
}

/* element gradient background for glyph square — from galaxia.jsx EL_GRAD */
const EL_GRAD: Record<string, string> = {
  fire:  "linear-gradient(135deg,#F0A368,#DC6E5F)",
  earth: "linear-gradient(135deg,#D8B873,#9DAE6E)",
  air:   "linear-gradient(135deg,#D2B0E6,#9FA8E6)",
  water: "linear-gradient(135deg,#79BEC8,#7193CE)",
};

export default function PersonProfilePage() {
  const params   = useParams<{ id: string }>();
  const personId = params.id;
  const router   = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [userId, setUserId]         = useState<string | null>(null);
  const [person, setPerson]         = useState<PersonRow | null>(null);
  const [chart, setChart]           = useState<NatalChart | null>(null);
  const [notes, setNotes]           = useState<NoteRow[]>([]);
  const [noteDraft, setNoteDraft]   = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [status, setStatus]         = useState<string | null>(null);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);
      loadProfile(user.id);
    });
  }, [personId, supabase]);

  const elementBalance = useMemo(() => {
    if (!chart) return null;
    return chart.placements.reduce(
      (acc, p) => { acc[signElement(p.sign)] += 1; return acc; },
      { fire: 0, earth: 0, air: 0, water: 0 }
    );
  }, [chart]);

  /* natal aspects — sorted by orb, deduped */
  const natalAspects = useMemo(() => {
    if (!chart) return [];
    const dedupe = new Set<string>();
    return computeSynastry(chart, chart).aspects
      .filter(a => a.from !== a.to)
      .filter(a => {
        const key = [a.from, a.to].sort().join(":") + ":" + a.type;
        if (dedupe.has(key)) return false;
        dedupe.add(key); return true;
      })
      .sort((a, b) => a.orb - b.orb)
      .slice(0, 14);
  }, [chart]);

  async function loadProfile(uid: string) {
    setLoading(true);
    const actualId = personId === "self"
      ? (await supabase.from("people").select("id").eq("owner_id", uid).eq("is_self", true).order("created_at", { ascending: false }).limit(1).single()).data?.id
      : personId;
    if (!actualId) { setStatus("No self profile yet. Add yourself in onboarding first."); setLoading(false); return; }

    const [{ data: pData, error: pErr }, { data: cData, error: cErr }, { data: nData }] = await Promise.all([
      supabase.from("people").select("id, display_name, relation, birth_precision, is_minor, birth_date, birth_time, birth_place, birth_lat, birth_lng").eq("id", actualId).single(),
      supabase.from("charts").select("data").eq("person_id", actualId).single(),
      supabase.from("notes").select("id, body, created_at").eq("about_person", actualId).order("created_at", { ascending: false }).limit(20)
    ]);
    if (pErr || !pData) { setStatus(pErr?.message ?? "Unable to load person."); setLoading(false); return; }
    if (cErr || !cData) { setStatus(cErr?.message  ?? "No chart yet — save their birth data again."); setLoading(false); return; }
    setPerson(pData as PersonRow);
    setChart(cData.data as NatalChart);
    setNotes((nData ?? []) as NoteRow[]);
    setLoading(false);
  }

  async function saveNote() {
    if (!userId || !person?.id || !noteDraft.trim()) return;
    setNoteSaving(true);
    const { error } = await supabase.from("notes").insert({ owner_id: userId, about_person: person.id, body: noteDraft.trim() });
    setNoteSaving(false);
    if (error) { setStatus(error.message); return; }
    setNoteDraft(""); loadProfile(userId);
  }

  /* ── Loading skeleton ── */
  if (loading) return (
    <main className="app-content">
      <div className="skeleton skeleton-title" />
      <div className="glass-card"><div className="skeleton skeleton-text" style={{ width: "40%" }} /><div className="skeleton skeleton-text" style={{ width: "65%" }} /><div className="skeleton skeleton-text" style={{ width: "50%" }} /></div>
      <div className="glass-card">{[80,100,70,90,65,75].map((w,i) => <div key={i} className="skeleton skeleton-text" style={{ width: `${w}%` }} />)}</div>
    </main>
  );

  if (!person || !chart) return (
    <main className="app-content">
      <p className="muted">{status ?? "Profile not found."}</p>
      <Link href="/welcome" className="btn-primary">Add birth data in onboarding</Link>
    </main>
  );

  const sun    = chart.placements.find(p => p.body === "sun");
  const moon   = chart.placements.find(p => p.body === "moon");

  return (
    <main className="app-content">

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }} className="fade-in">
        <InitialAvatar name={person.display_name} size="lg" />
        <div>
          <p className="eyebrow">{person.relation} · {person.birth_precision} precision</p>
          <h1 className="page-title">{person.display_name}</h1>
          {sun && moon ? (
            <p className="muted" style={{ fontSize: ".88rem", margin: 0 }}>
              {SIGN_GLYPH[sun.sign]} {sun.sign} Sun
              {moon.sign ? ` · ${SIGN_GLYPH[moon.sign]} ${moon.sign} Moon` : ""}
              {chart.asc ? ` · ${SIGN_GLYPH[chart.asc]} ${chart.asc} Rising` : ""}
            </p>
          ) : null}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <Link href="/app/compare" className="pill-link" style={{ fontSize: ".82rem" }}>Compare</Link>
        <Link href="/app/vela"    className="pill-link" style={{ fontSize: ".82rem" }}>Ask Vela</Link>
        <EditPersonPanel person={person} userId={userId ?? ""} onSaved={() => loadProfile(userId ?? "")} onDeleted={() => router.push("/app")} />
      </div>

      {/* ── Big Three — 3-up chip row (from landing .chips + .chip) ── */}
      <section className="glass-card fade-in fade-in-delay-1">
        <p className="eyebrow" style={{ marginBottom: 12 }}>The big three</p>
        <div style={{ display: "flex", gap: 10 }}>
          {[
            { label: "Sun",    sign: sun?.sign,   key: "sun"    },
            { label: "Moon",   sign: moon?.sign,  key: "moon"   },
            { label: "Rising", sign: chart.asc,   key: "rising" }
          ].map(({ label, sign, key }) => {
            const el = sign ? signElement(sign) : null;
            return (
              <div key={key} className="sign-chip">
                {/* glyph */}
                <span className="sign-chip__glyph" style={{ color: el ? `var(--${el})` : "var(--mist2)" }}>
                  {sign ? (SIGN_GLYPH[sign] ?? "?") : "—"}
                </span>
                {/* label-caps */}
                <span className="sign-chip__label">{label}</span>
                {/* value */}
                <span className="sign-chip__value">{sign ?? (label === "Rising" ? "Exact time needed" : "—")}</span>
                {/* one-line vibe */}
                {sign ? <span className="sign-chip__vibe">{SIGN_VIBE[sign]}</span> : null}
              </div>
            );
          })}
        </div>
        {!chart.asc && person.birth_precision === "exact" ? (
          <p className="muted" style={{ fontSize: ".75rem", marginTop: 10 }}>Rising sign needs a birth city — edit this profile to add one.</p>
        ) : null}
      </section>

      {/* ── Placement list (from landing .pl — glyph / name / descriptor) ── */}
      <section className="glass-card fade-in fade-in-delay-1">
        <p className="eyebrow" style={{ marginBottom: 12 }}>Placements</p>
        {chart.placements.map(p => {
          const el   = signElement(p.sign);
          const gly  = BODY_GLYPH[p.body] ?? p.body[0].toUpperCase();
          const desc = `${p.body.charAt(0).toUpperCase() + p.body.slice(1)} in ${p.sign}`;
          const vibe = SIGN_VIBE[p.sign] ?? "";
          return (
            <div key={p.body} className="pl-row">
              {/* glyph square with element gradient background — galaxia.jsx .kd-pgly */}
              <div className="glyph-sq" style={{ background: EL_GRAD[el] ?? "var(--ink2)", color: "#1a1206" }}>
                {gly}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="pl-body">
                  {desc}
                  {p.house ? <span style={{ fontSize: ".72rem", color: "var(--gold-soft)", background: "rgba(230,174,108,.12)", borderRadius: 6, padding: "2px 7px", marginLeft: 6 }}>H{p.house}</span> : null}
                </div>
                <div className="pl-desc">{toDMS(p.degree)} · {vibe}</div>
              </div>
            </div>
          );
        })}
        {/* element balance */}
        {elementBalance ? (
          <div style={{ display: "flex", gap: 14, marginTop: 14, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,.05)", flexWrap: "wrap" }}>
            {(["fire","earth","air","water"] as const).map(el => (
              <span key={el} style={{ fontSize: ".75rem", color: `var(--${el})` }}>
                {el[0].toUpperCase() + el.slice(1)} {elementBalance[el]}
              </span>
            ))}
          </div>
        ) : null}
      </section>

      {/* ── Aspects — sorted by orb, tight gold accent ── */}
      {natalAspects.length > 0 ? (
        <section className="glass-card fade-in fade-in-delay-2">
          <p className="eyebrow" style={{ marginBottom: 4 }}>Key aspects</p>
          <p className="muted" style={{ fontSize: ".72rem", marginBottom: 12 }}>Gold border = tight (&lt; 2°) · sorted tightest first</p>
          {natalAspects.map((a, idx) => {
            const tight = a.orb < 2;
            const mid   = a.orb < 4;
            const cls   = tight ? "aspect-tight" : mid ? "aspect-mid" : "aspect-loose";
            const aspGlyph = ASPECT_GLYPH[a.type] ?? a.type[0];
            return (
              <div key={`${a.from}-${a.to}-${idx}`} className={cls} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                {/* glyphs — from galaxia.jsx .kd-aspg */}
                <span style={{ fontSize: ".9rem", color: "var(--mist2)", width: 52, textAlign: "center", letterSpacing: 2, flexShrink: 0 }}>
                  {BODY_GLYPH[a.from] ?? a.from[0]} {aspGlyph} {BODY_GLYPH[a.to] ?? a.to[0]}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: ".82rem", color: "var(--cream)", fontWeight: 600 }}>{a.from} {a.type} {a.to}</div>
                  <div style={{ fontSize: ".74rem", color: "var(--mist)", marginTop: 1 }}>{ASPECT_LINE[a.type] ?? a.type}</div>
                </div>
                <span style={{ fontSize: ".72rem", color: "var(--mist2)" }}>{toDMS(a.orb)}</span>
              </div>
            );
          })}
        </section>
      ) : null}

      {/* ── Generational layer ── */}
      <section className="glass-card fade-in fade-in-delay-2">
        <p className="eyebrow" style={{ marginBottom: 6 }}>Generational layer</p>
        <p className="muted" style={{ fontSize: ".8rem", marginBottom: 12 }}>{chart.generational.cohortLabel}</p>
        {(["Uranus","Neptune","Pluto"] as const).map(planet => {
          const data  = chart.generational[planet.toLowerCase() as "uranus"|"neptune"|"pluto"];
          const glyph = BODY_GLYPH[planet.toLowerCase()];
          const el    = signElement(data.sign);
          return (
            <div key={planet} className="pl-row">
              <div className="glyph-sq" style={{ background: EL_GRAD[el] ?? "var(--ink2)", color: "#1a1206", fontSize: ".9rem" }}>{glyph}</div>
              <div style={{ flex: 1 }}>
                <div className="pl-body">{planet} in {data.sign} {SIGN_GLYPH[data.sign]}</div>
                <div className="pl-desc">{describeGenerationalArchetype(planet, data.sign)}</div>
              </div>
            </div>
          );
        })}
      </section>

      {/* ── Private notes ── */}
      <section className="glass-card fade-in fade-in-delay-3">
        <p className="eyebrow" style={{ marginBottom: 4 }}>Private notes</p>
        <p className="muted" style={{ fontSize: ".75rem", marginBottom: 10 }}>Owner-only · never shared · never in Vela shared mode</p>
        <textarea className="field field--rect" value={noteDraft} onChange={e => setNoteDraft(e.target.value)} placeholder="Log a private moment, pattern, or thing to remember…" rows={3} style={{ marginBottom: 10 }} />
        <button className="btn-primary" onClick={saveNote} disabled={noteSaving || !noteDraft.trim()}>
          {noteSaving ? "Saving…" : "Save note"}
        </button>
        {notes.length > 0 ? (
          <div style={{ marginTop: 14, display: "grid", gap: 8 }}>
            {notes.map(note => (
              <div key={note.id} style={{ background: "rgba(10,7,23,.4)", borderRadius: 10, padding: "10px 14px", borderLeft: "2px solid rgba(230,174,108,.3)" }}>
                <p style={{ margin: "0 0 4px", color: "var(--cream)", lineHeight: 1.55, fontSize: ".88rem" }}>{note.body}</p>
                <small className="muted" style={{ fontSize: ".7rem" }}>{new Date(note.created_at).toLocaleString()}</small>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted" style={{ fontSize: ".8rem", marginTop: 8 }}>No notes yet.</p>
        )}
      </section>

      {status ? <p className="error">{status}</p> : null}
    </main>
  );
}

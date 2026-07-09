"use client";

import { computeSynastry, type NatalChart } from "@galaxia/astro";
import { describeGenerationalArchetype } from "@galaxia/core";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { EditPersonPanel } from "../../../../components/edit-person-panel";
import { InitialAvatar } from "../../../../components/initial-avatar";
import { BODY_GLYPH, SIGN_GLYPH, signElement } from "../../../../lib/design";
import { interpretBigThree, interpretPlacement } from "../../../../lib/interpretations";
import { createSupabaseBrowserClient } from "../../../../lib/supabase/client";

interface PersonRow {
  id: string; display_name: string; relation: string;
  birth_precision: "exact"|"date"|"year"; is_minor: boolean;
  birth_date?: string|null; birth_time?: string|null;
  birth_place?: string|null; birth_lat?: number|null; birth_lng?: number|null;
}
interface NoteRow { id: string; body: string; created_at: string; }

/* convert decimal degrees to °mm' */
function toDMS(deg: number): string {
  const d = Math.floor(deg);
  const m = Math.round((deg - d) * 60);
  return `${d}°${String(m).padStart(2,"0")}′`;
}

function PlacementRow({ body, sign, degree, house }: { body: string; sign: string; degree: number; house?: number }) {
  const glyph = BODY_GLYPH[body] ?? body[0].toUpperCase();
  const el    = signElement(sign);
  const interp = interpretPlacement(body, sign);
  return (
    <div className="placement-row">
      <span className={`glyph el-${el}`} title={body}>{glyph}</span>
      <span className="placement-body">{body}</span>
      <span className={`placement-sign el-${el}`}>{SIGN_GLYPH[sign]} {sign}</span>
      <span className="placement-deg">{toDMS(degree)}{house ? ` H${house}` : ""}</span>
      {interp ? <span className="placement-interp">{interp}</span> : null}
    </div>
  );
}

export default function PersonProfilePage() {
  const params   = useParams<{ id: string }>();
  const router   = useRouter();
  const personId = params.id;
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [userId, setUserId]       = useState<string|null>(null);
  const [person, setPerson]       = useState<PersonRow|null>(null);
  const [chart, setChart]         = useState<NatalChart|null>(null);
  const [notes, setNotes]         = useState<NoteRow[]>([]);
  const [noteDraft, setNoteDraft] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [status, setStatus]       = useState<string|null>(null);
  const [loading, setLoading]     = useState(true);
  const [showRawDeg, setShowRawDeg] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      await loadProfile(user.id);
    };
    void load();
  }, [personId, supabase]);

  const elementBalance = useMemo(() => {
    if (!chart) return null;
    return chart.placements.reduce((acc, p) => { acc[signElement(p.sign)] += 1; return acc; }, { fire: 0, earth: 0, air: 0, water: 0 });
  }, [chart]);

  const natalAspects = useMemo(() => {
    if (!chart) return [];
    const dedupe = new Set<string>();
    return computeSynastry(chart, chart).aspects
      .filter(a => a.from !== a.to)
      .filter(a => {
        const key = [a.from, a.to].sort().join(":") + `:${a.type}`;
        if (dedupe.has(key)) return false;
        dedupe.add(key); return true;
      })
      .sort((a, b) => a.orb - b.orb)
      .slice(0, 14);
  }, [chart]);

  async function loadProfile(uid: string) {
    setLoading(true);
    const actualPersonId = personId === "self"
      ? (await supabase.from("people").select("id").eq("owner_id", uid).eq("is_self", true).order("created_at", { ascending: false }).limit(1).single()).data?.id
      : personId;
    if (!actualPersonId) { setStatus("No self profile yet. Add yourself in onboarding first."); setLoading(false); return; }

    const [{ data: pData, error: pErr }, { data: cData, error: cErr }, { data: nData }] = await Promise.all([
      supabase.from("people").select("id, display_name, relation, birth_precision, is_minor, birth_date, birth_time, birth_place, birth_lat, birth_lng").eq("id", actualPersonId).single(),
      supabase.from("charts").select("data").eq("person_id", actualPersonId).single(),
      supabase.from("notes").select("id, body, created_at").eq("about_person", actualPersonId).order("created_at", { ascending: false }).limit(20)
    ]);
    if (pErr || !pData) { setStatus(pErr?.message ?? "Unable to load person."); setLoading(false); return; }
    if (cErr || !cData) { setStatus(cErr?.message ?? "No chart yet — try saving their birth data again."); setLoading(false); return; }
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
    setNoteDraft("");
    await loadProfile(userId);
  }

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
      <Link className="btn-primary" href="/welcome">Add birth data in onboarding</Link>
    </main>
  );

  const sun   = chart.placements.find(p => p.body === "sun");
  const moon  = chart.placements.find(p => p.body === "moon");

  return (
    <main className="app-content">

      {/* ── Header ── */}
      <div className="person-row fade-in" style={{ gap: 16, alignItems: "flex-start" }}>
        <InitialAvatar name={person.display_name} size="lg" />
        <div>
          <p className="eyebrow">{person.relation} · {person.birth_precision} precision</p>
          <h1 className="page-title">{person.display_name}</h1>
          {sun && moon ? (
            <p className="muted" style={{ margin: 0 }}>
              {SIGN_GLYPH[sun.sign]} {sun.sign} Sun
              {moon.sign ? ` · ${SIGN_GLYPH[moon.sign]} ${moon.sign} Moon` : ""}
              {chart.asc ? ` · ${SIGN_GLYPH[chart.asc]} ${chart.asc} Rising` : ""}
            </p>
          ) : null}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <Link className="pill-link" style={{ fontSize: 13 }} href="/app/compare">Compare</Link>
        <Link className="pill-link" style={{ fontSize: 13 }} href="/app/vela">Ask Vela</Link>
        <EditPersonPanel person={person} userId={userId ?? ""} onSaved={() => loadProfile(userId ?? "")} onDeleted={() => router.push("/app")} />
      </div>

      {/* ── Big Three chips ── */}
      <section className="glass-card fade-in fade-in-delay-1">
        <p className="eyebrow">The big three</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginTop: 10 }}>
          {[
            { label: "Sun",    planet: sun,    key: "sun"    },
            { label: "Moon",   planet: moon,   key: "moon"   },
            { label: "Rising", sign: chart.asc, key: "rising" }
          ].map(({ label, planet, sign: rsign, key }) => {
            const s = planet?.sign ?? rsign;
            return (
              <div key={key} className="sign-chip">
                <div className="sign-chip__glyph" style={{ color: s ? `var(--el-${signElement(s)}, var(--gold))` : "var(--mist2)" }}>
                  {s ? (SIGN_GLYPH[s] ?? "?") : "—"}
                </div>
                <div className="sign-chip__label">{label}</div>
                <div className="sign-chip__value">{s ?? (label === "Rising" ? "Unknown" : "—")}</div>
                {s ? <div style={{ fontSize: 11, color: "var(--mist2)", fontStyle: "italic" }}>{interpretBigThree(key as "sun"|"moon"|"rising", s)}</div> : null}
              </div>
            );
          })}
        </div>
        {!chart.asc && person.birth_precision === "exact" ? (
          <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>Rising sign needs a birth city — edit this profile to add one.</p>
        ) : null}
      </section>

      {/* ── Placements ── */}
      <section className="glass-card fade-in fade-in-delay-1">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <p className="eyebrow" style={{ margin: 0 }}>Placements</p>
          <button className="pill-link" style={{ fontSize: 11, padding: "3px 10px" }} onClick={() => setShowRawDeg(r => !r)}>
            {showRawDeg ? "Show degrees as °′" : "Show decimal degrees"}
          </button>
        </div>
        {chart.placements.map(p => (
          <PlacementRow key={p.body} body={p.body} sign={p.sign} degree={showRawDeg ? p.degree : p.degree} house={p.house} />
        ))}
        {elementBalance ? (
          <div style={{ display: "flex", gap: 14, marginTop: 14, paddingTop: 10, borderTop: "1px solid rgba(183,154,216,.1)" }}>
            {(["fire","earth","air","water"] as const).map(el => (
              <span key={el} className={`el-${el}`} style={{ fontSize: 12 }}>
                {el[0].toUpperCase()}{el.slice(1)} {elementBalance[el]}
              </span>
            ))}
          </div>
        ) : null}
      </section>

      {/* ── Aspects (orb-weighted) ── */}
      {natalAspects.length > 0 ? (
        <section className="glass-card fade-in fade-in-delay-2">
          <p className="eyebrow" style={{ marginBottom: 10 }}>Key aspects</p>
          <p className="muted" style={{ fontSize: 12, marginBottom: 10 }}>Gold border = tight (under 2°) · dimmed = loose (over 5°)</p>
          {natalAspects.map((a, idx) => {
            const tight = a.orb < 2; const mid = a.orb < 4;
            return (
              <div key={`${a.from}-${a.to}-${idx}`} className={tight ? "aspect-tight" : mid ? "aspect-mid" : "aspect-loose"} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid rgba(183,154,216,.06)" }}>
                <span className="glyph" style={{ width: 24, height: 24, fontSize: 12, flexShrink: 0 }}>{BODY_GLYPH[a.from] ?? a.from[0]}</span>
                <span className="muted" style={{ fontSize: 13 }}>{a.type}</span>
                <span className="glyph" style={{ width: 24, height: 24, fontSize: 12, flexShrink: 0 }}>{BODY_GLYPH[a.to] ?? a.to[0]}</span>
                <span className="muted" style={{ fontSize: 11, marginLeft: "auto" }}>{a.orb.toFixed(1)}°</span>
              </div>
            );
          })}
        </section>
      ) : null}

      {/* ── Generational ── */}
      <section className="glass-card fade-in fade-in-delay-2">
        <p className="eyebrow" style={{ marginBottom: 6 }}>Generational layer</p>
        <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>{chart.generational.cohortLabel}</p>
        {(["Uranus","Neptune","Pluto"] as const).map(planet => {
          const data = chart.generational[planet.toLowerCase() as "uranus"|"neptune"|"pluto"];
          const glyph = BODY_GLYPH[planet.toLowerCase()];
          return (
            <div key={planet} className="placement-row">
              <span className="glyph">{glyph}</span>
              <span className="placement-body">{planet}</span>
              <span className="placement-sign">{SIGN_GLYPH[data.sign]} {data.sign}</span>
              <span className="placement-interp">{describeGenerationalArchetype(planet, data.sign)}</span>
            </div>
          );
        })}
      </section>

      {/* ── Private notes ── */}
      <section className="glass-card fade-in fade-in-delay-3">
        <p className="eyebrow" style={{ marginBottom: 4 }}>Private notes</p>
        <p className="muted" style={{ fontSize: 12, marginBottom: 10 }}>Owner-only · never shared · never in Vela shared mode</p>
        <textarea className="field" value={noteDraft} onChange={e => setNoteDraft(e.target.value)} placeholder="Log a private moment, pattern, or thing to remember…" rows={3} style={{ marginBottom: 10 }} />
        <button className="btn-primary" onClick={saveNote} disabled={noteSaving || !noteDraft.trim()}>
          {noteSaving ? "Saving…" : "Save note"}
        </button>
        {notes.length > 0 ? (
          <div style={{ marginTop: 14, display: "grid", gap: 8 }}>
            {notes.map(note => (
              <div key={note.id} style={{ background: "rgba(10,7,23,.4)", borderRadius: 10, padding: "10px 14px", borderLeft: "2px solid rgba(230,174,108,.3)" }}>
                <p style={{ margin: "0 0 4px", color: "var(--cream)", lineHeight: 1.55 }}>{note.body}</p>
                <small className="muted" style={{ fontSize: 11 }}>{new Date(note.created_at).toLocaleString()}</small>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>No notes yet.</p>
        )}
      </section>

      {status ? <p className="error">{status}</p> : null}
    </main>
  );
}

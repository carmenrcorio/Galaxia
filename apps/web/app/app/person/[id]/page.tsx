"use client";

import { computeSynastry, type NatalChart } from "@galaxia/astro";
import { describeGenerationalArchetype } from "@galaxia/core";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { InitialAvatar } from "../../../../components/initial-avatar";
import { EditPersonPanel } from "../../../../components/edit-person-panel";
import { BODY_GLYPH, SIGN_GLYPH, signElement } from "../../../../lib/design";
import { interpretBigThree, interpretPlacement } from "../../../../lib/interpretations";
import { createSupabaseBrowserClient } from "../../../../lib/supabase/client";

interface PersonRow {
  id: string;
  display_name: string;
  relation: string;
  birth_precision: "exact" | "date" | "year";
  is_minor: boolean;
  birth_date?: string | null;
  birth_time?: string | null;
  birth_place?: string | null;
  birth_lat?: number | null;
  birth_lng?: number | null;
}

interface NoteRow {
  id: string;
  body: string;
  created_at: string;
}

function PlacementRow({ body, sign, degree, house }: { body: string; sign: string; degree: number; house?: number }) {
  const glyph = BODY_GLYPH[body] ?? body.charAt(0).toUpperCase();
  const signGlyph = SIGN_GLYPH[sign] ?? "";
  const el = signElement(sign);
  const interp = interpretPlacement(body, sign);
  return (
    <div className="placement-row">
      <span className="glyph" title={body}>{glyph}</span>
      <span className="placement-body">{body}</span>
      <span className={`placement-sign el-${el}`}>{signGlyph} {sign}</span>
      <span className="placement-deg">{degree.toFixed(1)}°{house ? ` · H${house}` : ""}</span>
      {interp ? <span className="placement-interp">{interp}</span> : null}
    </div>
  );
}

export default function PersonProfilePage() {
  const params = useParams<{ id: string }>();
  const personId = params.id;
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [userId, setUserId] = useState<string | null>(null);
  const [person, setPerson] = useState<PersonRow | null>(null);
  const [chart, setChart] = useState<NatalChart | null>(null);
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [noteDraft, setNoteDraft] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
    return chart.placements.reduce(
      (acc, p) => { acc[signElement(p.sign)] += 1; return acc; },
      { fire: 0, earth: 0, air: 0, water: 0 }
    );
  }, [chart]);

  const natalAspects = useMemo(() => {
    if (!chart) return [];
    const dedupe = new Set<string>();
    return computeSynastry(chart, chart).aspects
      .filter((a) => a.from !== a.to)
      .filter((a) => {
        const key = [a.from, a.to].sort().join(":") + `:${a.type}`;
        if (dedupe.has(key)) return false;
        dedupe.add(key);
        return true;
      })
      .sort((a, b) => a.orb - b.orb)
      .slice(0, 12);
  }, [chart]);

  async function loadProfile(uid: string) {
    setLoading(true);
    const actualPersonId =
      personId === "self"
        ? (await supabase.from("people").select("id").eq("owner_id", uid).eq("is_self", true).order("created_at", { ascending: false }).limit(1).single()).data?.id
        : personId;

    if (!actualPersonId) {
      setStatus("No self profile yet. Add yourself in onboarding first.");
      setLoading(false);
      return;
    }

    const [{ data: personData, error: pErr }, { data: chartData, error: cErr }, { data: noteData }] = await Promise.all([
      supabase.from("people").select("id, display_name, relation, birth_precision, is_minor, birth_date, birth_time, birth_place, birth_lat, birth_lng").eq("id", actualPersonId).single(),
      supabase.from("charts").select("data").eq("person_id", actualPersonId).single(),
      supabase.from("notes").select("id, body, created_at").eq("about_person", actualPersonId).order("created_at", { ascending: false }).limit(20)
    ]);

    if (pErr || !personData) { setStatus(pErr?.message ?? "Unable to load person."); setLoading(false); return; }
    if (cErr || !chartData)  { setStatus(cErr?.message  ?? "No chart yet — try saving their birth data again."); setLoading(false); return; }

    setPerson(personData as PersonRow);
    setChart(chartData.data as NatalChart);
    setNotes((noteData ?? []) as NoteRow[]);
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

  // ─── Loading skeleton ─────────────────────────────────────────
  if (loading) {
    return (
      <main className="app-content">
        <div className="skeleton skeleton-title" />
        <div className="glass-card">
          <div className="skeleton skeleton-text" style={{ width: "40%" }} />
          <div className="skeleton skeleton-text" style={{ width: "60%" }} />
          <div className="skeleton skeleton-text" style={{ width: "50%" }} />
        </div>
        <div className="glass-card">
          {[80, 100, 70, 90, 65].map((w, i) => (
            <div key={i} className="skeleton skeleton-text" style={{ width: `${w}%` }} />
          ))}
        </div>
      </main>
    );
  }

  // ─── Error / not found ────────────────────────────────────────
  if (!person || !chart) {
    return (
      <main className="app-content">
        <p className="muted">{status ?? "Profile not found."}</p>
        <Link className="pill-link" href="/welcome">Add birth data in onboarding</Link>
      </main>
    );
  }

  const sun   = chart.placements.find((p) => p.body === "sun");
  const moon  = chart.placements.find((p) => p.body === "moon");
  const venus = chart.placements.find((p) => p.body === "venus");
  const mars  = chart.placements.find((p) => p.body === "mars");

  return (
    <main className="app-content">
      {/* ── Header ── */}
      <div className="person-row fade-in" style={{ gap: 14, alignItems: "flex-start" }}>
        <InitialAvatar name={person.display_name} size="lg" />
        <div>
          <p className="eyebrow">{person.relation} · {person.birth_precision} precision</p>
          <h1 className="page-title">{person.display_name}</h1>
          {sun && moon ? (
            <p className="muted" style={{ margin: 0 }}>
              {SIGN_GLYPH[sun.sign]} {sun.sign} Sun · {SIGN_GLYPH[moon.sign ?? ""]} {moon.sign} Moon
              {chart.asc ? ` · ${SIGN_GLYPH[chart.asc]} ${chart.asc} Rising` : ""}
            </p>
          ) : null}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <Link className="pill-link" href="/app/compare">Compare</Link>
        <Link className="pill-link" href="/app/vela">Ask Vela</Link>
        <EditPersonPanel person={person} userId={userId ?? ""} onSaved={() => loadProfile(userId ?? "")} onDeleted={() => window.location.href = "/app"} />
      </div>

      {/* ── Big Three ── */}
      <section className="glass-card fade-in fade-in-delay-1">
        <p className="eyebrow">The big three</p>
        <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
          {[
            { label: "Sun", planet: sun, note: "Core identity · how you shine" },
            { label: "Moon", planet: moon, note: "Emotional world · how you feel" },
            { label: "Rising", sign: chart.asc, note: "First impression · how others see you" }
          ].map(({ label, planet, sign, note }) => {
            const s = planet?.sign ?? sign;
            return (
              <div key={label} className="placement-row">
                <span className="glyph" title={label}>{BODY_GLYPH[label.toLowerCase()] ?? label[0]}</span>
                <span className="placement-body">{label}</span>
                {s ? (
                  <>
                    <span className={`placement-sign el-${signElement(s)}`}>{SIGN_GLYPH[s]} {s}</span>
                    <span className="placement-interp">{interpretBigThree(label.toLowerCase() as "sun"|"moon"|"rising", s)}</span>
                  </>
                ) : (
                  <span className="placement-deg" style={{ fontStyle: "italic" }}>
                    {label === "Rising" ? "Needs exact time + location" : "—"}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Placements ── */}
      <section className="glass-card fade-in fade-in-delay-1">
        <p className="eyebrow">Placements</p>
        <div style={{ marginTop: 8 }}>
          {chart.placements.map((p) => (
            <PlacementRow key={p.body} body={p.body} sign={p.sign} degree={p.degree} house={p.house} />
          ))}
        </div>
        {elementBalance ? (
          <div style={{ display: "flex", gap: 12, marginTop: 14, flexWrap: "wrap" }}>
            {(["fire","earth","air","water"] as const).map((el) => (
              <span key={el} className={`el-${el}`} style={{ fontSize: 13 }}>
                {el.charAt(0).toUpperCase() + el.slice(1)} {elementBalance[el]}
              </span>
            ))}
          </div>
        ) : null}
      </section>

      {/* ── Aspects ── */}
      {natalAspects.length > 0 ? (
        <section className="glass-card fade-in fade-in-delay-2">
          <p className="eyebrow">Key aspects</p>
          <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
            {natalAspects.map((a, idx) => (
              <div key={`${a.from}-${a.to}-${idx}`} style={{ display: "flex", gap: 8, alignItems: "center", padding: "6px 0", borderBottom: "1px solid rgba(58,47,99,.5)" }}>
                <span className="glyph" style={{ width: 24, height: 24, fontSize: 12 }}>{BODY_GLYPH[a.from] ?? a.from[0]}</span>
                <span className="muted" style={{ fontSize: 13 }}>{a.type}</span>
                <span className="glyph" style={{ width: 24, height: 24, fontSize: 12 }}>{BODY_GLYPH[a.to] ?? a.to[0]}</span>
                <span className="muted" style={{ fontSize: 12, marginLeft: "auto" }}>{a.orb.toFixed(1)}°</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* ── Generational layer ── */}
      <section className="glass-card fade-in fade-in-delay-2">
        <p className="eyebrow">Generational layer</p>
        <p className="muted" style={{ fontSize: 13, margin: "6px 0 12px" }}>{chart.generational.cohortLabel}</p>
        {(["Uranus","Neptune","Pluto"] as const).map((planet) => {
          const data = chart.generational[planet.toLowerCase() as "uranus"|"neptune"|"pluto"];
          return (
            <div key={planet} className="placement-row">
              <span className="glyph">{BODY_GLYPH[planet.toLowerCase()]}</span>
              <span className="placement-body">{planet}</span>
              <span className="placement-sign">{SIGN_GLYPH[data.sign]} {data.sign}</span>
              <span className="placement-interp">{describeGenerationalArchetype(planet, data.sign)}</span>
            </div>
          );
        })}
      </section>

      {/* ── Private notes ── */}
      <section className="glass-card fade-in fade-in-delay-3">
        <p className="eyebrow">Private notes</p>
        <p className="muted" style={{ fontSize: 13, margin: "4px 0 10px" }}>Owner-only · never shared · never shown in Vela shared mode</p>
        <textarea
          className="field"
          value={noteDraft}
          onChange={(e) => setNoteDraft(e.target.value)}
          placeholder="Log a private moment, pattern, or thing to remember…"
          rows={3}
          style={{ marginBottom: 8 }}
        />
        <button className="pill-link pill-link--gold" onClick={saveNote} disabled={noteSaving || !noteDraft.trim()}>
          {noteSaving ? "Saving…" : "Save note"}
        </button>
        {notes.length > 0 ? (
          <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
            {notes.map((note) => (
              <div key={note.id} style={{ background: "rgba(23,17,48,.5)", borderRadius: 10, padding: "10px 12px", borderLeft: "2px solid var(--gold-soft)" }}>
                <p style={{ margin: "0 0 4px", color: "var(--cream)", lineHeight: 1.5 }}>{note.body}</p>
                <small className="muted">{new Date(note.created_at).toLocaleString()}</small>
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

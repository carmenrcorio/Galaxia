"use client";

import { computeSynastry, type NatalChart } from "@galaxia/astro";
import { describeGenerationalArchetype } from "@galaxia/core";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { elementForSign } from "../../../../lib/astro-helpers";
import { createSupabaseBrowserClient } from "../../../../lib/supabase/client";

interface PersonRow {
  id: string;
  display_name: string;
  relation: string;
  birth_precision: "exact" | "date" | "year";
}

interface NoteRow {
  id: string;
  body: string;
  created_at: string;
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
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      await loadProfile(user.id);
    };
    void load();
  }, [personId, supabase]);

  const elementBalance = useMemo(() => {
    if (!chart) return null;
    return chart.placements.reduce(
      (acc, placement) => {
        acc[elementForSign(placement.sign)] += 1;
        return acc;
      },
      { fire: 0, earth: 0, air: 0, water: 0 }
    );
  }, [chart]);

  const natalAspects = useMemo(() => {
    if (!chart) return [];
    const dedupe = new Set<string>();
    const aspects = computeSynastry(chart, chart).aspects
      .filter((aspect) => aspect.from !== aspect.to)
      .filter((aspect) => {
        const key = [aspect.from, aspect.to].sort().join(":") + `:${aspect.type}`;
        if (dedupe.has(key)) return false;
        dedupe.add(key);
        return true;
      })
      .sort((a, b) => a.orb - b.orb)
      .slice(0, 14);
    return aspects;
  }, [chart]);

  async function loadProfile(uid: string) {
    const actualPersonId =
      personId === "self"
        ? (
            await supabase.from("people").select("id").eq("owner_id", uid).eq("is_self", true).order("created_at", { ascending: false }).limit(1).single()
          ).data?.id
        : personId;

    if (!actualPersonId) {
      setStatus("No self profile found yet. Save yourself in onboarding first.");
      return;
    }

    const [{ data: personData, error: personError }, { data: chartData, error: chartError }, { data: noteData, error: noteError }] = await Promise.all([
      supabase.from("people").select("id, display_name, relation, birth_precision").eq("id", actualPersonId).single(),
      supabase.from("charts").select("data").eq("person_id", actualPersonId).single(),
      supabase.from("notes").select("id, body, created_at").eq("about_person", actualPersonId).order("created_at", { ascending: false }).limit(20)
    ]);

    if (personError || !personData) {
      setStatus(personError?.message ?? "Unable to load person.");
      return;
    }
    if (chartError || !chartData) {
      setStatus(chartError?.message ?? "Unable to load chart.");
      return;
    }
    if (noteError) setStatus(noteError.message);
    setPerson(personData as PersonRow);
    setChart(chartData.data as NatalChart);
    setNotes((noteData ?? []) as NoteRow[]);
  }

  async function saveNote() {
    if (!userId || !person?.id || !noteDraft.trim()) return;
    const { error } = await supabase.from("notes").insert({ owner_id: userId, about_person: person.id, body: noteDraft.trim() });
    if (error) {
      setStatus(error.message);
      return;
    }
    setNoteDraft("");
    await loadProfile(userId);
  }

  if (!person || !chart) {
    return (
      <main className="container" style={{ padding: "50px 0" }}>
        <p>{status ?? "Loading profile..."}</p>
        <Link className="pill-link" href="/welcome">
          Back to onboarding
        </Link>
      </main>
    );
  }

  const sun = chart.placements.find((placement) => placement.body === "sun");
  const moon = chart.placements.find((placement) => placement.body === "moon");

  return (
    <main className="container" style={{ padding: "30px 0 80px", display: "grid", gap: 12 }}>
      <h1 className="auth-title">{person.display_name}</h1>
      <p className="muted">
        {person.relation} · {person.birth_precision}
      </p>
      <Link className="pill-link" href="/app/compare">
        Compare with someone
      </Link>

      <section className="glass-card">
        <h2 style={{ marginTop: 0 }}>Big Three</h2>
        <p className="muted">Sun: {sun?.sign ?? "—"}</p>
        <p className="muted">Moon: {moon?.sign ?? "—"}</p>
        <p className="muted">Rising: {chart.asc ?? "Unavailable without exact time/location"}</p>
      </section>

      <section className="glass-card">
        <h2 style={{ marginTop: 0 }}>Elemental balance</h2>
        {elementBalance ? <p className="muted">Fire {elementBalance.fire} · Earth {elementBalance.earth} · Air {elementBalance.air} · Water {elementBalance.water}</p> : null}
      </section>

      <section className="glass-card">
        <h2 style={{ marginTop: 0 }}>Placements</h2>
        {chart.placements.map((placement) => (
          <p key={placement.body} className="muted">
            {placement.body.toUpperCase()} {placement.sign} {placement.degree.toFixed(1)}°{placement.house ? ` · House ${placement.house}` : ""}
          </p>
        ))}
      </section>

      <section className="glass-card">
        <h2 style={{ marginTop: 0 }}>Aspects</h2>
        {natalAspects.length === 0 ? <p className="muted">No major aspects found.</p> : null}
        {natalAspects.map((aspect, idx) => (
          <p key={`${aspect.from}-${aspect.to}-${aspect.type}-${idx}`} className="muted">
            {aspect.from.toUpperCase()} {aspect.type} {aspect.to.toUpperCase()} · orb {aspect.orb.toFixed(1)}°
          </p>
        ))}
      </section>

      <section className="glass-card">
        <h2 style={{ marginTop: 0 }}>Generational layer</h2>
        <p className="muted">{chart.generational.cohortLabel}</p>
        <p className="muted">
          Uranus in {chart.generational.uranus.sign}: {describeGenerationalArchetype("Uranus", chart.generational.uranus.sign)}
        </p>
        <p className="muted">
          Neptune in {chart.generational.neptune.sign}: {describeGenerationalArchetype("Neptune", chart.generational.neptune.sign)}
        </p>
        <p className="muted">
          Pluto in {chart.generational.pluto.sign}: {describeGenerationalArchetype("Pluto", chart.generational.pluto.sign)}
        </p>
      </section>

      <section className="glass-card">
        <h2 style={{ marginTop: 0 }}>Private notes</h2>
        <textarea className="field" value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} placeholder="Log a private moment..." rows={4} />
        <button className="pill-link pill-link--gold" onClick={saveNote}>
          Save private note
        </button>
        {notes.length === 0 ? <p className="muted">No notes yet. Notes are owner-only and never shared.</p> : null}
        {notes.map((note) => (
          <div key={note.id} className="glass-card" style={{ padding: 10 }}>
            <p>{note.body}</p>
            <small className="muted">{new Date(note.created_at).toLocaleString()}</small>
          </div>
        ))}
      </section>
      {status ? <p className="success">{status}</p> : null}
    </main>
  );
}

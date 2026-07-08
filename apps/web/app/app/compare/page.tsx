"use client";

import { compareGenerational, computeSynastry, type GenSignature, type NatalChart } from "@galaxia/astro";
import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "../../../lib/supabase/client";

type RelationType = "partners" | "siblings" | "friends" | "parent-child" | "ancestor";

interface PersonLite {
  id: string;
  display_name: string;
  relation: string;
  birth_date: string | null;
  birth_precision: "exact" | "date" | "year";
}

export default function ComparePage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [userId, setUserId] = useState<string | null>(null);
  const [people, setPeople] = useState<PersonLite[]>([]);
  const [personAId, setPersonAId] = useState<string | null>(null);
  const [personBId, setPersonBId] = useState<string | null>(null);
  const [relationType, setRelationType] = useState<RelationType>("partners");
  const [result, setResult] = useState<any>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");

  useEffect(() => {
    const load = async () => {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data } = await supabase.from("people").select("id, display_name, relation, birth_date, birth_precision").eq("owner_id", user.id).order("created_at", { ascending: false });
      const rows = (data ?? []) as PersonLite[];
      setPeople(rows);
      if (rows[0]) setPersonAId(rows[0].id);
      if (rows[1]) setPersonBId(rows[1].id);
    };
    void load();
  }, [supabase]);

  const selectedA = people.find((person) => person.id === personAId) ?? null;
  const selectedB = people.find((person) => person.id === personBId) ?? null;

  async function runCompare() {
    if (!selectedA || !selectedB || selectedA.id === selectedB.id) {
      setStatus("Pick two different people.");
      return;
    }
    const [{ data: chartA }, { data: chartB }] = await Promise.all([
      supabase.from("charts").select("data").eq("person_id", selectedA.id).single(),
      supabase.from("charts").select("data").eq("person_id", selectedB.id).single()
    ]);
    if (!chartA?.data || !chartB?.data) {
      setStatus("Missing chart data for one or both people.");
      return;
    }
    const natalA = chartA.data as NatalChart;
    const natalB = chartB.data as NatalChart;
    const synastry = computeSynastry(natalA, natalB);
    const generational = compareGenerational(natalA.generational as GenSignature, natalB.generational as GenSignature, estimateYearGap(selectedA, selectedB));
    setResult({ personA: selectedA, personB: selectedB, synastry, generational });
    setStatus(null);
  }

  async function saveMoment() {
    if (!userId || !result || !noteDraft.trim()) return;
    const [low, high] = [result.personA.id, result.personB.id].sort();
    const { error } = await supabase.from("notes").insert({
      owner_id: userId,
      pair_low: low,
      pair_high: high,
      body: noteDraft.trim(),
      transit_snapshot: {
        relationType,
        score: result.synastry.scores.overall,
        generational: result.generational
      }
    });
    if (error) {
      setStatus(error.message);
      return;
    }
    setNoteDraft("");
    setStatus("Private moment logged to this pair.");
  }

  return (
    <main className="container" style={{ padding: "30px 0 80px", display: "grid", gap: 12 }}>
      <h1 className="auth-title">Compare</h1>
      <p className="muted">Choose any two people to see your dynamic, the astrology underneath, and the generational call-out.</p>

      <section className="glass-card">
        <h2 style={{ marginTop: 0 }}>Relationship type</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {(["partners", "siblings", "friends", "parent-child", "ancestor"] as RelationType[]).map((type) => (
            <button key={type} className="pill-link" style={{ borderColor: relationType === type ? "var(--gold)" : "var(--line)" }} onClick={() => setRelationType(type)}>
              {type}
            </button>
          ))}
        </div>
      </section>

      <section className="glass-card">
        <h2 style={{ marginTop: 0 }}>Pick people</h2>
        <div style={{ display: "grid", gap: 8 }}>
          <select className="field" value={personAId ?? ""} onChange={(event) => setPersonAId(event.target.value)}>
            {people.map((person) => (
              <option key={`a-${person.id}`} value={person.id}>
                {person.display_name}
              </option>
            ))}
          </select>
          <select className="field" value={personBId ?? ""} onChange={(event) => setPersonBId(event.target.value)}>
            {people.map((person) => (
              <option key={`b-${person.id}`} value={person.id}>
                {person.display_name}
              </option>
            ))}
          </select>
          <button className="pill-link pill-link--gold" onClick={runCompare}>
            Run comparison
          </button>
        </div>
      </section>

      {result ? (
        <>
          <section className="glass-card">
            <h2 style={{ marginTop: 0 }}>
              {result.personA.display_name} × {result.personB.display_name}
            </h2>
            <p className="muted">
              Overall {result.synastry.scores.overall} · emotional {result.synastry.scores.emotional} · communication {result.synastry.scores.communication} · warmth {result.synastry.scores.warmth}
            </p>
          </section>
          <section className="glass-card">
            <h2 style={{ marginTop: 0 }}>Generational call-out</h2>
            <p className="muted">{result.generational.theme}</p>
          </section>
          <section className="glass-card">
            <h2 style={{ marginTop: 0 }}>The astrology underneath</h2>
            {result.synastry.aspects.slice(0, 10).map((aspect: any, idx: number) => (
              <p key={`${aspect.from}-${aspect.to}-${idx}`} className="muted">
                {aspect.from.toUpperCase()} {aspect.type} {aspect.to.toUpperCase()} · orb {aspect.orb.toFixed(1)}°
              </p>
            ))}
          </section>
          <section className="glass-card">
            <h2 style={{ marginTop: 0 }}>Log a moment (private)</h2>
            <textarea className="field" value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} rows={4} />
            <button className="pill-link pill-link--gold" onClick={saveMoment}>
              Save private moment
            </button>
          </section>
        </>
      ) : null}
      {status ? <p className="success">{status}</p> : null}
    </main>
  );
}

function estimateYearGap(a: PersonLite, b: PersonLite): number | undefined {
  if (!a.birth_date || !b.birth_date) return undefined;
  const yearA = Number(a.birth_date.slice(0, 4));
  const yearB = Number(b.birth_date.slice(0, 4));
  if (!Number.isFinite(yearA) || !Number.isFinite(yearB)) return undefined;
  return Math.abs(yearA - yearB);
}

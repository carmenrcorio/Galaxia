"use client";

import { compareGenerational, computeSynastry, type GenSignature, type NatalChart } from "@galaxia/astro";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { InitialAvatar } from "../../../components/initial-avatar";
import { COMPAT_LABELS, SIGN_GLYPH, compatWord } from "../../../lib/design";
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
  const [result, setResult] = useState<{
    personA: PersonLite;
    personB: PersonLite;
    synastry: ReturnType<typeof computeSynastry>;
    generational: ReturnType<typeof compareGenerational>;
    ancestralHeadline: string | null;
  } | null>(null);
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
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

  const selectedA = people.find((p) => p.id === personAId) ?? null;
  const selectedB = people.find((p) => p.id === personBId) ?? null;

  async function runCompare() {
    if (!selectedA || !selectedB || selectedA.id === selectedB.id) {
      setStatus("Choose two different people.");
      return;
    }
    setRunning(true);
    setStatus(null);
    const [{ data: chartA }, { data: chartB }] = await Promise.all([
      supabase.from("charts").select("data").eq("person_id", selectedA.id).single(),
      supabase.from("charts").select("data").eq("person_id", selectedB.id).single()
    ]);
    setRunning(false);
    if (!chartA?.data || !chartB?.data) { setStatus("Missing chart data for one or both people."); return; }
    const natalA = chartA.data as NatalChart;
    const natalB = chartB.data as NatalChart;
    const synastry = computeSynastry(natalA, natalB);
    const generational = compareGenerational(natalA.generational as GenSignature, natalB.generational as GenSignature, estimateYearGap(selectedA, selectedB));
    const ageGap = estimateYearGap(selectedA, selectedB) ?? 0;
    const ancestralHeadline = relationType === "ancestor" || ageGap >= 18
      ? `This connection spans different eras — the generational layer is the headline. ${generational.theme}`
      : null;
    setResult({ personA: selectedA, personB: selectedB, synastry, generational, ancestralHeadline });
  }

  async function saveMoment() {
    if (!userId || !result || !noteDraft.trim()) return;
    setSaving(true);
    const [low, high] = [result.personA.id, result.personB.id].sort();
    const { error } = await supabase.from("notes").insert({
      owner_id: userId,
      pair_low: low, pair_high: high,
      body: noteDraft.trim(),
      transit_snapshot: { relationType, score: result.synastry.scores.overall, generational: result.generational }
    });
    setSaving(false);
    if (error) { setStatus(error.message); return; }
    setNoteDraft("");
    setStatus("Private moment logged.");
  }

  return (
    <main className="app-content">
      <p className="eyebrow">Synastry</p>
      <h1 className="page-title">Compare</h1>
      <p className="muted">See where two people flow, catch, and what each needs from the other.</p>

      {/* ── Pickers + run ── */}
      <section className="glass-card">
        <p className="eyebrow" style={{ marginBottom: 10 }}>Choose people</p>
        <div style={{ display: "grid", gap: 10 }}>
          {/* Relationship type chips */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {(["partners","siblings","friends","parent-child","ancestor"] as RelationType[]).map((type) => (
              <button key={type} onClick={() => setRelationType(type)}
                className={`pill-link${relationType === type ? " pill-link--gold" : ""}`}
                style={{ fontSize: 13, padding: "7px 13px", borderColor: relationType === type ? "transparent" : "var(--line)" }}>
                {type}
              </button>
            ))}
          </div>

          {/* Person A */}
          <div>
            <p className="eyebrow" style={{ marginBottom: 4 }}>Person A</p>
            <select className="field" value={personAId ?? ""} onChange={(e) => setPersonAId(e.target.value)}>
              {people.map((p) => <option key={`a-${p.id}`} value={p.id}>{p.display_name}</option>)}
            </select>
          </div>
          {/* Person B */}
          <div>
            <p className="eyebrow" style={{ marginBottom: 4 }}>Person B</p>
            <select className="field" value={personBId ?? ""} onChange={(e) => setPersonBId(e.target.value)}>
              {people.map((p) => <option key={`b-${p.id}`} value={p.id}>{p.display_name}</option>)}
            </select>
          </div>

          <button className="pill-link pill-link--gold" onClick={runCompare} disabled={running}>
            {running ? "Running…" : "Run comparison"}
          </button>
        </div>
      </section>

      {/* ── Results ── */}
      {result ? (
        <>
          {/* Headline */}
          <section className="glass-card fade-in">
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <InitialAvatar name={result.personA.display_name} />
              <span style={{ color: "var(--mist2)" }}>×</span>
              <InitialAvatar name={result.personB.display_name} />
              <div>
                <p className="eyebrow" style={{ margin: 0 }}>Dynamic</p>
                <p style={{ margin: 0, fontFamily: "var(--font-fraunces)", fontSize: 18 }}>
                  {result.personA.display_name} &amp; {result.personB.display_name}
                </p>
              </div>
            </div>
            <p className="muted" style={{ fontStyle: "italic" }}>
              {result.synastry.scores.overall >= 70
                ? "High flow — momentum comes naturally here."
                : result.synastry.scores.overall >= 50
                ? "Balanced — ease and growth edges in equal measure."
                : "Growth-heavy — real warmth under pressure to meet."}
            </p>
          </section>

          {/* Compatibility grid */}
          <section className="glass-card fade-in fade-in-delay-1">
            <p className="eyebrow" style={{ marginBottom: 10 }}>Your dynamic</p>
            <div className="compat-grid">
              {Object.entries(result.synastry.scores).map(([key, score]) => {
                const { word, cls } = compatWord(score);
                return (
                  <div key={key} className="compat-cell">
                    <div className="compat-label">{COMPAT_LABELS[key] ?? key}</div>
                    <div className={`compat-word ${cls}`}>{word}</div>
                    <div style={{ fontSize: 11, color: "var(--mist2)", marginTop: 2 }}>{score}/100</div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Flow / friction */}
          <section className="glass-card fade-in fade-in-delay-1">
            <p className="eyebrow" style={{ marginBottom: 8 }}>Where it flows and catches</p>
            <div style={{ display: "grid", gap: 6 }}>
              {result.synastry.aspects.slice(0, 8).map((a, idx) => (
                <div key={`${a.from}-${a.to}-${idx}`} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid rgba(58,47,99,.5)" }}>
                  <span style={{ fontSize: 13, color: a.harmony >= 0 ? "var(--teal)" : "var(--rose)", minWidth: 60 }}>
                    {a.harmony >= 0 ? "↑ flows" : "↓ catches"}
                  </span>
                  <span className="muted" style={{ fontSize: 13 }}>
                    {a.from} {a.type} {a.to} · {a.orb.toFixed(1)}°
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Generational */}
          <section className="glass-card fade-in fade-in-delay-2">
            <p className="eyebrow" style={{ marginBottom: 8 }}>Generational call-out</p>
            <p className="muted">{result.generational.theme}</p>
            {result.generational.shared.length > 0 ? (
              <p className="muted" style={{ fontSize: 13 }}>
                Shared sky: {result.generational.shared.map((s) => `${SIGN_GLYPH[s.sign] ?? ""} ${s.planet} in ${s.sign}`).join(" · ")}
              </p>
            ) : null}
            {result.generational.diverged.length > 0 ? (
              <p className="muted" style={{ fontSize: 13 }}>
                Fault lines: {result.generational.diverged.map((d) => `${d.planet} ${d.signA}/${d.signB}`).join(" · ")}
              </p>
            ) : null}
            {result.ancestralHeadline ? <p style={{ color: "var(--gold-soft)", fontSize: 14, fontStyle: "italic" }}>{result.ancestralHeadline}</p> : null}
          </section>

          {/* Ask Vela */}
          <section className="glass-card fade-in fade-in-delay-2" style={{ textAlign: "center" }}>
            <p className="muted" style={{ marginBottom: 8 }}>Want to go deeper?</p>
            <Link className="pill-link pill-link--gold" href={`/app/vela?subjectPersonId=${result.personA.id}`}>Ask Vela about this dynamic</Link>
          </section>

          {/* Log moment */}
          <section className="glass-card fade-in fade-in-delay-3">
            <p className="eyebrow" style={{ marginBottom: 6 }}>Log a moment (private)</p>
            <textarea className="field" value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)}
              placeholder="Capture what happened and what you noticed…" rows={3} style={{ marginBottom: 8 }} />
            <button className="pill-link pill-link--gold" onClick={saveMoment} disabled={saving || !noteDraft.trim()}>
              {saving ? "Saving…" : "Save private moment"}
            </button>
          </section>
        </>
      ) : null}

      {status ? <p className={status.includes("error") || status.includes("Missing") ? "error" : "success"}>{status}</p> : null}
    </main>
  );
}

function estimateYearGap(a: PersonLite, b: PersonLite): number | undefined {
  if (!a.birth_date || !b.birth_date) return undefined;
  const yA = Number(a.birth_date.slice(0, 4));
  const yB = Number(b.birth_date.slice(0, 4));
  if (!Number.isFinite(yA) || !Number.isFinite(yB)) return undefined;
  return Math.abs(yA - yB);
}

"use client";

/**
 * /app/compare
 *
 * Reference: design/reference/galaxia-landing-v2.html §02 mock card
 *   — .dyn table: Effortless / Workable / Easy & warm labels, .dyn-row coloured spans
 *   — .tip block: italic body, gold "→ What [name] needs from you" lead-in
 * Reference: design/reference/galaxia.jsx sdesc() + swhy()
 *   — word thresholds: ≥76 Effortless, ≥68 Easy & warm, ≥58 Workable, ≥48 Tender, else Charged
 *   — reason copy from swhy() pattern
 * Reference: design/reference/galaxia.jsx DIM_LABEL
 */

import { compareGenerational, computeSynastry, type GenSignature, type NatalChart } from "@galaxia/astro";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { InitialAvatar } from "../../../components/initial-avatar";
import { Spinner } from "../../../components/spinner";
import { COMPAT_LABELS, SIGN_GLYPH, compatWord } from "../../../lib/design";
import { createSupabaseBrowserClient } from "../../../lib/supabase/client";

type RelationType = "partners" | "siblings" | "friends" | "parent-child" | "ancestor";

interface PersonLite {
  id: string; display_name: string; relation: string;
  birth_date: string | null; birth_precision: "exact" | "date" | "year";
  sun?: string; moon?: string; venus?: string; mars?: string;
}

/* "What X needs" copy derived from chart + relationship — mirrors landing .tip and galaxia.jsx swhy() */
function whatTheyNeed(scores: Record<string, number>, person: PersonLite, relType: RelationType): string {
  const s = scores;
  // communication is usually the most visible friction point to address
  if (s.communication < 52) {
    return `${person.display_name} needs you to slow down and say the unsaid part. They process at a different speed — follow their lead before you conclude.`;
  }
  if (s.warmth < 52) {
    return `${person.display_name} needs warmth made visible. They feel wanted in different ways than you do; name yours out loud, and ask about theirs.`;
  }
  if (s.emotional < 55) {
    return `${person.display_name} needs reassurance that the bond is safe when the conversation gets hard. Lead with the feeling, not the verdict.`;
  }
  if (s.stability < 52) {
    return `${person.display_name} needs a small, reliable thing to anchor to. Build one shared routine and hold it.`;
  }
  if (relType === "parent-child") {
    return `${person.display_name} needs you to see the plan before you correct it — they're already three steps ahead and that needs acknowledging.`;
  }
  return `${person.display_name} needs to be met in their own language first. The connection is already there; the work is translation.`;
}

export default function ComparePage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [userId, setUserId]       = useState<string | null>(null);
  const [people, setPeople]       = useState<PersonLite[]>([]);
  const [personAId, setPersonAId] = useState<string | null>(null);
  const [personBId, setPersonBId] = useState<string | null>(null);
  const [relationType, setRelationType] = useState<RelationType>("partners");
  const [result, setResult]       = useState<any>(null);
  const [running, setRunning]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [status, setStatus]       = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [showRaw, setShowRaw]     = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);
      const { data } = await supabase.from("people")
        .select("id, display_name, relation, birth_date, birth_precision")
        .eq("owner_id", user.id).order("created_at", { ascending: false });
      const rows = (data ?? []) as PersonLite[];
      setPeople(rows);
      if (rows[0]) setPersonAId(rows[0].id);
      if (rows[1]) setPersonBId(rows[1].id);
    });
  }, [supabase]);

  const selectedA = people.find(p => p.id === personAId) ?? null;
  const selectedB = people.find(p => p.id === personBId) ?? null;

  async function runCompare() {
    if (!selectedA || !selectedB || selectedA.id === selectedB.id) { setStatus("Choose two different people."); return; }
    setRunning(true); setStatus(null);
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
      ? `This connection spans different eras — the generational layer is the headline. ${generational.theme}` : null;
    setResult({ personA: selectedA, personB: selectedB, synastry, generational, ancestralHeadline });
  }

  async function saveMoment() {
    if (!userId || !result || !noteDraft.trim()) return;
    setSaving(true);
    const [low, high] = [result.personA.id, result.personB.id].sort();
    const { error } = await supabase.from("notes").insert({
      owner_id: userId, pair_low: low, pair_high: high, body: noteDraft.trim(),
      transit_snapshot: { relationType, score: result.synastry.scores.overall, generational: result.generational }
    });
    setSaving(false);
    if (error) { setStatus(error.message); return; }
    setNoteDraft(""); setStatus("Private moment logged.");
  }

  return (
    <main className="app-content">
      <p className="eyebrow">Synastry</p>
      <h1 className="page-title">Compare</h1>
      <p className="lede">See where two people flow, where they catch, and what each one needs.</p>

      {/* Pickers */}
      <section className="glass-card fade-in">
        <p className="eyebrow" style={{ marginBottom: 12 }}>Relationship type</p>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
          {(["partners","siblings","friends","parent-child","ancestor"] as RelationType[]).map(type => (
            <button key={type} onClick={() => setRelationType(type)} className="pill-link"
              style={{ fontSize: ".8rem", padding: "7px 14px", borderColor: relationType === type ? "rgba(230,174,108,.5)" : undefined, color: relationType === type ? "var(--gold)" : undefined }}>
              {type}
            </button>
          ))}
        </div>
        <div style={{ display: "grid", gap: 10 }}>
          <div>
            <p className="eyebrow" style={{ fontSize: ".62rem", marginBottom: 5 }}>Person A</p>
            <select className="field field--rect" value={personAId ?? ""} onChange={e => setPersonAId(e.target.value)}>
              {people.map(p => <option key={`a-${p.id}`} value={p.id}>{p.display_name}</option>)}
            </select>
          </div>
          <div>
            <p className="eyebrow" style={{ fontSize: ".62rem", marginBottom: 5 }}>Person B</p>
            <select className="field field--rect" value={personBId ?? ""} onChange={e => setPersonBId(e.target.value)}>
              {people.map(p => <option key={`b-${p.id}`} value={p.id}>{p.display_name}</option>)}
            </select>
          </div>
          <button className="btn-primary" onClick={runCompare} disabled={running} style={{ width: "fit-content", gap: 8 }}>
            {running && <Spinner size={13} color="#1a1206" />}
            {running ? "Running…" : "Run comparison"}
          </button>
        </div>
      </section>

      {result ? (
        <>
          {/* Headline */}
          <section className="glass-card fade-in">
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <InitialAvatar name={result.personA.display_name} />
              <span style={{ color: "var(--mist2)", fontSize: "1.1rem" }}>×</span>
              <InitialAvatar name={result.personB.display_name} />
              <div>
                <div style={{ fontFamily: "var(--serif)", fontSize: "1.05rem", color: "var(--cream)" }}>
                  {result.personA.display_name} &amp; {result.personB.display_name}
                </div>
                <div style={{ fontSize: ".74rem", color: "var(--mist2)" }}>{relationType}</div>
              </div>
            </div>
            <p className="muted" style={{ fontStyle: "italic", borderLeft: "2px solid rgba(230,174,108,.3)", paddingLeft: 12, lineHeight: 1.5 }}>
              {result.synastry.scores.overall >= 70
                ? "High flow — momentum comes naturally here."
                : result.synastry.scores.overall >= 50
                ? "Balanced — ease and growth in equal measure."
                : "Growth-heavy — real warmth under intentional care."}
            </p>
          </section>

          {/* ── Compat labels (not scores) — from landing .dyn-row + galaxia.jsx sdesc() ── */}
          <section className="glass-card fade-in fade-in-delay-1">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <p className="eyebrow" style={{ margin: 0 }}>Your dynamic</p>
              <button className="pill-link" style={{ fontSize: ".7rem", padding: "4px 12px" }} onClick={() => setShowRaw(r => !r)}>
                {showRaw ? "Hide numbers" : "Show numbers"}
              </button>
            </div>

            {/* dyn table — mirrors landing .dyn */}
            <div style={{ borderRadius: 14, background: "rgba(111,177,184,.06)", border: "1px solid rgba(111,177,184,.15)", padding: "4px 0", marginBottom: 14 }}>
              {Object.entries(result.synastry.scores).map(([key, rawScore]) => {
                const score = rawScore as number;
                const { word, cls } = compatWord(score);
                const pct = score / 100;
                return (
                  <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 16px", borderTop: key === "overall" ? "none" : "1px solid rgba(255,255,255,.04)" }}>
                    <span style={{ fontSize: ".82rem", color: "var(--mist)" }}>{COMPAT_LABELS[key] ?? key}</span>
                    <div style={{ textAlign: "right" }}>
                      <span className={`compat-word ${cls}`} style={{ fontSize: ".88rem", fontFamily: "var(--serif)" }}>{word}</span>
                      {/* thin underline bar sized to percentage (landing concept) */}
                      <div style={{ height: 2, borderRadius: 999, marginTop: 3, width: `${pct * 72}px`, background: cls === "compat-high" ? "var(--teal)" : cls === "compat-mid" ? "var(--gold-soft)" : "var(--rose)", opacity: .7 }} />
                      {showRaw ? <div style={{ fontSize: ".68rem", color: "var(--mist2)", marginTop: 2 }}>{score}/100</div> : null}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── "What [name] needs from you" — the landing's .tip block, built for the first time ── */}
            {[result.personA, result.personB].map((person: PersonLite) => (
              <div key={person.id} style={{
                marginBottom: 10, padding: "13px 15px", borderRadius: 13,
                background: "linear-gradient(165deg, rgba(255,255,255,.025), rgba(255,255,255,.008))",
                border: "1px solid rgba(183,154,216,.12)",
              }}>
                <p style={{ fontFamily: "var(--sans)", fontSize: ".7rem", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--gold)", marginBottom: 6 }}>
                  → What {person.display_name} needs from you
                </p>
                <p style={{ fontSize: ".82rem", color: "var(--mist)", lineHeight: 1.62, fontStyle: "italic", margin: 0 }}>
                  {whatTheyNeed(result.synastry.scores, person, relationType)}
                </p>
              </div>
            ))}
          </section>

          {/* Flow / catches */}
          <section className="glass-card fade-in fade-in-delay-2">
            <p className="eyebrow" style={{ marginBottom: 10 }}>Where it flows and catches</p>
            {result.synastry.aspects.slice(0, 8).map((a: any, idx: number) => {
              const tight = a.orb < 2;
              const mid   = a.orb < 4;
              const cls   = tight ? "aspect-tight" : mid ? "aspect-mid" : "aspect-loose";
              return (
                <div key={`${a.from}-${a.to}-${idx}`} className={cls} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                  <span style={{ fontSize: ".8rem", color: a.harmony >= 0 ? "var(--teal)" : "var(--rose)", minWidth: 60, flexShrink: 0 }}>
                    {a.harmony >= 0 ? "↑ flows" : "↓ catches"}
                  </span>
                  <span className="muted" style={{ fontSize: ".82rem" }}>{a.from} {a.type} {a.to}</span>
                  <span className="muted" style={{ fontSize: ".72rem", marginLeft: "auto" }}>{a.orb.toFixed(1)}°</span>
                </div>
              );
            })}
          </section>

          {/* Generational */}
          <section className="glass-card fade-in fade-in-delay-2">
            <p className="eyebrow" style={{ marginBottom: 8 }}>Generational call-out</p>
            <p className="muted" style={{ fontSize: ".88rem", lineHeight: 1.6 }}>{result.generational.theme}</p>
            {result.generational.shared.length > 0 ? (
              <p className="muted" style={{ fontSize: ".8rem", marginTop: 8 }}>
                Shared sky: {result.generational.shared.map((s: any) => `${SIGN_GLYPH[s.sign] ?? ""} ${s.planet} in ${s.sign}`).join(" · ")}
              </p>
            ) : null}
            {result.generational.diverged.length > 0 ? (
              <div className="teal-callout" style={{ marginTop: 10 }}>
                <p className="muted" style={{ fontSize: ".8rem", margin: 0 }}>
                  Fault line: {result.generational.diverged.map((d: any) => `${d.planet} — ${d.signA} vs ${d.signB}`).join(" · ")}
                </p>
              </div>
            ) : null}
            {result.ancestralHeadline ? (
              <p style={{ color: "var(--gold-soft)", fontSize: ".82rem", fontStyle: "italic", marginTop: 10 }}>{result.ancestralHeadline}</p>
            ) : null}
          </section>

          {/* Ask Vela */}
          <section className="glass-card fade-in fade-in-delay-2" style={{ textAlign: "center" }}>
            <p className="muted" style={{ marginBottom: 12, fontSize: ".88rem" }}>Want Vela to read this dynamic for you?</p>
            <Link href={`/app/vela?subjectPersonId=${result.personA.id}`} className="btn-primary">Ask Vela about this relationship</Link>
          </section>

          {/* Log moment */}
          <section className="glass-card fade-in fade-in-delay-3">
            <p className="eyebrow" style={{ marginBottom: 8 }}>Log a moment (private)</p>
            <textarea className="field field--rect" value={noteDraft} onChange={e => setNoteDraft(e.target.value)} placeholder="Capture what happened and what you noticed…" rows={3} style={{ borderRadius: 14, marginBottom: 10 }} />
            <button className="btn-primary" onClick={saveMoment} disabled={saving || !noteDraft.trim()} style={{ gap: 8 }}>
              {saving && <Spinner size={13} color="#1a1206" />}
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
  const yA = Number(a.birth_date.slice(0,4)); const yB = Number(b.birth_date.slice(0,4));
  if (!Number.isFinite(yA) || !Number.isFinite(yB)) return undefined;
  return Math.abs(yA - yB);
}

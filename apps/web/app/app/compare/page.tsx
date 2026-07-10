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
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { InitialAvatar } from "../../../components/initial-avatar";
import { Spinner } from "../../../components/spinner";
import { SIGN_VIBE } from "../../../lib/design";
import { COMPAT_LABELS, SIGN_GLYPH, compatWord } from "../../../lib/design";
import { CHART_ENGINE_VERSION } from "../../../lib/house-system";
import { orderPair } from "../../../lib/record";
import { createSupabaseBrowserClient } from "../../../lib/supabase/client";

type RelationType = "partners" | "siblings" | "friends" | "parent-child" | "ancestor";

interface PersonLite {
  id: string; display_name: string; relation: string;
  birth_date: string | null; birth_precision: "none" | "exact" | "date" | "year";
  birth_time?: string | null; birth_place?: string | null;
  birth_lat?: number | null; birth_lng?: number | null; tz_offset_min?: number | null;
  // Populated from chart data after comparison runs
  sun?: string; moon?: string; venus?: string; mars?: string;
}

/**
 * Stable fingerprint of a person's birth inputs. Two saved readings with the
 * same engine version but different fingerprints changed because the birth data
 * changed — never because the (deterministic) relationship "moved".
 */
function birthFingerprint(p: PersonLite): string {
  return [p.birth_date, p.birth_time, p.birth_place, p.birth_lat, p.birth_lng, p.tz_offset_min, p.birth_precision]
    .map(v => (v === null || v === undefined ? "" : String(v))).join("|");
}

interface SavedReading {
  id: string; createdAt: string;
  engineVersion: number; fingerprint: string;
  scores?: Record<string, number>;
}

/**
 * Chart-specific "What X needs from you" — deterministic rules over the computed synastry.
 * Derives guidance from that person's actual Moon, Venus, Mars signs and the cross-aspects
 * between the two charts that directly concern this person.
 *
 * Structure follows galaxia.jsx swhy() — different charts must produce different output.
 * Copy can be extended by dropping new entries into the maps below.
 */
function whatTheyNeed(
  scores: Record<string, number>,
  person: PersonLite,
  relType: RelationType,
  synastry: ReturnType<typeof computeSynastry> | null
): string {
  const name = person.display_name;
  const moon  = person.moon  ?? "";
  const venus = person.venus ?? "";
  const mars  = person.mars  ?? "";

  // Moon sign — primary emotional need
  const MOON_NEED: Partial<Record<string, string>> = {
    Aries:       `lead fast; ${name} needs you to match their urgency, then let them reset`,
    Taurus:      `steadiness above all — don't rush them; they need to feel the ground is solid`,
    Gemini:      `to talk it through, not just feel it — bring the conversation, not the silence`,
    Cancer:      `to feel the bond is safe before they'll open. Reassurance isn't weakness here`,
    Leo:         `to be genuinely seen and celebrated. Acknowledgement matters more than you might expect`,
    Virgo:       `to feel useful and appreciated for the practical care they give. Notice the small acts`,
    Libra:       `to be invited, not pressured — they close when judged and open when it feels fair`,
    Scorpio:     `honesty over reassurance. Soft untruths feel like betrayal; give them the real thing`,
    Sagittarius: `room to breathe and range freely. Cages, even loving ones, make them pull away`,
    Capricorn:   `to feel competent and respected, not managed. Let them do it their way first`,
    Aquarius:    `space to process as themselves before they can close the distance`,
    Pisces:      `gentleness and a feeling of being truly heard — they absorb the tone more than the words`,
  };

  // Venus sign — how they receive love
  const VENUS_NEED: Partial<Record<string, string>> = {
    Aries:       "direct pursuit — they want to feel chosen, not convenient",
    Taurus:      "tangible gestures and unhurried time together",
    Gemini:      "curiosity and conversation as a love language",
    Cancer:      "warmth made domestic — being included in ordinary life",
    Leo:         "public appreciation, not just private affection",
    Virgo:       "to have the details noticed — effort is how they give, and how they want to receive",
    Libra:       "harmony and reciprocity; they give generously but need it returned",
    Scorpio:     "depth and full presence — they'd rather have intensity than pleasantry",
    Sagittarius: "adventure shared, not just stability offered",
    Capricorn:   "reliability as a love language — showing up consistently is the whole thing",
    Aquarius:    "unconventionality respected; they need to feel free within the bond",
    Pisces:      "romance in the real sense — not grand gestures, but genuine tenderness",
  };

  // Find the tightest cross-aspect where this person is on the receiving end
  const receivingAspects = synastry?.aspects
    .filter(a => {
      // Aspects where the 'to' body belongs to this person's chart context
      // We check orb < 4 to find meaningful ones
      return a.orb < 4;
    })
    .sort((a, b) => a.orb - b.orb)
    .slice(0, 3) ?? [];

  const tightestHarmoniousAspect = receivingAspects.find(a => a.harmony > 0.5);
  const tightestFrictionAspect   = receivingAspects.find(a => a.harmony < -0.5);

  // Build the callout from chart data
  const parts: string[] = [];

  // Lead with Moon (emotional register)
  const moonLine = moon ? MOON_NEED[moon] : null;
  if (moonLine) {
    parts.push(`${name}'s ${moon} Moon means they need ${moonLine}.`);
  } else if (scores.emotional < 52) {
    parts.push(`${name} needs reassurance that the bond holds when the conversation gets hard — lead with the feeling, not the verdict.`);
  }

  // Add Venus if different character from Moon
  const venusLine = venus && venus !== moon ? VENUS_NEED[venus] : null;
  if (venusLine && scores.warmth < 62) {
    parts.push(`With ${venus} Venus, they feel loved through ${venusLine}.`);
  }

  // Tightest friction aspect — actionable
  if (tightestFrictionAspect && scores.communication < 60) {
    const bodyA = tightestFrictionAspect.from, bodyB = tightestFrictionAspect.to;
    parts.push(`The tightest friction runs through a ${bodyA}–${bodyB} ${tightestFrictionAspect.type} (${tightestFrictionAspect.orb.toFixed(1)}°) — name the pattern before you're inside it, and it loses its grip.`);
  }

  // Relationship-type colour
  if (relType === "parent-child") {
    parts.push(`As a parent or child dynamic: see the plan before you correct it. They need autonomy with backup, not direction.`);
  } else if (relType === "partners" && scores.overall >= 70) {
    parts.push(`The overall flow is strong — the real work is making sure you both say the tender thing out loud while it's easy.`);
  }

  // Fallback if we couldn't build from chart data
  if (parts.length === 0) {
    const vibe = moon ? SIGN_VIBE[moon] : null;
    if (vibe) {
      parts.push(`${name}'s ${moon} Moon — ${vibe} — is the register they speak first. Meet them there.`);
    } else {
      parts.push(`${name} needs to be met in their own language before the connection can deepen.`);
    }
  }

  return parts.join(" ");
}

export default function ComparePage() {
  // useSearchParams requires a Suspense boundary for this route.
  return (
    <Suspense fallback={<main className="app-content"><div className="skeleton skeleton-title" /></main>}>
      <ComparePageInner />
    </Suspense>
  );
}

function ComparePageInner() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const searchParams = useSearchParams();
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
  const [savedReadings, setSavedReadings] = useState<SavedReading[]>([]);
  const [savingReading, setSavingReading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);
      const { data } = await supabase.from("people")
        .select("id, display_name, relation, birth_date, birth_precision, birth_time, birth_place, birth_lat, birth_lng, tz_offset_min")
        .eq("owner_id", user.id).order("created_at", { ascending: false });
      const rows = (data ?? []) as PersonLite[];
      setPeople(rows);
      // BUG B: pre-fill Person A from ?a=<personId> when navigating in from a profile.
      const preA = searchParams.get("a");
      const aId = preA && rows.some(r => r.id === preA) ? preA : rows[0]?.id ?? null;
      if (aId) setPersonAId(aId);
      const bRow = rows.find(r => r.id !== aId);
      if (bRow) setPersonBId(bRow.id);
    });
  }, [supabase, searchParams]);

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
    // Year-only charts have sampled (mid-year) planet positions, so aspect
    // orbs and synastry scores computed from them would be fabricated. The
    // generational layer is the honest comparison for year-only data.
    if (natalA.precision === "year" || natalB.precision === "year") {
      const generationalOnly = compareGenerational(natalA.generational as GenSignature, natalB.generational as GenSignature, estimateYearGap(selectedA, selectedB));
      setResult(null);
      setStatus(
        `${natalA.precision === "year" ? selectedA.display_name : selectedB.display_name} has year-only birth data, so a full synastry read isn't possible — the planet-to-planet aspects would be guesses. ` +
        `What the generational layer shows: ${generationalOnly.theme} Add a birth date to unlock the full comparison.`
      );
      return;
    }
    const synastry     = computeSynastry(natalA, natalB);
    const generational = compareGenerational(natalA.generational as GenSignature, natalB.generational as GenSignature, estimateYearGap(selectedA, selectedB));
    const ageGap = estimateYearGap(selectedA, selectedB) ?? 0;
    const ancestralHeadline = relationType === "ancestor" || ageGap >= 18
      ? `This connection spans different eras — the generational layer is the headline. ${generational.theme}` : null;

    // Enrich PersonLite with chart placements for chart-specific guidance.
    // A sign the engine flagged as uncertain is not used for guidance copy.
    const getSign = (natal: NatalChart, body: string) => {
      const p = natal.placements.find(pl => pl.body === body);
      return p && p.confident !== false ? p.sign : undefined;
    };
    const personAWithChart: PersonLite = {
      ...selectedA,
      sun: getSign(natalA, "sun"), moon: getSign(natalA, "moon"),
      venus: getSign(natalA, "venus"), mars: getSign(natalA, "mars")
    };
    const personBWithChart: PersonLite = {
      ...selectedB,
      sun: getSign(natalB, "sun"), moon: getSign(natalB, "moon"),
      venus: getSign(natalB, "venus"), mars: getSign(natalB, "mars")
    };

    setResult({ personA: personAWithChart, personB: personBWithChart, synastry, generational, ancestralHeadline });

    // Load prior saved readings for this pair (immutable, dated snapshots).
    const { pairLow, pairHigh } = orderPair(selectedA.id, selectedB.id);
    const { data: priorRows } = await supabase.from("notes")
      .select("id, created_at, payload").eq("owner_id", userId!)
      .eq("kind", "compare_reading").eq("pair_low", pairLow).eq("pair_high", pairHigh)
      .order("created_at", { ascending: false }).limit(5);
    setSavedReadings((priorRows ?? []).map(r => {
      const pl = (r.payload ?? {}) as { engineVersion?: number; birthFingerprint?: string; scores?: Record<string, number> };
      return { id: r.id as string, createdAt: r.created_at as string, engineVersion: pl.engineVersion ?? 1, fingerprint: pl.birthFingerprint ?? "", scores: pl.scores };
    }));
  }

  async function saveReading() {
    if (!userId || !result) return;
    setSavingReading(true);
    const a: PersonLite = result.personA, b: PersonLite = result.personB;
    const { pairLow, pairHigh } = orderPair(a.id, b.id);
    const fingerprint = `${birthFingerprint(a)}//${birthFingerprint(b)}`;
    const payload = {
      relationType, scores: result.synastry.scores,
      topAspects: result.synastry.aspects.slice(0, 8),
      generational: result.generational,
      engineVersion: CHART_ENGINE_VERSION, birthFingerprint: fingerprint
    };
    const body = `Compared as ${relationType} — overall ${result.synastry.scores.overall}. A dated snapshot of this reading.`;
    const { error } = await supabase.from("notes").insert({
      owner_id: userId, pair_low: pairLow, pair_high: pairHigh, kind: "compare_reading", body, payload
    });
    setSavingReading(false);
    if (error) { setStatus(error.message); return; }
    setStatus("Reading saved to both people's records.");
    await runCompare();
  }

  // Attribution: a prior reading with the same engine but a different birth
  // fingerprint means the inputs changed — never a relationship "trend".
  const currentFingerprint = result ? `${birthFingerprint(result.personA)}//${birthFingerprint(result.personB)}` : "";
  const changedReading = savedReadings.find(r => r.fingerprint && r.fingerprint !== currentFingerprint);
  const engineChangedReading = savedReadings.find(r => r.fingerprint === currentFingerprint && r.engineVersion !== CHART_ENGINE_VERSION);

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
                  {whatTheyNeed(result.synastry.scores, person, relationType, result.synastry)}
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

          {/* Ask Vela — carry the full pair context so Vela opens on Focus=pair */}
          <section className="glass-card fade-in fade-in-delay-2" style={{ textAlign: "center" }}>
            <p className="muted" style={{ marginBottom: 12, fontSize: ".88rem" }}>Want Vela to read this dynamic for you?</p>
            <Link
              href={`/app/vela?scope=pair&subject=${result.personA.id}&pair=${result.personB.id}&relType=${encodeURIComponent(relationType)}`}
              className="btn-primary"
            >
              Ask Vela about {result.personA.display_name} &amp; {result.personB.display_name}
            </Link>
          </section>

          {/* Save this reading — an immutable, dated snapshot (never a trend) */}
          <section className="glass-card fade-in fade-in-delay-2">
            <p className="eyebrow" style={{ marginBottom: 8 }}>Save this reading</p>
            <p className="muted" style={{ fontSize: ".8rem", marginBottom: 10 }}>
              A comparison between two birth charts is the same every time — so a saved reading is a dated record, not a trend.
              It lives on both {result.personA.display_name}'s and {result.personB.display_name}'s pages.
            </p>
            <button className="btn-primary" onClick={saveReading} disabled={savingReading} style={{ gap: 8 }}>
              {savingReading && <Spinner size={13} color="#1a1206" />}
              {savingReading ? "Saving…" : "Save this reading"}
            </button>

            {changedReading ? (
              <p className="muted" style={{ fontSize: ".78rem", marginTop: 12, borderLeft: "2px solid rgba(230,174,108,.4)", paddingLeft: 10 }}>
                A reading saved on {new Date(changedReading.createdAt).toLocaleDateString()} differs from this one because the birth data changed since — not because the relationship did. The chart math is identical for identical inputs.
              </p>
            ) : engineChangedReading ? (
              <p className="muted" style={{ fontSize: ".78rem", marginTop: 12, borderLeft: "2px solid rgba(230,174,108,.4)", paddingLeft: 10 }}>
                A reading saved on {new Date(engineChangedReading.createdAt).toLocaleDateString()} differs because the astrology engine was updated since — the birth data is unchanged.
              </p>
            ) : null}

            {savedReadings.length > 0 ? (
              <div style={{ marginTop: 12, display: "grid", gap: 6 }}>
                <p className="muted" style={{ fontSize: ".72rem" }}>Saved readings for this pair:</p>
                {savedReadings.map(r => (
                  <div key={r.id} style={{ fontSize: ".78rem", color: "var(--mist)" }}>
                    Read on {new Date(r.createdAt).toLocaleDateString()}{r.scores ? ` · overall ${r.scores.overall}` : ""}
                  </div>
                ))}
              </div>
            ) : null}
          </section>

          {/* Log moment */}
          <section className="glass-card fade-in fade-in-delay-3">
            <p className="eyebrow" style={{ marginBottom: 8 }}>Log a moment (private)</p>
            <p className="muted" style={{ fontSize: ".78rem", marginBottom: 10 }}>Saved to this pair's shared record — visible on both their pages.</p>
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

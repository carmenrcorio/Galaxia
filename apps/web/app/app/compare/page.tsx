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

import {
  compareGenerational,
  computeSynastry,
  type GenSignature,
  type NatalChart,
  availableCompareRelationTypes,
  COMPARE_RELATION_SUGGESTION_HINT,
  defaultCompareRelationType,
  isRomanticRelation,
  suggestCompareRelationType,
  narrateHouseOverlay,
  pairChartFingerprint,
  relationElementSignal,
  relationHasHouseLens,
  relationHouseHint,
  relationHouseOverlays,
  whatTheyNeed,
  type RelationType,
} from "@galaxia/astro";
import { isMinorForSafety, orderPair } from "@galaxia/core";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { ChartWheel, COMPARE_WHEEL_NEEDS_HOUSES, orientSynastryWheel } from "../../../components/chart-wheel";
import { FlowsAndCatchesSection } from "../../../components/flows-and-catches-section";
import { InitialAvatar } from "../../../components/initial-avatar";
import { ShareLinkButton } from "../../../components/share-link-button";
import { Spinner } from "../../../components/spinner";
import { COMPAT_LABELS, SIGN_GLYPH, compatWord } from "../../../lib/design";
import { createSupabaseBrowserClient } from "../../../lib/supabase/client";

interface PersonLite {
  id: string; display_name: string; relation: string;
  birth_date: string | null; birth_precision: "none" | "exact" | "date" | "year";
  is_minor?: boolean;
  /** Remembrance marker — does NOT exclude from Compare. Chart/birth fields untouched. */
  passed_at?: string | null;
  birth_time?: string | null; birth_place?: string | null;
  birth_lat?: number | null; birth_lng?: number | null; tz_offset_min?: number | null;
  // Populated from chart data after comparison runs
  sun?: string; moon?: string; venus?: string; mars?: string; mercury?: string; saturn?: string;
}

/**
 * Single source of truth for minor status on /app/compare (ENGINEERING.md §9).
 * NEVER read person.is_minor directly — the manual checkbox was found unset on
 * a real child in production, so the age-aware isMinorForSafety backstop must
 * run here too. Compare's only outward-facing path is the Ask-Vela handoff;
 * a minor in the comparison forces it into private coaching mode below.
 */
function minorOf(p: PersonLite | null): boolean {
  return Boolean(p) && isMinorForSafety({ isMinor: p!.is_minor ?? false, birthDate: p!.birth_date, birthPrecision: p!.birth_precision });
}

/**
 * Stable fingerprint of a person's birth *inputs* (people row fields).
 * Distinguishes a user edit from a silent chart rewrite. Comparability of
 * scores also requires chartFingerprint (placement longitudes).
 */
function birthFingerprint(p: PersonLite): string {
  return [p.birth_date, p.birth_time, p.birth_place, p.birth_lat, p.birth_lng, p.tz_offset_min, p.birth_precision]
    .map(v => (v === null || v === undefined ? "" : String(v))).join("|");
}

type ReadingComparability =
  | "comparable"
  | "birth_changed"
  | "chart_rewritten"
  | "provenance_missing";

interface SavedReading {
  id: string;
  createdAt: string;
  /** DB engine_version of chart A at save time (legacy: single app-constant stamp). */
  engineVersionA: number | null;
  engineVersionB: number | null;
  birthFingerprint: string;
  /** Placement-longitude fingerprint; absent on legacy saves. */
  chartFingerprint: string | null;
  scores?: Record<string, number>;
  comparability: ReadingComparability;
}

function comparabilityFor(
  reading: Omit<SavedReading, "comparability">,
  currentBirthFp: string,
  currentChartFp: string
): ReadingComparability {
  if (!reading.chartFingerprint) return "provenance_missing";
  if (reading.chartFingerprint !== currentChartFp) return "chart_rewritten";
  if (reading.birthFingerprint && reading.birthFingerprint !== currentBirthFp) return "birth_changed";
  return "comparable";
}

// whatTheyNeed extracted to @galaxia/astro compare-guidance (also used by the public Quick Compare).

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
  // SAFETY (ENGINEERING.md §9/§13): never default to a romantic type. A user
  // must never land on romantic/attraction framing by default; when a minor is
  // in the pairing the default drops to an age-appropriate non-romantic type
  // (see the selection effect below). Tag suggestion (self + other) may set
  // partners only from an explicit saved `partner` tag — then the minor clamp
  // below still wins.
  const [relationType, setRelationType] = useState<RelationType>(defaultCompareRelationType(false));
  // Tracks whether the user has explicitly chosen a relationship type, so tag
  // suggestions and the minor-aware default never override an untouched pick.
  const userChoseTypeRef = useRef(false);
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
        .select("id, display_name, relation, birth_date, birth_precision, is_minor, passed_at, birth_time, birth_place, birth_lat, birth_lng, tz_offset_min")
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

  // Tag-based suggestion: only when one side is the user (`self`). Two
  // user-relative tags are never inferred into a pair relation.
  const suggestedRelationType = suggestCompareRelationType(
    selectedA?.relation,
    selectedB?.relation
  );

  // Apply tag suggestion (or the adult fallback) when the pair changes —
  // never overrides an explicit user choice. Minor clamp runs AFTER this.
  useEffect(() => {
    if (userChoseTypeRef.current) return;
    setRelationType(suggestedRelationType ?? defaultCompareRelationType(false));
  }, [personAId, personBId, suggestedRelationType]);

  // Age-aware minor status of the CURRENTLY-SELECTED pair (before running), so
  // the relationship-type gate reacts the moment a minor is picked — never the
  // raw is_minor flag (see minorOf / isMinorForSafety).
  const selectionHasMinor = minorOf(selectedA) || minorOf(selectedB);

  // Minor safety gate for the relationship-type picker — runs LAST and always
  // wins over tag suggestions.
  // 1. A pairing with a minor can never REST on a romantic type — if we are on
  //    one (suggestion, or a type chosen before a minor entered the pairing),
  //    drop to the safe non-romantic default. Romantic framing about a child
  //    is catastrophic; a re-selected adult pairing is a minor annoyance (§13).
  // 2. When a minor first enters an untouched pairing, prefer the age-
  //    appropriate parent-child frame over the neutral adult default.
  useEffect(() => {
    if (!selectionHasMinor) return;
    if (isRomanticRelation(relationType)) {
      setRelationType(defaultCompareRelationType(true));
      return;
    }
    if (!userChoseTypeRef.current) {
      setRelationType(defaultCompareRelationType(true));
    }
  }, [selectionHasMinor, relationType]);

  const availableTypes = availableCompareRelationTypes(selectionHasMinor);
  // Hint only when a real mapping is the currently selected type (not after
  // fallback, minor clamp, or a user override to a different type).
  const showSuggestionHint =
    suggestedRelationType !== null && relationType === suggestedRelationType;

  async function runCompare() {
    if (!selectedA || !selectedB || selectedA.id === selectedB.id) { setStatus("Choose two different people."); return; }
    setRunning(true); setStatus(null);
    const [{ data: chartA }, { data: chartB }] = await Promise.all([
      supabase.from("charts").select("data, engine_version").eq("person_id", selectedA.id).single(),
      supabase.from("charts").select("data, engine_version").eq("person_id", selectedB.id).single()
    ]);
    setRunning(false);
    if (!chartA?.data || !chartB?.data) { setStatus("Missing chart data for one or both people."); return; }
    const natalA = chartA.data as NatalChart;
    const natalB = chartB.data as NatalChart;
    const engineVersionA = (chartA.engine_version as number | null) ?? 1;
    const engineVersionB = (chartB.engine_version as number | null) ?? 1;
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
      venus: getSign(natalA, "venus"), mars: getSign(natalA, "mars"),
      mercury: getSign(natalA, "mercury"), saturn: getSign(natalA, "saturn")
    };
    const personBWithChart: PersonLite = {
      ...selectedB,
      sun: getSign(natalB, "sun"), moon: getSign(natalB, "moon"),
      venus: getSign(natalB, "venus"), mars: getSign(natalB, "mars"),
      mercury: getSign(natalB, "mercury"), saturn: getSign(natalB, "saturn")
    };

    // Provenance for saved readings: stamp the charts actually scored.
    // Chart fingerprint order follows orderPair (pairLow // pairHigh), not UI A/B.
    const { pairLow, pairHigh } = orderPair(selectedA.id, selectedB.id);
    const personLow = selectedA.id === pairLow ? selectedA : selectedB;
    const personHigh = selectedA.id === pairLow ? selectedB : selectedA;
    const chartLow = selectedA.id === pairLow ? natalA : natalB;
    const chartHigh = selectedA.id === pairLow ? natalB : natalA;
    // Both fingerprints use pairLow // pairHigh order so A/B swap does not break match.
    const chartFp = pairChartFingerprint(chartLow, chartHigh);
    const birthFp = `${birthFingerprint(personLow)}//${birthFingerprint(personHigh)}`;

    // Retain already-loaded charts on the result so share can POST a
    // CompareSharePayload without recomputing placements/orbs/confidence.
    setResult({
      personA: personAWithChart,
      personB: personBWithChart,
      chartA: natalA,
      chartB: natalB,
      engineVersionA,
      engineVersionB,
      chartFingerprint: chartFp,
      birthFingerprint: birthFp,
      synastry,
      generational,
      ancestralHeadline,
    });

    // Load prior saved readings for this pair (immutable, dated snapshots).
    const { data: priorRows } = await supabase.from("notes")
      .select("id, created_at, payload").eq("owner_id", userId!)
      .eq("kind", "compare_reading").eq("pair_low", pairLow).eq("pair_high", pairHigh)
      .order("created_at", { ascending: false }).limit(5);
    setSavedReadings((priorRows ?? []).map(r => {
      const pl = (r.payload ?? {}) as {
        engineVersion?: number;
        engineVersionA?: number;
        engineVersionB?: number;
        birthFingerprint?: string;
        chartFingerprint?: string;
        scores?: Record<string, number>;
      };
      // Legacy rows stamped the app CHART_ENGINE_VERSION constant into
      // engineVersion — not the charts' DB versions. Prefer per-chart fields.
      const base = {
        id: r.id as string,
        createdAt: r.created_at as string,
        engineVersionA: pl.engineVersionA ?? null,
        engineVersionB: pl.engineVersionB ?? null,
        birthFingerprint: pl.birthFingerprint ?? "",
        chartFingerprint: pl.chartFingerprint ?? null,
        scores: pl.scores,
      };
      return { ...base, comparability: comparabilityFor(base, birthFp, chartFp) };
    }));
  }

  async function saveReading() {
    if (!userId || !result) return;
    setSavingReading(true);
    const a: PersonLite = result.personA, b: PersonLite = result.personB;
    const { pairLow, pairHigh } = orderPair(a.id, b.id);
    // Stamp DB engine_version of each chart actually scored — never the app constant.
    const payload = {
      relationType,
      scores: result.synastry.scores,
      topAspects: result.synastry.aspects.slice(0, 8),
      generational: result.generational,
      engineVersionA: result.engineVersionA as number,
      engineVersionB: result.engineVersionB as number,
      birthFingerprint: result.birthFingerprint as string,
      chartFingerprint: result.chartFingerprint as string,
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

  /**
   * Share the live comparison via the existing Quick Compare snapshot stack
   * (POST /api/quick-share → /s/<token>). Maps the full RelationType picker to
   * romantic|platonic for the share schema; never recomputes astrology.
   */
  async function createShareUrl(): Promise<string> {
    if (!result?.chartA || !result?.chartB || !result?.synastry) {
      throw new Error("Run a comparison before sharing.");
    }
    // Live pairHasMinor (isMinorForSafety); not stored on the compare_reading note.
    const sharePairHasMinor = minorOf(result.personA) || minorOf(result.personB);
    // Share schema is romantic|platonic only; do not widen it here.
    const mapped: "romantic" | "platonic" = isRomanticRelation(relationType)
      ? "romantic"
      : "platonic";
    // Post-block framing: never send romantic when a minor is in the pairing.
    // Persist also refuses romantic + pairHasMinor with 400.
    const safeRelationType =
      sharePairHasMinor && mapped === "romantic" ? "platonic" : mapped;
    const romanticHeldNotice = sharePairHasMinor && mapped === "romantic";
    const res = await fetch("/api/quick-share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "compare",
        payload: {
          nameA: result.personA.display_name,
          nameB: result.personB.display_name,
          relationType: safeRelationType,
          pairHasMinor: sharePairHasMinor,
          romanticHeldNotice: romanticHeldNotice || undefined,
          chartA: result.chartA,
          chartB: result.chartB,
          synastry: {
            scores: result.synastry.scores,
            aspects: result.synastry.aspects,
          },
          generational: result.generational,
        },
      }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error ?? "Could not create share link.");
    // Token URL only: no birth date, time, or coordinates.
    return `${window.location.origin}/s/${body.token as string}`;
  }

  // Attribution: never present an input/chart change as a relationship "trend".
  const chartRewrittenReading = savedReadings.find(r => r.comparability === "chart_rewritten");
  const birthChangedReading = savedReadings.find(r => r.comparability === "birth_changed");
  const provenanceMissingReading = savedReadings.find(r => r.comparability === "provenance_missing");

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

  // ── Relationship-type-aware engine data (derived; recomputes on type switch) ──
  // Flows/catches sort + framing live in FlowsAndCatchesSection (shared path).
  // House/element lines still read only real computed data here.
  const houseOverlay = result?.synastry ? relationHouseOverlays(result.synastry, relationType) : null;
  const elementSignal = result?.synastry ? relationElementSignal(result.synastry, result.personA.display_name, result.personB.display_name) : null;
  // Self owns the inner house frame regardless of picker A/B order.
  const wheel = result?.synastry
    ? orientSynastryWheel(
        result.personA,
        result.personB,
        result.chartA as NatalChart,
        result.chartB as NatalChart,
        result.synastry.aspects
      )
    : null;
  // Minor safety: age-aware, never the raw is_minor flag (see minorOf).
  const pairHasMinor = minorOf(result?.personA ?? null) || minorOf(result?.personB ?? null);
  // Defense in depth (ENGINEERING.md §13): even if a romantic type were somehow
  // reached with a minor present, refuse to render the (romantically framed)
  // reading and show a safe message instead — never generate it.
  const blockRomanticMinorRender = pairHasMinor && isRomanticRelation(relationType);

  return (
    <main className="app-content">
      <p className="eyebrow">Synastry</p>
      <h1 className="page-title">Compare</h1>
      <p className="lede">See where two people flow, where they catch, and what each one needs.</p>

      {/* Pickers */}
      <section className="glass-card fade-in">
        <p className="eyebrow" style={{ marginBottom: 12 }}>Relationship type</p>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: (selectionHasMinor || showSuggestionHint) ? 8 : 16 }}>
          {availableTypes.map(type => (
            <button key={type} onClick={() => { userChoseTypeRef.current = true; setRelationType(type); }} className="pill-link"
              style={{ fontSize: ".8rem", padding: "7px 14px", borderColor: relationType === type ? "rgba(230,174,108,.5)" : undefined, color: relationType === type ? "var(--gold)" : undefined }}>
              {type}
            </button>
          ))}
        </div>
        {showSuggestionHint ? (
          <p className="muted" style={{ fontSize: ".75rem", lineHeight: 1.55, marginBottom: selectionHasMinor ? 8 : 16 }}>
            {/* FOUNDER-REVIEW: authored — refine voice. */}
            {COMPARE_RELATION_SUGGESTION_HINT}
          </p>
        ) : null}
        {selectionHasMinor ? (
          <p className="muted" style={{ fontSize: ".75rem", lineHeight: 1.55, marginBottom: 16, borderLeft: "2px solid rgba(230,174,108,.4)", paddingLeft: 10 }}>
            A minor is part of this comparison, so only non-romantic readings are available. Romantic and partner framing is turned off for pairings involving a child.
          </p>
        ) : null}
        <div style={{ display: "grid", gap: 10 }}>
          <div>
            <p className="eyebrow" style={{ fontSize: ".62rem", marginBottom: 5 }}>Person A</p>
            <select className="field field--rect" value={personAId ?? ""} onChange={e => setPersonAId(e.target.value)}>
              {people.map(p => <option key={`a-${p.id}`} value={p.id}>{p.display_name}{p.passed_at ? " · remembered" : ""}</option>)}
            </select>
          </div>
          <div>
            <p className="eyebrow" style={{ fontSize: ".62rem", marginBottom: 5 }}>Person B</p>
            <select className="field field--rect" value={personBId ?? ""} onChange={e => setPersonBId(e.target.value)}>
              {people.map(p => <option key={`b-${p.id}`} value={p.id}>{p.display_name}{p.passed_at ? " · remembered" : ""}</option>)}
            </select>
          </div>
          <button className="btn-primary" onClick={runCompare} disabled={running} style={{ width: "fit-content", gap: 8 }}>
            {running && <Spinner size={13} color="#1a1206" />}
            {running ? "Running…" : "Run comparison"}
          </button>
        </div>
      </section>

      {result && blockRomanticMinorRender ? (
        <section className="glass-card fade-in">
          <p className="eyebrow" style={{ marginBottom: 8 }}>Reading held</p>
          <p className="muted" style={{ fontSize: ".88rem", lineHeight: 1.6 }}>
            A minor is part of this comparison, so Galaxia won&apos;t produce a romantic or partner reading here. Choose a non-romantic relationship type — parent-child, siblings, friends, or ancestor — to see the comparison.
          </p>
        </section>
      ) : result ? (
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
            {wheel ? (
              wheel.chart.cusps ? (
                <div style={{ marginTop: 16 }}>
                  <ChartWheel
                    chart={wheel.chart}
                    overlayChart={wheel.overlayChart}
                    aspects={wheel.aspects}
                  />
                </div>
              ) : (
                <p className="muted" style={{ fontSize: ".76rem", marginTop: 14 }}>
                  {COMPARE_WHEEL_NEEDS_HOUSES}
                </p>
              )
            ) : null}
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

          {/* Flow / catches — shared path with /chart/compare and /s */}
          <FlowsAndCatchesSection
            aspects={result.synastry.aspects}
            relationType={relationType}
          />
          {elementSignal ? (
            <section className="glass-card fade-in fade-in-delay-2">
              <p className="muted" style={{ fontSize: ".8rem", lineHeight: 1.6, margin: 0 }}>{elementSignal}</p>
            </section>
          ) : null}

          {/* House overlays — only where houses exist; hedges honestly otherwise (§12) */}
          {houseOverlay && relationHasHouseLens(relationType) ? (
            <section className="glass-card fade-in fade-in-delay-2">
              <p className="eyebrow" style={{ marginBottom: 8 }}>Where your charts land on each other</p>
              {!houseOverlay.available ? (
                <p className="muted" style={{ fontSize: ".82rem", lineHeight: 1.6 }}>
                  These are date-only charts, so the house placements that would show where each of you lands in the other&apos;s life (the {relationHouseHint(relationType)}) aren&apos;t computed — that needs an exact birth time. The reading above holds without them.
                </p>
              ) : houseOverlay.lines.length > 0 ? (
                <div style={{ display: "grid", gap: 8 }}>
                  {houseOverlay.lines.slice(0, 4).map((line, idx) => (
                    <p key={`ho-${idx}`} className="muted" style={{ fontSize: ".82rem", lineHeight: 1.6, margin: 0 }}>
                      {narrateHouseOverlay(line, relationType, result.personA.display_name, result.personB.display_name)}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="muted" style={{ fontSize: ".82rem", lineHeight: 1.6 }}>
                  Both charts have houses, but nothing lands in the {relationHouseHint(relationType)} this type leans on — the connection lives in the aspects above, not the house overlay.
                </p>
              )}
            </section>
          ) : null}

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

          {/* Ask Vela — carry the full pair context so Vela opens on Focus=pair.
              Minor safety (ENGINEERING.md §9): Vela opens in private (ask) mode by
              default and its own gate refuses shared mode whenever a minor is in
              scope. When pairHasMinor (computed via age-aware isMinorForSafety, never
              the raw is_minor flag) we surface that reassurance here so Compare's
              handoff is explicitly age-aware, not just relying on the downstream gate. */}
          <section className="glass-card fade-in fade-in-delay-2" style={{ textAlign: "center" }}>
            <p className="muted" style={{ marginBottom: 12, fontSize: ".88rem" }}>Want Vela to read this dynamic for you?</p>
            <Link
              href={`/app/vela?scope=pair&subject=${result.personA.id}&pair=${result.personB.id}&relType=${encodeURIComponent(relationType)}`}
              className="btn-primary"
            >
              Ask Vela about {result.personA.display_name} &amp; {result.personB.display_name}
            </Link>
            {pairHasMinor ? (
              <p className="muted" style={{ marginTop: 12, fontSize: ".78rem", lineHeight: 1.6, borderLeft: "2px solid rgba(230,174,108,.4)", paddingLeft: 10, textAlign: "left" }}>
                A minor is part of this comparison, so Vela stays in private coaching mode — it guides you and the child never sees the conversation.
              </p>
            ) : null}
          </section>

          {/* Save this reading — an immutable, dated snapshot (never a trend) */}
          <section className="glass-card fade-in fade-in-delay-2">
            <p className="eyebrow" style={{ marginBottom: 8 }}>Save this reading</p>
            {/* FOUNDER-REVIEW: authored — save-reading framing (deterministic when charts match). */}
            <p className="muted" style={{ fontSize: ".8rem", marginBottom: 10 }}>
              With the same chart positions, a comparison is the same every time — so a saved reading is a dated record, not a trend.
              It lives on both {result.personA.display_name}&apos;s and {result.personB.display_name}&apos;s pages.
            </p>
            <button className="btn-primary" onClick={saveReading} disabled={savingReading} style={{ gap: 8 }}>
              {savingReading && <Spinner size={13} color="#1a1206" />}
              {savingReading ? "Saving…" : "Save this reading"}
            </button>

            {/* Free share link: same /api/quick-share + /s/<token> stack as Quick Compare. */}
            <div style={{ marginTop: 14, display: "grid", gap: 8, justifyItems: "start" }}>
              <p className="muted" style={{ fontSize: ".78rem", margin: 0 }}>
                Share a read-only snapshot. The link carries a token only, with no birth details.
              </p>
              <ShareLinkButton createShareUrl={createShareUrl} />
            </div>

            {chartRewrittenReading ? (
              // FOUNDER-REVIEW: authored — saved reading vs chart rewrite (not a relationship trend).
              <p className="muted" style={{ fontSize: ".78rem", marginTop: 12, borderLeft: "2px solid rgba(230,174,108,.4)", paddingLeft: 10 }}>
                A reading saved on {new Date(chartRewrittenReading.createdAt).toLocaleDateString()} is not comparable to this re-run — the planet positions in one or both charts were corrected since it was saved. That is a chart update, not the relationship moving.
              </p>
            ) : birthChangedReading ? (
              // FOUNDER-REVIEW: authored — saved reading vs birth-field edit.
              <p className="muted" style={{ fontSize: ".78rem", marginTop: 12, borderLeft: "2px solid rgba(230,174,108,.4)", paddingLeft: 10 }}>
                A reading saved on {new Date(birthChangedReading.createdAt).toLocaleDateString()} differs from this one because the birth data changed since — not because the relationship did.
              </p>
            ) : provenanceMissingReading ? (
              // FOUNDER-REVIEW: authored — legacy saved reading without chart fingerprint.
              <p className="muted" style={{ fontSize: ".78rem", marginTop: 12, borderLeft: "2px solid rgba(230,174,108,.4)", paddingLeft: 10 }}>
                A reading saved on {new Date(provenanceMissingReading.createdAt).toLocaleDateString()} has no chart provenance, so its score cannot be checked against this re-run. Treat it as a dated snapshot only.
              </p>
            ) : null}

            {savedReadings.length > 0 ? (
              <div style={{ marginTop: 12, display: "grid", gap: 6 }}>
                <p className="muted" style={{ fontSize: ".72rem" }}>Saved readings for this pair:</p>
                {savedReadings.map(r => (
                  <div key={r.id} style={{ fontSize: ".78rem", color: "var(--mist)" }}>
                    {/* FOUNDER-REVIEW: authored — history-row provenance labels. */}
                    {r.comparability === "comparable" ? (
                      <>Read on {new Date(r.createdAt).toLocaleDateString()}{r.scores ? ` · overall ${r.scores.overall}` : ""}</>
                    ) : r.comparability === "chart_rewritten" ? (
                      <>Read on {new Date(r.createdAt).toLocaleDateString()}{r.scores ? ` · overall ${r.scores.overall}` : ""} · not comparable to this re-run — chart positions were corrected since</>
                    ) : r.comparability === "birth_changed" ? (
                      <>Read on {new Date(r.createdAt).toLocaleDateString()}{r.scores ? ` · overall ${r.scores.overall}` : ""} · not comparable — birth data changed since</>
                    ) : (
                      <>Read on {new Date(r.createdAt).toLocaleDateString()}{r.scores ? ` · overall ${r.scores.overall}` : ""} · snapshot only — no chart provenance to compare</>
                    )}
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

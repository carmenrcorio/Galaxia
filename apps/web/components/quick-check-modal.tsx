"use client";

/**
 * Mode 3 — in-app Quick Check (logged-in only). The "date-night" use case:
 * fast, no commitment, a real result. Pre-fills Person A with the logged-in
 * user's own chart; the other person needs only a birthday. Consistent with
 * how /app/compare already runs @galaxia/astro client-side for authenticated
 * users — this reuses that established pattern rather than a server route.
 *
 * Nothing is written to the database until "Add to my galaxy" is clicked.
 * "Discard" just closes the modal — there is nothing to clean up.
 */

import { computeNatalChart, computeSynastry, type NatalChart } from "@galaxia/astro";
import { isMinorForSafety } from "@galaxia/core";
import Link from "next/link";
import { useEffect, useState } from "react";
import { buildBirthInput } from "../lib/birth";
import { whatTheyNeed } from "../lib/compare-guidance";
import { COMPAT_LABELS, compatWord } from "../lib/design";
import { CHART_ENGINE_VERSION } from "../lib/house-system";
import { createSupabaseBrowserClient } from "../lib/supabase/client";
import { MONTHS } from "./birth-fields";
import { Spinner } from "./spinner";

const RELATIONS = ["partner", "friend", "sibling", "parent", "child", "ancestor"] as const;
const currentYear = new Date().getFullYear();

export function QuickCheckLauncher() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 45,
          borderRadius: 999, padding: "12px 20px", border: "none", cursor: "pointer",
          background: "linear-gradient(180deg,var(--gold-bright),var(--gold))", color: "#1a1206",
          fontWeight: 600, fontSize: ".86rem", boxShadow: "0 10px 30px -10px rgba(230,174,108,.7)"
        }}
      >
        ✦ Quick check
      </button>
      {open ? <QuickCheckModal onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function QuickCheckModal({ onClose }: { onClose: () => void }) {
  const [loadingSelf, setLoadingSelf] = useState(true);
  const [myChart, setMyChart] = useState<NatalChart | null>(null);
  const [noSelf, setNoSelf] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [month, setMonth] = useState<number | undefined>();
  const [day, setDay] = useState<number | undefined>();
  const [year, setYear] = useState<number | undefined>();
  const [computing, setComputing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [result, setResult] = useState<{ otherChart: NatalChart; synastry: ReturnType<typeof computeSynastry> } | null>(null);
  const [saving, setSaving] = useState(false);
  const [relation, setRelation] = useState<typeof RELATIONS[number]>("partner");
  const [savedId, setSavedId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoadingSelf(false); setNoSelf(true); return; }
      setUserId(user.id);
      // A unique index on people(owner_id) WHERE is_self guarantees at most
      // one row here — no ordering/limit tie-breaker needed.
      const { data: self } = await supabase.from("people").select("id").eq("owner_id", user.id).eq("is_self", true).maybeSingle();
      if (!self) { setLoadingSelf(false); setNoSelf(true); return; }
      const { data: chartRow } = await supabase.from("charts").select("data").eq("person_id", self.id).single();
      setMyChart((chartRow?.data as NatalChart) ?? null);
      setLoadingSelf(false);
    });
  }, []);

  function compute() {
    if (!myChart || !month || !day || !year) return;
    setComputing(true); setError(null);
    try {
      const built = buildBirthInput({ precision: "date", month, day, year });
      const otherChart = computeNatalChart(built.birth);
      const synastry = computeSynastry(myChart, otherChart);
      setResult({ otherChart, synastry });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't compute that.");
    } finally {
      setComputing(false);
    }
  }

  async function addToGalaxy() {
    if (!userId || !result || !month || !day || !year) return;
    setSaving(true); setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const built = buildBirthInput({ precision: "date", month, day, year });
      // This flow has no minor checkbox at all — the age backstop is the
      // ONLY protection a child saved here gets, so it must run on save.
      const effectiveIsMinor = isMinorForSafety({ isMinor: false, birthDate: built.birthDate, birthPrecision: "date" });
      const { data: person, error: pErr } = await supabase.from("people").insert({
        owner_id: userId, is_self: false, display_name: name.trim() || "New person", relation, is_minor: effectiveIsMinor,
        birth_date: built.birthDate, birth_time: null, birth_place: null, birth_precision: "date",
        birth_lat: null, birth_lng: null, tz_offset_min: null,
      }).select("id").single();
      if (pErr || !person) throw new Error(pErr?.message ?? "Failed to save.");
      const { error: cErr } = await supabase.from("charts").upsert({
        person_id: person.id, house_system: result.otherChart.houseSystem ?? null, data: result.otherChart, engine_version: CHART_ENGINE_VERSION
      });
      if (cErr) throw new Error(cErr.message);
      setSavedId(person.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save.");
    } finally {
      setSaving(false);
    }
  }

  const daysInMonth = month && year ? new Date(year, month, 0).getDate() : 31;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(10,7,23,.75)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div className="glass-card" style={{ maxWidth: 420, width: "100%", maxHeight: "88vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <p className="eyebrow" style={{ margin: 0 }}>Quick check</p>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", color: "var(--mist2)", fontSize: "1.2rem", cursor: "pointer" }}>×</button>
        </div>

        {loadingSelf ? (
          <div style={{ textAlign: "center", padding: 20 }}><Spinner size={16} /></div>
        ) : noSelf ? (
          <div style={{ textAlign: "center" }}>
            <p className="muted" style={{ marginBottom: 12 }}>Add your own birth data first to run a quick check.</p>
            <Link href="/welcome" className="btn-primary">Add my birth data</Link>
          </div>
        ) : savedId ? (
          <div style={{ textAlign: "center" }}>
            <p style={{ color: "var(--teal)", marginBottom: 10 }}>✦ Added to your galaxy.</p>
            <Link href={`/app/person/${savedId}`} className="btn-primary">View their profile</Link>
          </div>
        ) : !result ? (
          <div style={{ display: "grid", gap: 10 }}>
            <p className="muted" style={{ fontSize: ".82rem" }}>Just met someone? Enter their birthday for an instant compatibility read — nothing saves unless you choose to.</p>
            <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Their name (optional)" />
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 2fr", gap: 6 }}>
              <select className="field" value={month ?? ""} onChange={(e) => setMonth(e.target.value ? parseInt(e.target.value, 10) : undefined)}>
                <option value="">Month</option>
                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
              <select className="field" value={day ?? ""} onChange={(e) => setDay(e.target.value ? parseInt(e.target.value, 10) : undefined)}>
                <option value="">Day</option>
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              <select className="field" value={year ?? ""} onChange={(e) => setYear(e.target.value ? parseInt(e.target.value, 10) : undefined)}>
                <option value="">Year</option>
                {Array.from({ length: currentYear - 1799 }, (_, i) => currentYear - i).map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <button className="btn-primary" onClick={compute} disabled={computing || !month || !day || !year} style={{ gap: 8 }}>
              {computing && <Spinner size={13} color="#1a1206" />}
              {computing ? "Checking…" : "Check compatibility"}
            </button>
            {error ? <p className="error" style={{ fontSize: ".8rem" }}>{error}</p> : null}
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {(["overall", "emotional", "warmth"] as const).map((key) => {
              const { word, cls } = compatWord(result.synastry.scores[key]);
              return (
                <div key={key} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,.06)" }}>
                  <span className="muted" style={{ fontSize: ".82rem" }}>{COMPAT_LABELS[key]}</span>
                  <span className={`compat-word ${cls}`} style={{ fontFamily: "var(--serif)" }}>{word}</span>
                </div>
              );
            })}
            <p style={{ fontSize: ".82rem", color: "var(--mist)", lineHeight: 1.6, fontStyle: "italic", margin: 0 }}>
              {whatTheyNeed(result.synastry.scores, { display_name: name || "They" }, "partners", result.synastry)}
            </p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {RELATIONS.map((r) => (
                <button key={r} type="button" className="pill-link" onClick={() => setRelation(r)}
                  style={{ fontSize: ".76rem", padding: "4px 10px", borderColor: relation === r ? "rgba(230,174,108,.5)" : undefined, color: relation === r ? "var(--gold)" : undefined }}>
                  {r}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn-primary" onClick={addToGalaxy} disabled={saving} style={{ gap: 8, flex: 1 }}>
                {saving && <Spinner size={13} color="#1a1206" />}
                {saving ? "Adding…" : "Add to my galaxy"}
              </button>
              <button className="pill-link" onClick={() => { setResult(null); }}>Discard</button>
            </div>
            {error ? <p className="error" style={{ fontSize: ".8rem" }}>{error}</p> : null}
          </div>
        )}
      </div>
    </div>
  );
}

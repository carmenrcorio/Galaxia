"use client";

/**
 * Mode 3 — in-app Quick Check (logged-in only). The "date-night" use case:
 * fast, no commitment, a real result. Compares the other person against the
 * logged-in user's own chart; nothing is written until "Add to my galaxy".
 *
 * PARITY (Phase 2): this modal used to collect only a name + Month/Day/Year —
 * the WORSE tool for the paying user. It now reuses the SAME robust flow as
 * the public /chart(/compare) surfaces: the shared <BirthFields> component
 * (optional exact time, geocoded birth city, year/date/exact precision tiers,
 * honest hedging) and the same romantic/platonic focus that reweights which
 * real aspects surface. Speed is preserved — it is still a one-tap modal, just
 * with feature parity instead of a stripped-down duplicate.
 *
 * No fabrication (§12): a year-precision person yields an honest "no full
 * synastry" hedge instead of guessed aspects, mirroring /chart/compare.
 *
 * Minor safety (§9): the save path has no minor checkbox, so isMinorForSafety
 * (age backstop) is the ONLY protection a child saved here gets — it MUST run
 * on save. Preserved from the previous implementation.
 */

import {
  computeNatalChart,
  computeSynastry,
  buildBirthInput,
  type HouseSystem,
  type NatalChart,
  type BirthFormInput,
} from "@galaxia/astro";
import { isMinorForSafety } from "@galaxia/core";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BASE_BIRTH_INPUT, BirthFields } from "./birth-fields";
import { sortAspectsForFocus, whatTheyNeed, type RelationType } from "../lib/compare-guidance";
import { COMPAT_LABELS, compatWord } from "../lib/design";
import { CHART_ENGINE_VERSION, getPreferredHouseSystem } from "../lib/house-system";
import { interpretAspect, type AspectKey, type BodyKey } from "../lib/interpretations";
import { createSupabaseBrowserClient } from "../lib/supabase/client";
import { Spinner } from "./spinner";

const RELATIONS = ["partner", "friend", "sibling", "parent", "child", "ancestor"] as const;
const FOCUS_TYPES: { key: RelationType; label: string }[] = [
  { key: "romantic", label: "Romantic" },
  { key: "platonic", label: "Platonic" },
];

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
  const [houseSystem, setHouseSystem] = useState<HouseSystem>("placidus");

  const [name, setName] = useState("");
  const [input, setInput] = useState<BirthFormInput>(BASE_BIRTH_INPUT);
  const [focus, setFocus] = useState<RelationType>("romantic");
  const [computing, setComputing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [result, setResult] = useState<{ otherChart: NatalChart; synastry: ReturnType<typeof computeSynastry> | null } | null>(null);
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
      const [{ data: chartRow }, preferred] = await Promise.all([
        supabase.from("charts").select("data").eq("person_id", self.id).single(),
        getPreferredHouseSystem(supabase, user.id),
      ]);
      setMyChart((chartRow?.data as NatalChart) ?? null);
      setHouseSystem(preferred);
      setLoadingSelf(false);
    });
  }, []);

  function compute() {
    if (!myChart) return;
    setComputing(true); setError(null);
    try {
      const built = buildBirthInput(input);
      const otherChart = computeNatalChart({ ...built.birth, houseSystem });
      // §12: aspect-level synastry against a year-only chart would be guesses.
      const canSynastry = otherChart.precision !== "year" && myChart.precision !== "year";
      setResult({ otherChart, synastry: canSynastry ? computeSynastry(myChart, otherChart) : null });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't compute that.");
    } finally {
      setComputing(false);
    }
  }

  async function addToGalaxy() {
    if (!userId || !result) return;
    setSaving(true); setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const built = buildBirthInput(input);
      // This flow has no minor checkbox at all — the age backstop is the
      // ONLY protection a child saved here gets, so it must run on save.
      const effectiveIsMinor = isMinorForSafety({ isMinor: false, birthDate: built.birthDate, birthPrecision: input.precision });
      const { data: person, error: pErr } = await supabase.from("people").insert({
        owner_id: userId, is_self: false, display_name: name.trim() || "New person", relation, is_minor: effectiveIsMinor,
        birth_date: built.birthDate, birth_time: built.birthTime, birth_place: built.birthPlace, birth_precision: input.precision,
        birth_lat: built.birth.lat ?? null, birth_lng: built.birth.lng ?? null, tz_offset_min: built.tzOffsetMin ?? null,
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

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(10,7,23,.75)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div className="glass-card" style={{ maxWidth: 440, width: "100%", maxHeight: "88vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
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
          <div style={{ display: "grid", gap: 12 }}>
            <p className="muted" style={{ fontSize: ".82rem" }}>Just met someone? Enter what you know for an instant compatibility read against your own chart — nothing saves unless you choose to.</p>

            <div>
              <p className="eyebrow" style={{ marginBottom: 8 }}>Romantic or platonic?</p>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {FOCUS_TYPES.map((t) => (
                  <button key={t.key} type="button" className="pill-link" onClick={() => setFocus(t.key)}
                    style={{ fontSize: ".8rem", padding: "6px 13px", borderColor: focus === t.key ? "rgba(230,174,108,.5)" : undefined, color: focus === t.key ? "var(--gold)" : undefined }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Their name (optional)" style={{ borderRadius: 14 }} />
            <BirthFields input={input} onChange={setInput} />

            <button className="btn-primary" onClick={compute} disabled={computing} style={{ gap: 8 }}>
              {computing && <Spinner size={13} color="#1a1206" />}
              {computing ? "Checking…" : "Check compatibility"}
            </button>
            {error ? <p className="error" style={{ fontSize: ".8rem" }}>{error}</p> : null}
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {!result.synastry ? (
              <p className="muted" style={{ fontSize: ".86rem", lineHeight: 1.6 }}>
                {(name || "They")} {name ? "has" : "have"} year-only birth data, so a full synastry read isn't possible — the planet-to-planet aspects would be guesses. Add a birth date for the real read; you can still save them now.
              </p>
            ) : (
              <>
                {(["overall", "emotional", "warmth"] as const).map((key) => {
                  const { word, cls } = compatWord(result.synastry!.scores[key]);
                  return (
                    <div key={key} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,.06)" }}>
                      <span className="muted" style={{ fontSize: ".82rem" }}>{COMPAT_LABELS[key]}</span>
                      <span className={`compat-word ${cls}`} style={{ fontFamily: "var(--serif)" }}>{word}</span>
                    </div>
                  );
                })}
                <p style={{ fontSize: ".82rem", color: "var(--mist)", lineHeight: 1.6, fontStyle: "italic", margin: 0 }}>
                  {whatTheyNeed(result.synastry.scores, { display_name: name || "They" }, focus, result.synastry)}
                </p>
                <div>
                  <p className="eyebrow" style={{ marginBottom: 6 }}>Where it flows and catches</p>
                  {sortAspectsForFocus(result.synastry.aspects.filter((a) => a.from !== a.to).sort((a, b) => a.orb - b.orb), focus).slice(0, 4).map((a, idx) => {
                    const reading = interpretAspect(a.from.toLowerCase() as BodyKey, a.to.toLowerCase() as BodyKey, a.type.toLowerCase() as AspectKey);
                    return (
                      <div key={`${a.from}-${a.to}-${idx}`} style={{ display: "flex", alignItems: "baseline", gap: 8, padding: "5px 0", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                        <span style={{ fontSize: ".76rem", color: a.harmony >= 0 ? "var(--teal)" : "var(--rose)", flexShrink: 0 }}>{a.harmony >= 0 ? "↑" : "↓"}</span>
                        <span className="muted" style={{ fontSize: ".78rem" }}>{a.from} {a.type} {a.to}</span>
                        <span className="muted" style={{ fontSize: ".72rem", fontStyle: "italic" }}>{reading.short}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

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
              <button className="pill-link" onClick={() => { setResult(null); }}>Back</button>
            </div>
            {error ? <p className="error" style={{ fontSize: ".8rem" }}>{error}</p> : null}
          </div>
        )}
      </div>
    </div>
  );
}

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
  interpretSynastryAspect,
  type AspectKey,
  type BodyKey,
  selectCompareAspectRows,
  whatTheyNeed,
  relationshipWatchLine,
  type RelationType,
} from "@galaxia/astro";
import { ASK_BIRTH_DATA_TOGGLE, GALAXY_RELATION_PICKER_OPTIONS } from "@galaxia/core";
import Link from "next/link";
import { useEffect, useState } from "react";
import { COMPAT_LABELS, compatWord } from "../lib/design";
import { getPreferredHouseSystem } from "../lib/house-system";
import { EMPTY_STATE_WELCOME_HREF } from "../lib/nav-links";
import { persistPerson } from "../lib/persist-person";
import { createSupabaseBrowserClient } from "../lib/supabase/client";
import { AskBirthData } from "./ask-birth-data";
import { BASE_BIRTH_INPUT, BirthFields } from "./birth-fields";
import { CustomCheck } from "./custom-check";
import { Spinner } from "./spinner";

const RELATIONS = GALAXY_RELATION_PICKER_OPTIONS;
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
  const [relation, setRelation] = useState<(typeof RELATIONS)[number]["value"]>("partner");
  const [saved, setSaved] = useState<{ id: string; isMinor: boolean; askForBirthData: boolean } | null>(null);
  const [askThem, setAskThem] = useState(false);

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
      setError(err instanceof Error ? err.message : "This chart could not be computed. Check the birth details and try again.");
    } finally {
      setComputing(false);
    }
  }

  async function addToGalaxy() {
    if (!userId || !result) return;
    setSaving(true); setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const created = await persistPerson(supabase, {
        userId,
        displayName: name.trim() || "New person",
        relation,
        isSelf: false,
        isMinor: false,
        input
      });
      setSaved({
        id: created.personId,
        isMinor: created.isMinor,
        askForBirthData: askThem && !created.isMinor
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "This person could not be saved to your constellation. Try again.");
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
            <Link href={EMPTY_STATE_WELCOME_HREF as never} className="btn-primary">Add my birth data</Link>
          </div>
        ) : saved ? (
          <div style={{ textAlign: "center", display: "grid", gap: 10 }}>
            <p style={{ color: "var(--teal)", marginBottom: 0 }}>✦ Added to your galaxy.</p>
            {userId && !saved.isMinor ? (
              <AskBirthData
                personId={saved.id}
                personName={name.trim() || "them"}
                userId={userId}
                autoCreate={saved.askForBirthData}
                isMinor={saved.isMinor}
              />
            ) : null}
            <Link href={`/app/person/${saved.id}`} className="btn-primary">View their profile</Link>
          </div>
        ) : !result ? (
          <div style={{ display: "grid", gap: 12 }}>
            <p className="muted" style={{ fontSize: ".82rem" }}>Just met someone? Enter what you know for an instant synastry read against your own chart. Nothing saves unless you choose to.</p>{/* FOUNDER-REVIEW */}

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
            <BirthFields input={input} onChange={setInput} idPrefix="quick-check" />

            <button className="btn-primary" onClick={compute} disabled={computing} style={{ gap: 8 }}>
              {computing && <Spinner size={13} color="#1a1206" />}
              {computing ? "Checking…" : "Compare charts" /* FOUNDER-REVIEW */}
            </button>
            {error ? <p className="error" style={{ fontSize: ".8rem" }}>{error}</p> : null}
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {!result.synastry ? (
              <p className="muted" style={{ fontSize: ".86rem", lineHeight: 1.6 }}>
                {(name || "They")} {name ? "has" : "have"} year-only birth data, so a full synastry read isn't possible. The planet-to-planet aspects would be guesses. Add a birth date for the real read; you can still save them now.
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
                {relationshipWatchLine(result.synastry.scores, focus, result.synastry) ? (
                  <p className="muted" style={{ fontSize: ".82rem", lineHeight: 1.6, fontStyle: "italic", margin: 0, borderLeft: "2px solid rgba(183,154,216,.35)", paddingLeft: 12 }}>
                    {relationshipWatchLine(result.synastry.scores, focus, result.synastry)}
                  </p>
                ) : null}
                <div>
                  <p className="eyebrow" style={{ marginBottom: 6 }}>Where it flows and catches</p>
                  {selectCompareAspectRows(result.synastry.aspects, focus, 4).map((a, idx) => {
                    const reading = interpretSynastryAspect(a.from.toLowerCase() as BodyKey, a.to.toLowerCase() as BodyKey, a.type.toLowerCase() as AspectKey);
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
              {RELATIONS.map(({ value, label }) => (
                <button key={value} type="button" className="pill-link" onClick={() => setRelation(value)}
                  style={{ fontSize: ".76rem", padding: "4px 10px", borderColor: relation === value ? "rgba(230,174,108,.5)" : undefined, color: relation === value ? "var(--gold)" : undefined }}>
                                    {label}
                </button>
              ))}
            </div>
            <CustomCheck checked={askThem} onChange={setAskThem} label={ASK_BIRTH_DATA_TOGGLE} id="quick-check-ask-them" />
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

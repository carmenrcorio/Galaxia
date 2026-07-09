"use client";

import { computeNatalChart, type Precision } from "@galaxia/astro";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CosmicBackground } from "../../components/cosmic-background";
import { CustomCheck } from "../../components/custom-check";
import { InitialAvatar } from "../../components/initial-avatar";
import { Spinner } from "../../components/spinner";
import { buildBirthInput, formatDateForConfirmation, type BirthFormInput } from "../../lib/birth";
import { searchPlaces, type GeoCandidate } from "../../lib/geocode";
import { CHART_ENGINE_VERSION, getPreferredHouseSystem } from "../../lib/house-system";
import { createSupabaseBrowserClient } from "../../lib/supabase/client";

type Relation = "partner" | "child" | "parent" | "grandparent" | "sibling" | "friend" | "ancestor" | "self";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

const precisionTiers: { key: Precision; label: string; unlocks: string }[] = [
  { key: "exact", label: "Exact time",  unlocks: "Full chart: Ascendant, houses, precise Moon, and all 10 planets." },
  { key: "date",  label: "Date only",   unlocks: "Sun, Moon, all planetary signs, and the generational layer. No Ascendant." },
  { key: "year",  label: "Year only",   unlocks: "Generational layer only — good for ancestors and anyone whose date you don't know." }
];

const relationOptions: Relation[] = ["partner", "child", "parent", "grandparent", "sibling", "friend", "ancestor"];

const baseInput: BirthFormInput = {
  precision: "date",
  month: undefined, day: undefined, year: undefined,
  hour: undefined, minute: undefined,
  yearOnly: undefined,
  birthPlace: "", lat: "", lng: "", tzOffsetMin: undefined, tzId: undefined
};

/* ─── BirthFields ─────────────────────────────────────────────────────────── */
/**
 * Structured birth data entry. Never uses free-text fields for date or time.
 *
 * BUG A fix: separate Month / Day / Year selects eliminate format ambiguity.
 *            Hour / Minute selects eliminate 12h/24h confusion.
 * BUG B fix: city search returns a disambiguation list; user MUST choose.
 *            Never auto-accepts the first geocode result.
 * BUG C fix: if no timezone is resolved, exact precision is blocked at save.
 */
function BirthFields({ input, onChange }: { input: BirthFormInput; onChange: (next: BirthFormInput) => void }) {
  // Geocoder state
  const [searching,   setSearching]   = useState(false);
  const [candidates,  setCandidates]  = useState<GeoCandidate[]>([]);
  const [cityQuery,   setCityQuery]   = useState(input.birthPlace ?? "");
  const [searchError, setSearchError] = useState<string | null>(null);

  // Days in the selected month/year
  const daysInMonth = useMemo(() => {
    if (!input.month || !input.year) return 31;
    return new Date(input.year, input.month, 0).getDate();
  }, [input.month, input.year]);

  // Clamp day if month/year changed
  const clampedDay = input.day && input.day > daysInMonth ? daysInMonth : input.day;
  if (clampedDay !== input.day && clampedDay !== undefined) {
    onChange({ ...input, day: clampedDay });
  }

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1799 }, (_, i) => currentYear - i);

  // Parsed date string for geocoding reference
  const dateForGeo = (input.year && input.month && input.day)
    ? new Date(Date.UTC(input.year, input.month - 1, input.day, 12, 0, 0))
    : undefined;

  // Confirmation label: unambiguous date string shown before save
  const displayDate = (input.precision !== "year" && input.month && input.day && input.year)
    ? formatDateForConfirmation(input.month, input.day, input.year)
    : input.precision === "year" && input.yearOnly
    ? String(input.yearOnly)
    : null;

  // Resolved place confirmation
  const resolvedPlace = input.birthPlace && input.lat && input.lng;
  const tzLabel = resolvedPlace && input.tzId
    ? input.tzOffsetMin != null
      ? `${input.tzId} (UTC${input.tzOffsetMin >= 0 ? "+" : ""}${(input.tzOffsetMin / 60).toFixed(0)}h at birth date)`
      : `${input.tzId} (timezone offset could not be resolved — exact-time charts need it)`
    : null;

  const hasExactTimeAndPlace = input.precision === "exact" && resolvedPlace;
  const noPlaceWarning       = input.precision === "exact" && !resolvedPlace;

  async function handleSearch() {
    const q = cityQuery.trim();
    if (!q) return;
    setSearching(true);
    setCandidates([]);
    setSearchError(null);
    try {
      const results = await searchPlaces(q, dateForGeo);
      if (!results.length) {
        setSearchError(`No places found for "${q}". Try adding a region or country (e.g. "Jacksonville, Arkansas").`);
      } else {
        setCandidates(results);
      }
    } catch (err) {
      // An outage is not "no results" — say what actually happened.
      setSearchError(err instanceof Error ? err.message : "The place search service couldn't be reached.");
    } finally {
      setSearching(false);
    }
  }

  function selectCandidate(c: GeoCandidate) {
    onChange({
      ...input,
      birthPlace:  c.label,
      lat:         String(c.lat),
      lng:         String(c.lng),
      tzOffsetMin: c.tzOffset ?? undefined,
      tzId:        c.tzId,
    });
    setCandidates([]);
    setCityQuery(c.label);
  }

  function clearPlace() {
    onChange({ ...input, birthPlace: "", lat: "", lng: "", tzOffsetMin: undefined, tzId: undefined });
    setCityQuery("");
    setCandidates([]);
    setSearchError(null);
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>

      {/* Precision selector */}
      <div style={{ display: "grid", gap: 6 }}>
        {precisionTiers.map((tier) => (
          <button
            key={tier.key} type="button" className="glass-card"
            onClick={() => onChange({ ...baseInput, precision: tier.key })}
            style={{ textAlign: "left", cursor: "pointer", borderColor: input.precision === tier.key ? "var(--gold)" : "var(--line)", padding: "10px 14px" }}>
            <strong style={{ color: input.precision === tier.key ? "var(--gold)" : "var(--cream)", display: "block", marginBottom: 2 }}>
              {tier.label}
            </strong>
            <span className="muted" style={{ fontSize: ".8rem" }}>{tier.unlocks}</span>
          </button>
        ))}
      </div>

      {/* Year-only */}
      {input.precision === "year" ? (
        <div>
          <p style={{ fontSize: ".74rem", color: "var(--mist2)", marginBottom: 5 }}>Birth year</p>
          <input
            type="number" className="field" min={1800} max={currentYear}
            value={input.yearOnly ?? ""}
            onChange={e => onChange({ ...input, yearOnly: e.target.value ? parseInt(e.target.value, 10) : undefined })}
            placeholder="e.g. 1952"
          />
        </div>
      ) : (
        <>
          {/* ── Structured date: Month / Day / Year ── */}
          <div>
            <p style={{ fontSize: ".74rem", color: "var(--mist2)", marginBottom: 5 }}>Birth date</p>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 2fr", gap: 6 }}>
              {/* Month */}
              <select className="field" value={input.month ?? ""} onChange={e => onChange({ ...input, month: e.target.value ? parseInt(e.target.value, 10) : undefined })}>
                <option value="">Month</option>
                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
              {/* Day */}
              <select className="field" value={input.day ?? ""} onChange={e => onChange({ ...input, day: e.target.value ? parseInt(e.target.value, 10) : undefined })}>
                <option value="">Day</option>
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              {/* Year */}
              <select className="field" value={input.year ?? ""} onChange={e => onChange({ ...input, year: e.target.value ? parseInt(e.target.value, 10) : undefined })}>
                <option value="">Year</option>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            {/* Show parsed date back for confirmation */}
            {displayDate ? (
              <p style={{ fontSize: ".74rem", color: "var(--teal)", marginTop: 5 }}>
                ✓ {displayDate}
              </p>
            ) : null}
          </div>

          {/* ── Exact time: Hour / Minute ── */}
          {input.precision === "exact" ? (
            <div>
              <p style={{ fontSize: ".74rem", color: "var(--mist2)", marginBottom: 5 }}>Birth time (local time at birth place)</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                <select className="field" value={input.hour ?? ""} onChange={e => onChange({ ...input, hour: e.target.value !== "" ? parseInt(e.target.value, 10) : undefined })}>
                  <option value="">Hour</option>
                  {Array.from({ length: 24 }, (_, i) => i).map(h => (
                    <option key={h} value={h}>{String(h).padStart(2, "0")}:00 ({h === 0 ? "midnight" : h === 12 ? "noon" : h < 12 ? `${h} am` : `${h - 12} pm`})</option>
                  ))}
                </select>
                <select className="field" value={input.minute ?? ""} onChange={e => onChange({ ...input, minute: e.target.value !== "" ? parseInt(e.target.value, 10) : undefined })}>
                  <option value="">Minute</option>
                  {[0,5,10,15,20,25,30,35,40,45,50,55].map(m => (
                    <option key={m} value={m}>{String(m).padStart(2, "0")}</option>
                  ))}
                  {/* allow any minute from birth certificate */}
                  {Array.from({length:60},(_,i)=>i).filter(m=>![0,5,10,15,20,25,30,35,40,45,50,55].includes(m)).map(m=>(
                    <option key={m} value={m}>{String(m).padStart(2,"0")}</option>
                  ))}
                </select>
              </div>
            </div>
          ) : null}

          {/* ── City search with disambiguation ── */}
          <div>
            <p style={{ fontSize: ".74rem", color: "var(--mist2)", marginBottom: 5 }}>
              {input.precision === "exact" ? "Birth city — required for Ascendant and houses" : "Birth city (optional — improves precision)"}
            </p>

            {/* If a place is already resolved, show confirmation + clear button */}
            {resolvedPlace ? (
              <div style={{ padding: "10px 12px", borderRadius: 12, background: "rgba(111,177,184,.08)", border: "1px solid rgba(111,177,184,.25)" }}>
                <p style={{ color: "var(--teal)", fontSize: ".82rem", fontWeight: 600, margin: "0 0 2px" }}>
                  ✓ {input.birthPlace}
                </p>
                <p style={{ color: "var(--mist2)", fontSize: ".72rem", margin: "0 0 6px" }}>
                  {input.lat && input.lng ? `${parseFloat(input.lat).toFixed(4)}°, ${parseFloat(input.lng).toFixed(4)}°` : ""}
                  {tzLabel ? ` · ${tzLabel}` : ""}
                </p>
                <button type="button" className="pill-link" style={{ fontSize: ".72rem", padding: "3px 10px" }} onClick={clearPlace}>
                  Change
                </button>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", gap: 6 }}>
                  <input
                    className="field"
                    value={cityQuery}
                    onChange={e => { setCityQuery(e.target.value); setCandidates([]); setSearchError(null); }}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); void handleSearch(); } }}
                    placeholder='e.g. "Jacksonville, Arkansas" or "London"'
                    style={{ borderRadius: 14 }}
                  />
                  <button
                    type="button" className="pill-link" onClick={handleSearch}
                    disabled={searching || !cityQuery.trim()}
                    style={{ flexShrink: 0, gap: 6 }}>
                    {searching && <Spinner size={12} />}
                    {searching ? "Searching…" : "Search"}
                  </button>
                </div>

                {searchError ? (
                  <p className="error" style={{ fontSize: ".74rem", marginTop: 5 }}>{searchError}</p>
                ) : null}

                {/* Disambiguation list — user MUST choose */}
                {candidates.length > 0 ? (
                  <div style={{ marginTop: 6, borderRadius: 12, overflow: "hidden", border: "1px solid rgba(183,154,216,.2)" }}>
                    <p style={{ fontSize: ".7rem", color: "var(--mist2)", padding: "6px 12px", background: "rgba(10,7,23,.4)", margin: 0 }}>
                      {candidates.length} result{candidates.length > 1 ? "s" : ""}. Choose the correct one.
                    </p>
                    {candidates.map((c, i) => (
                      <button
                        key={i} type="button"
                        onClick={() => selectCandidate(c)}
                        style={{ width: "100%", textAlign: "left", background: "rgba(23,17,48,.8)", border: "none", borderTop: i > 0 ? "1px solid rgba(183,154,216,.1)" : "none", padding: "10px 12px", cursor: "pointer", transition: "background .15s" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "rgba(29,22,64,.9)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "rgba(23,17,48,.8)")}
                      >
                        <span style={{ color: "var(--cream)", fontSize: ".84rem", fontWeight: 600 }}>{c.label}</span>
                        <span style={{ color: "var(--mist2)", fontSize: ".72rem", marginLeft: 8 }}>
                          {c.lat.toFixed(4)}°, {c.lng.toFixed(4)}°
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </>
            )}

            {noPlaceWarning && !candidates.length && !resolvedPlace ? (
              <p className="error" style={{ fontSize: ".74rem", marginTop: 5 }}>
                A birth city is required for exact precision. Search above to resolve it.
              </p>
            ) : null}
          </div>

          {/* Manual coordinate override */}
          <details style={{ color: "var(--mist2)", fontSize: ".78rem" }}>
            <summary style={{ cursor: "pointer" }}>Enter coordinates manually (advanced)</summary>
            <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
              <input className="field" value={input.lat ?? ""}
                onChange={e => onChange({ ...input, lat: e.target.value })}
                placeholder="Latitude (e.g. 34.8659)" />
              <input className="field" value={input.lng ?? ""}
                onChange={e => onChange({ ...input, lng: e.target.value })}
                placeholder="Longitude (e.g. -92.1099)" />
              <p style={{ margin: 0, fontSize: ".72rem", color: "var(--mist2)" }}>
                If entering coordinates manually, also set tzOffsetMin via the search above to ensure correct UTC conversion.
              </p>
            </div>
          </details>
        </>
      )}
    </div>
  );
}

/* ─── WelcomePage ─────────────────────────────────────────────────────────── */
export default function WelcomePage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [userId, setUserId]     = useState<string | null>(null);
  const [tier, setTier]         = useState<"free" | "plus">("free");
  const [selfName, setSelfName] = useState("");
  const [selfInput, setSelfInput] = useState<BirthFormInput>(baseInput);
  const [personName, setPersonName]   = useState("");
  const [personRelation, setPersonRelation] = useState<Relation>("friend");
  const [personMinor, setPersonMinor] = useState(false);
  const [personInput, setPersonInput] = useState<BirthFormInput>(baseInput);
  const [people, setPeople]     = useState<Array<{ id: string; display_name: string; relation: string; birth_precision: string }>>([]);
  const [savingSelf, setSavingSelf]     = useState(false);
  const [savingPerson, setSavingPerson] = useState(false);
  const [status, setStatus] = useState<{ text: string; ok: boolean } | null>(null);

  const peopleLimit = tier === "plus" ? Number.POSITIVE_INFINITY : 5;
  const canSaveSelf   = selfName.trim().length > 1;
  const canSavePerson = personName.trim().length > 1;

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const [{ data: profile }, { data: peopleRows }] = await Promise.all([
        supabase.from("profiles").select("subscription_tier").eq("id", user.id).single(),
        supabase.from("people").select("id, display_name, relation, birth_precision").eq("owner_id", user.id).order("created_at", { ascending: false })
      ]);
      setTier((profile?.subscription_tier as "free" | "plus") ?? "free");
      setPeople(peopleRows ?? []);
    };
    void load();
  }, [supabase]);

  const fetchPeople = async () => {
    if (!userId) return;
    const { data } = await supabase.from("people").select("id, display_name, relation, birth_precision").eq("owner_id", userId).order("created_at", { ascending: false });
    setPeople(data ?? []);
  };

  const persistPerson = async ({
    displayName, relation, isSelf, isMinor, input
  }: {
    displayName: string; relation: Relation; isSelf: boolean; isMinor: boolean; input: BirthFormInput;
  }) => {
    if (!userId) throw new Error("Please sign in first.");

    // buildBirthInput now throws clearly if timezone is missing for exact precision (BUG C)
    const built = buildBirthInput(input);
    const houseSystem = await getPreferredHouseSystem(supabase, userId);
    const natal = computeNatalChart({ ...built.birth, houseSystem });

    const { data: person, error: personError } = await supabase
      .from("people")
      .insert({
        owner_id: userId,
        is_self: isSelf,
        display_name: displayName.trim(),
        relation,
        is_minor: isMinor,
        birth_date: built.birthDate,
        birth_time: built.birthTime,
        birth_place: built.birthPlace,
        birth_precision: input.precision,
        birth_lat:  built.birth.lat ?? null,
        birth_lng:  built.birth.lng ?? null,
        tz_offset_min: built.tzOffsetMin ?? null,
      })
      .select("id")
      .single();

    if (personError || !person) throw new Error(personError?.message ?? "Failed to save person.");

    const { error: chartError } = await supabase.from("charts").upsert({
      // house_system records what was actually computed — never a claim the engine didn't fulfil
      person_id: person.id, house_system: natal.houseSystem ?? null, data: natal, engine_version: CHART_ENGINE_VERSION
    });
    if (chartError) throw new Error(chartError.message);
    return natal;
  };

  const saveSelf = async () => {
    setSavingSelf(true); setStatus(null);
    try {
      const natal = await persistPerson({ displayName: selfName, relation: "self", isSelf: true, isMinor: false, input: selfInput });
      await fetchPeople();
      const risingNote = natal.asc ? ` Rising: ${natal.asc}.` : selfInput.precision === "exact" ? " (No rising — resolve a birth city to unlock houses.)" : "";
      setStatus({ text: `Saved your chart.${risingNote}`, ok: true });
    } catch (error) {
      setStatus({ text: error instanceof Error ? error.message : "Unable to save.", ok: false });
    } finally { setSavingSelf(false); }
  };

  const savePerson = async () => {
    setSavingPerson(true); setStatus(null);
    try {
      if (people.length >= peopleLimit) {
        setStatus({ text: "Free plan: 5-person limit reached.", ok: false });
        return;
      }
      await persistPerson({ displayName: personName, relation: personRelation, isSelf: false, isMinor: personMinor, input: personInput });
      setPersonName(""); setPersonMinor(false); setPersonRelation("friend"); setPersonInput(baseInput);
      await fetchPeople();
      setStatus({ text: `${personName} added to your constellation.`, ok: true });
    } catch (error) {
      setStatus({ text: error instanceof Error ? error.message : "Unable to add person.", ok: false });
    } finally { setSavingPerson(false); }
  };

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      <CosmicBackground />
      <main className="app-content">
        <div>
          <p className="eyebrow">Onboarding</p>
          <h1 className="page-title">Build your constellation</h1>
          <p className="muted">Start with yourself, then add the people at the center of your life.</p>
          <p style={{ color: "var(--gold-soft)", fontSize: 13, marginTop: 4 }}>
            {tier === "plus" ? "Galaxia+ · unlimited people" : `Free plan · ${Math.max(0, 5 - people.length)} people remaining`}
          </p>
        </div>

        {/* You first */}
        <section className="glass-card fade-in">
          <p className="eyebrow">You first</p>
          <input className="field" value={selfName} onChange={e => setSelfName(e.target.value)} placeholder="Your display name" style={{ marginBottom: 12, borderRadius: 14 }} />
          <BirthFields input={selfInput} onChange={setSelfInput} />
          <button className="btn-primary" style={{ marginTop: 14, gap: 8 }} disabled={!canSaveSelf || savingSelf} onClick={saveSelf}>
            {savingSelf && <Spinner size={13} color="#1a1206" />}
            {savingSelf ? "Saving chart…" : "Save my profile"}
          </button>
        </section>

        {/* Add people */}
        <section className="glass-card fade-in fade-in-delay-1">
          <p className="eyebrow">Add people</p>
          <input className="field" value={personName} onChange={e => setPersonName(e.target.value)} placeholder="Name" style={{ marginBottom: 10, borderRadius: 14 }} />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
            {relationOptions.map(r => (
              <button key={r} type="button" className="pill-link" onClick={() => setPersonRelation(r)}
                style={{ fontSize: 13, padding: "6px 13px", borderColor: personRelation === r ? "rgba(230,174,108,.5)" : undefined, color: personRelation === r ? "var(--gold)" : undefined }}>
                {r}
              </button>
            ))}
          </div>
          <div style={{ marginBottom: 12 }}>
            <CustomCheck checked={personMinor} onChange={setPersonMinor} label="This person is a minor" />
          </div>
          <BirthFields input={personInput} onChange={setPersonInput} />
          {people.length >= peopleLimit ? (
            <p className="error" style={{ fontSize: 13, margin: "10px 0 0" }}>Free plan: 5-person limit reached.</p>
          ) : null}
          <button className="btn-primary" style={{ marginTop: 14, gap: 8 }} disabled={!canSavePerson || savingPerson || people.length >= peopleLimit} onClick={savePerson}>
            {savingPerson && <Spinner size={13} color="#1a1206" />}
            {savingPerson ? "Adding…" : "Add to constellation"}
          </button>
        </section>

        {status ? <p className={status.ok ? "success" : "error"}>{status.text}</p> : null}

        {people.length > 0 ? (
          <section className="glass-card fade-in fade-in-delay-2">
            <p className="eyebrow">Your constellation ({people.length})</p>
            <div style={{ display: "grid", gap: 10, marginTop: 6 }}>
              {people.map(p => (
                <Link key={p.id} href={`/app/person/${p.id}`} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid rgba(183,154,216,.1)", textDecoration: "none" }}>
                  <InitialAvatar name={p.display_name} size="sm" />
                  <div>
                    <div style={{ color: "var(--cream)", fontWeight: 600 }}>{p.display_name}</div>
                    <div className="muted" style={{ fontSize: 12 }}>{p.relation} · {p.birth_precision}</div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link className="btn-primary" href="/app">Open Galaxia Mea</Link>
          <Link className="pill-link" href="/app/groups">Groups</Link>
        </div>
      </main>
    </div>
  );
}

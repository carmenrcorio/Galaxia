"use client";

import { computeNatalChart, type Precision } from "@galaxia/astro";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { InitialAvatar } from "../../components/initial-avatar";
import { type BirthFormInput, buildBirthInput } from "../../lib/birth";
import { geocodeCity } from "../../lib/geocode";
import { createSupabaseBrowserClient } from "../../lib/supabase/client";

type Relation = "partner" | "child" | "parent" | "grandparent" | "sibling" | "friend" | "ancestor" | "self";

const precisionTiers: { key: Precision; label: string; unlocks: string }[] = [
  { key: "exact", label: "Exact time", unlocks: "Full chart: houses, ascendant, and exact Moon placement." },
  { key: "date",  label: "Date only",  unlocks: "Planetary signs and generational layer — no rising sign." },
  { key: "year",  label: "Year only",  unlocks: "Generational layer only — good for ancestors." }
];

const relationOptions: Relation[] = ["partner", "child", "parent", "grandparent", "sibling", "friend", "ancestor"];

const baseInput: BirthFormInput = { precision: "date", date: "", time: "", year: "", birthPlace: "", lat: "", lng: "" };

/* ──────────────────────────────────────────────────────────── */

function BirthFields({ input, onChange }: { input: BirthFormInput; onChange: (next: BirthFormInput) => void }) {
  const [geocoding, setGeocoding] = useState(false);
  const [geoMsg,    setGeoMsg]    = useState<string | null>(null);

  const handleCityBlur = useCallback(async () => {
    const city = input.birthPlace?.trim();
    if (!city || input.precision !== "exact") return;
    if (input.lat && input.lng) return; // already set manually
    setGeocoding(true);
    setGeoMsg(null);
    const result = await geocodeCity(city);
    setGeocoding(false);
    if (result) {
      onChange({ ...input, lat: String(result.lat), lng: String(result.lng) });
      setGeoMsg(`Found: ${result.displayName.split(",").slice(0, 2).join(",")}`);
    } else {
      setGeoMsg("City not found — enter latitude/longitude manually for a rising sign.");
    }
  }, [input, onChange]);

  const noLocationWarning = input.precision === "exact" && !input.lat && !input.lng && !input.birthPlace?.trim();

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {/* Precision picker */}
      <div style={{ display: "grid", gap: 6 }}>
        {precisionTiers.map((tier) => (
          <button key={tier.key} type="button" className="glass-card" onClick={() => onChange({ ...input, precision: tier.key })}
            style={{ textAlign: "left", cursor: "pointer", borderColor: input.precision === tier.key ? "var(--gold)" : "var(--line)", padding: "10px 14px" }}>
            <strong style={{ color: input.precision === tier.key ? "var(--gold)" : "var(--cream)", display: "block", marginBottom: 2 }}>{tier.label}</strong>
            <span className="muted" style={{ fontSize: 13 }}>{tier.unlocks}</span>
          </button>
        ))}
      </div>

      {/* Fields per precision */}
      {input.precision === "year" ? (
        <input className="field" value={input.year} onChange={(e) => onChange({ ...input, year: e.target.value })} placeholder="Birth year (e.g. 1952)" />
      ) : (
        <>
          <input className="field" value={input.date} onChange={(e) => onChange({ ...input, date: e.target.value })} placeholder="Birth date (YYYY-MM-DD)" />
          {input.precision === "exact" ? (
            <input className="field" value={input.time} onChange={(e) => onChange({ ...input, time: e.target.value })} placeholder="Birth time (HH:MM — 24h local time)" />
          ) : null}
        </>
      )}

      {/* City geocoder (shown for exact + date precision) */}
      {input.precision !== "year" ? (
        <div>
          <input className="field" value={input.birthPlace ?? ""}
            onChange={(e) => onChange({ ...input, birthPlace: e.target.value, lat: "", lng: "" })}
            onBlur={handleCityBlur}
            placeholder={input.precision === "exact" ? "Birth city (for rising sign & houses)" : "Birth city (optional)"}
          />
          {geocoding ? <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>Looking up location…</p> : null}
          {geoMsg    ? <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>{geoMsg}</p> : null}
          {noLocationWarning && input.precision === "exact" ? (
            <p className="error" style={{ fontSize: 12, marginTop: 4 }}>
              Without a birth city we can't compute a rising sign or houses — enter the city or coordinates below.
            </p>
          ) : null}
        </div>
      ) : null}

      {/* Manual lat/lng override */}
      {input.precision !== "year" ? (
        <details style={{ color: "var(--mist2)", fontSize: 13 }}>
          <summary style={{ cursor: "pointer" }}>Advanced: enter coordinates manually</summary>
          <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
            <input className="field" value={input.lat ?? ""} onChange={(e) => onChange({ ...input, lat: e.target.value })} placeholder="Latitude (e.g. 40.7128)" />
            <input className="field" value={input.lng ?? ""} onChange={(e) => onChange({ ...input, lng: e.target.value })} placeholder="Longitude (e.g. -74.0060)" />
          </div>
        </details>
      ) : null}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────── */

export default function WelcomePage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [userId, setUserId]       = useState<string | null>(null);
  const [tier, setTier]           = useState<"free" | "plus">("free");
  const [selfName, setSelfName]   = useState("");
  const [selfInput, setSelfInput] = useState<BirthFormInput>(baseInput);
  const [personName, setPersonName]   = useState("");
  const [personRelation, setPersonRelation] = useState<Relation>("friend");
  const [personMinor, setPersonMinor]   = useState(false);
  const [personInput, setPersonInput]   = useState<BirthFormInput>(baseInput);
  const [people, setPeople]       = useState<Array<{ id: string; display_name: string; relation: string; birth_precision: string }>>([]);
  const [savingSelf, setSavingSelf]     = useState(false);
  const [savingPerson, setSavingPerson] = useState(false);
  const [status, setStatus]       = useState<{ text: string; ok: boolean } | null>(null);

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

  const persistPerson = async ({ displayName, relation, isSelf, isMinor, input }: { displayName: string; relation: Relation; isSelf: boolean; isMinor: boolean; input: BirthFormInput }) => {
    if (!userId) throw new Error("Please sign in first.");

    // Auto-geocode if city present but no coords yet (handles case where blur didn't fire)
    let finalInput = { ...input };
    if (input.precision === "exact" && input.birthPlace?.trim() && !input.lat && !input.lng) {
      const result = await geocodeCity(input.birthPlace, input.date ? new Date(`${input.date}T12:00:00Z`) : undefined);
      if (result) {
        finalInput = { ...finalInput, lat: String(result.lat), lng: String(result.lng) };
      }
    }

    const built = buildBirthInput(finalInput);
    const natal = computeNatalChart({ ...built.birth, houseSystem: "placidus" });

    const { data: person, error: personError } = await supabase.from("people").insert({
      owner_id: userId,
      is_self: isSelf,
      display_name: displayName.trim(),
      relation,
      is_minor: isMinor,
      birth_date: built.birthDate,
      birth_time: built.birthTime,
      birth_place: built.birthPlace,
      birth_precision: finalInput.precision,
      birth_lat: built.birth.lat,
      birth_lng: built.birth.lng
    }).select("id").single();

    if (personError || !person) throw new Error(personError?.message ?? "Failed to save person.");

    const { error: chartError } = await supabase.from("charts").upsert({ person_id: person.id, house_system: "placidus", data: natal, engine_version: 1 });
    if (chartError) throw new Error(chartError.message);

    return natal;
  };

  const saveSelf = async () => {
    setSavingSelf(true);
    setStatus(null);
    try {
      const natal = await persistPerson({ displayName: selfName, relation: "self", isSelf: true, isMinor: false, input: selfInput });
      await fetchPeople();
      const risingNote = natal.asc ? ` Rising: ${natal.asc}.` : selfInput.precision === "exact" ? " (No rising — add a birth city to unlock houses.)" : "";
      setStatus({ text: `Saved your chart.${risingNote}`, ok: true });
    } catch (error) {
      setStatus({ text: error instanceof Error ? error.message : "Unable to save.", ok: false });
    } finally {
      setSavingSelf(false);
    }
  };

  const savePerson = async () => {
    setSavingPerson(true);
    setStatus(null);
    try {
      if (people.length >= peopleLimit) {
        setStatus({ text: "Free tier: 5-person limit reached. Upgrade for unlimited.", ok: false });
        return;
      }
      await persistPerson({ displayName: personName, relation: personRelation, isSelf: false, isMinor: personMinor, input: personInput });
      setPersonName("");
      setPersonMinor(false);
      setPersonRelation("friend");
      setPersonInput(baseInput);
      await fetchPeople();
      setStatus({ text: `${personName} added to your constellation.`, ok: true });
    } catch (error) {
      setStatus({ text: error instanceof Error ? error.message : "Unable to add person.", ok: false });
    } finally {
      setSavingPerson(false);
    }
  };

  return (
    <main className="app-content">
      <p className="eyebrow">Onboarding</p>
      <h1 className="page-title">Build your constellation</h1>
      <p className="muted">Start with yourself at any precision level, then add the people at the center of your life.</p>
      <p style={{ color: "var(--gold-soft)", fontSize: 13 }}>
        {tier === "plus" ? "Galaxia+ · unlimited people" : `Free plan · ${5 - people.length} people remaining`}
      </p>

      {/* ── You first ── */}
      <section className="glass-card">
        <p className="eyebrow" style={{ marginBottom: 8 }}>You first</p>
        <input className="field" value={selfName} onChange={(e) => setSelfName(e.target.value)} placeholder="Your display name" style={{ marginBottom: 10 }} />
        <BirthFields input={selfInput} onChange={setSelfInput} />
        <button className="pill-link pill-link--gold" disabled={!canSaveSelf || savingSelf} onClick={saveSelf} style={{ marginTop: 12 }}>
          {savingSelf ? "Saving chart…" : "Save my profile"}
        </button>
      </section>

      {/* ── Add people ── */}
      <section className="glass-card">
        <p className="eyebrow" style={{ marginBottom: 8 }}>Add people</p>
        <input className="field" value={personName} onChange={(e) => setPersonName(e.target.value)} placeholder="Name" style={{ marginBottom: 10 }} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
          {relationOptions.map((r) => (
            <button key={r} type="button" className="pill-link" onClick={() => setPersonRelation(r)}
              style={{ fontSize: 13, padding: "7px 13px", borderColor: personRelation === r ? "var(--gold)" : "var(--line)", color: personRelation === r ? "var(--gold)" : "var(--mist)" }}>
              {r}
            </button>
          ))}
        </div>
        <label style={{ color: "var(--mist)", display: "flex", gap: 8, alignItems: "center", marginBottom: 10, cursor: "pointer" }}>
          <input type="checkbox" checked={personMinor} onChange={(e) => setPersonMinor(e.target.checked)} />
          This person is a minor
        </label>
        <BirthFields input={personInput} onChange={setPersonInput} />
        <button className="pill-link pill-link--gold" disabled={!canSavePerson || savingPerson} onClick={savePerson} style={{ marginTop: 12 }}>
          {savingPerson ? "Adding…" : "Add to constellation"}
        </button>
      </section>

      {/* Status */}
      {status ? <p className={status.ok ? "success" : "error"}>{status.text}</p> : null}

      {/* ── Current constellation ── */}
      {people.length > 0 ? (
        <section className="glass-card">
          <p className="eyebrow" style={{ marginBottom: 10 }}>Your constellation ({people.length})</p>
          <div style={{ display: "grid", gap: 8 }}>
            {people.map((p) => (
              <Link key={p.id} href={`/app/person/${p.id}`} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--line)", textDecoration: "none" }}>
                <InitialAvatar name={p.display_name} size="sm" />
                <div>
                  <span style={{ color: "var(--cream)", fontWeight: 600 }}>{p.display_name}</span>
                  <span className="muted" style={{ fontSize: 12, marginLeft: 8 }}>{p.relation} · {p.birth_precision}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Link className="pill-link pill-link--gold" href="/app">Open Galaxia Mea</Link>
        <Link className="pill-link" href="/app/groups">Groups & cohorts</Link>
      </div>
    </main>
  );
}

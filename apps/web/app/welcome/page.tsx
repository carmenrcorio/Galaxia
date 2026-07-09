"use client";

import { computeNatalChart, type Precision } from "@galaxia/astro";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CosmicBackground } from "../../components/cosmic-background";
import { CustomCheck } from "../../components/custom-check";
import { InitialAvatar } from "../../components/initial-avatar";
import { Spinner } from "../../components/spinner";
import { buildBirthInput, type BirthFormInput } from "../../lib/birth";
import { geocodeCity } from "../../lib/geocode";
import { createSupabaseBrowserClient } from "../../lib/supabase/client";

type Relation = "partner" | "child" | "parent" | "grandparent" | "sibling" | "friend" | "ancestor" | "self";

const precisionTiers: { key: Precision; label: string; unlocks: string }[] = [
  { key: "exact", label: "Exact", unlocks: "Full chart with houses, ascendant, and precise Moon details." },
  { key: "date", label: "Date only", unlocks: "Reliable planetary signs and generational layer." },
  { key: "year", label: "Year / decade", unlocks: "Generational layer and broad archetypal context." }
];

const relationOptions: Relation[] = ["partner", "child", "parent", "grandparent", "sibling", "friend", "ancestor"];

const baseInput: BirthFormInput = {
  precision: "date",
  date: "",
  time: "",
  year: "",
  birthPlace: "",
  lat: "",
  lng: "",
  tzOffsetMin: undefined
};

export default function WelcomePage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [userId, setUserId] = useState<string | null>(null);
  const [tier, setTier] = useState<"free" | "plus">("free");
  const [selfName, setSelfName] = useState("");
  const [selfInput, setSelfInput] = useState<BirthFormInput>(baseInput);
  const [personName, setPersonName] = useState("");
  const [personRelation, setPersonRelation] = useState<Relation>("friend");
  const [personMinor, setPersonMinor] = useState(false);
  const [personInput, setPersonInput] = useState<BirthFormInput>(baseInput);
  const [people, setPeople] = useState<Array<{ id: string; display_name: string; relation: string; birth_precision: string }>>([]);
  const [savingSelf, setSavingSelf] = useState(false);
  const [savingPerson, setSavingPerson] = useState(false);
  const [status, setStatus] = useState<{ text: string; ok: boolean } | null>(null);

  const peopleLimit = tier === "plus" ? Number.POSITIVE_INFINITY : 5;
  const canSaveSelf = selfName.trim().length > 1;
  const canSavePerson = personName.trim().length > 1;

  useEffect(() => {
    const load = async () => {
      const {
        data: { user }
      } = await supabase.auth.getUser();
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
    const { data } = await supabase
      .from("people")
      .select("id, display_name, relation, birth_precision")
      .eq("owner_id", userId)
      .order("created_at", { ascending: false });
    setPeople(data ?? []);
  };

  const persistPerson = async ({
    displayName,
    relation,
    isSelf,
    isMinor,
    input
  }: {
    displayName: string;
    relation: Relation;
    isSelf: boolean;
    isMinor: boolean;
    input: BirthFormInput;
  }) => {
    if (!userId) throw new Error("Please sign in first.");

    // Auto-geocode if city present but no coords yet.
    // This handles the case where the user typed a city but didn't wait for the blur geocode.
    let finalInput = { ...input };
    if (
      input.precision !== "year" &&
      input.birthPlace?.trim() &&
      (!input.lat || !input.lng)
    ) {
      const birthDateForTz = input.date ? new Date(`${input.date}T12:00:00Z`) : new Date();
      const geo = await geocodeCity(input.birthPlace, birthDateForTz);
      if (geo) {
        finalInput = {
          ...finalInput,
          lat: String(geo.lat),
          lng: String(geo.lng),
          tzOffsetMin: geo.tzOffset
        };
      }
    }

    const built = buildBirthInput(finalInput);
    const natal = computeNatalChart({ ...built.birth, houseSystem: "placidus" });

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
        birth_precision: finalInput.precision,
        birth_lat: built.birth.lat ?? null,
        birth_lng: built.birth.lng ?? null,
        tz_offset_min: built.tzOffsetMin ?? null,
      })
      .select("id")
      .single();

    if (personError || !person) throw new Error(personError?.message ?? "Failed to save person.");

    const { error: chartError } = await supabase.from("charts").upsert({
      person_id: person.id,
      house_system: "placidus",
      data: natal,
      engine_version: 1
    });
    if (chartError) throw new Error(chartError.message);
    return natal;
  };

  const saveSelf = async () => {
    setSavingSelf(true);
    setStatus(null);
    try {
      const savedChart = await persistPerson({ displayName: selfName, relation: "self", isSelf: true, isMinor: false, input: selfInput });
      await fetchPeople();
      const risingNote = savedChart?.asc
        ? ` Rising: ${savedChart.asc}.`
        : selfInput.precision === "exact"
          ? " (No rising yet — add a birth city to unlock houses.)"
          : "";
      setStatus({ text: `Saved your chart.${risingNote}`, ok: true });
    } catch (error) {
      setStatus({ text: error instanceof Error ? error.message : "Unable to save your profile.", ok: false });
    } finally {
      setSavingSelf(false);
    }
  };

  const savePerson = async () => {
    setSavingPerson(true);
    setStatus(null);
    try {
      if (people.length >= peopleLimit) {
        setStatus({ text: "Free plan: 5-person limit reached.", ok: false });
        return;
      }
      await persistPerson({
        displayName: personName,
        relation: personRelation,
        isSelf: false,
        isMinor: personMinor,
        input: personInput
      });
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

      <section className="glass-card fade-in">
        <p className="eyebrow">You first</p>
        <input className="field" value={selfName} onChange={(event) => setSelfName(event.target.value)} placeholder="Your display name" style={{ marginBottom: 12 }} />
        <BirthFields input={selfInput} onChange={setSelfInput} />
        <button className="btn-primary" style={{ marginTop: 14, gap: 8 }} disabled={!canSaveSelf || savingSelf} onClick={saveSelf}>
          {savingSelf && <Spinner size={13} color="#1a1206" />}
          {savingSelf ? "Saving chart…" : "Save my profile"}
        </button>
      </section>

      <section className="glass-card fade-in fade-in-delay-1">
        <p className="eyebrow">Add people</p>
        <input className="field" value={personName} onChange={(event) => setPersonName(event.target.value)} placeholder="Name" style={{ marginBottom: 10 }} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
          {relationOptions.map((relation) => (
            <button key={relation} className="pill-link" onClick={() => setPersonRelation(relation)}
              style={{ fontSize: 13, padding: "6px 13px", borderColor: personRelation === relation ? "rgba(230,174,108,.5)" : undefined, color: personRelation === relation ? "var(--gold)" : undefined }}>
              {relation}
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
            {people.map((p) => (
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

function BirthFields({ input, onChange }: { input: BirthFormInput; onChange: (next: BirthFormInput) => void }) {
  const [geocoding, setGeocoding] = useState(false);
  const [geoLabel,  setGeoLabel]  = useState<string | null>(null);

  const handleCityBlur = async () => {
    const city = input.birthPlace?.trim();
    if (!city || input.precision === "year") return;
    // Only geocode if coords not manually set already
    if (input.lat && input.lng) return;
    setGeocoding(true);
    setGeoLabel(null);
    const birthDateForTz = input.date ? new Date(`${input.date}T12:00:00Z`) : new Date();
    const geo = await geocodeCity(city, birthDateForTz);
    setGeocoding(false);
    if (geo) {
      onChange({ ...input, lat: String(geo.lat), lng: String(geo.lng), tzOffsetMin: geo.tzOffset });
      const short = geo.displayName.split(",").slice(0, 2).join(",");
      setGeoLabel(`✓ ${short}`);
    } else {
      setGeoLabel("City not found — enter coordinates manually below.");
    }
  };

  const hasCoords = Boolean(input.lat && input.lng);
  const noLocationWarning =
    input.precision === "exact" && !hasCoords && !input.birthPlace?.trim();

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {/* Precision selector */}
      <div style={{ display: "grid", gap: 6 }}>
        {precisionTiers.map((tier) => (
          <button
            key={tier.key} type="button" className="glass-card"
            onClick={() => onChange({ ...input, precision: tier.key })}
            style={{ textAlign: "left", cursor: "pointer", borderColor: input.precision === tier.key ? "var(--gold)" : "var(--line)", padding: "10px 14px" }}>
            <strong style={{ color: input.precision === tier.key ? "var(--gold)" : "var(--cream)", display: "block", marginBottom: 2 }}>{tier.label}</strong>
            <span className="muted" style={{ fontSize: ".8rem" }}>{tier.unlocks}</span>
          </button>
        ))}
      </div>

      {/* Date/time fields */}
      {input.precision === "year" ? (
        <input className="field" value={input.year}
          onChange={e => onChange({ ...input, year: e.target.value })}
          placeholder="Birth year (e.g. 1952)" />
      ) : (
        <>
          <input className="field" value={input.date}
            onChange={e => onChange({ ...input, date: e.target.value })}
            placeholder="Birth date (YYYY-MM-DD)" />
          {input.precision === "exact" ? (
            <input className="field" value={input.time}
              onChange={e => onChange({ ...input, time: e.target.value })}
              placeholder="Birth time (HH:MM — 24h, local time at birth place)" />
          ) : null}
        </>
      )}

      {/* City field with geocode-on-blur */}
      {input.precision !== "year" ? (
        <div>
          <input
            className="field"
            value={input.birthPlace ?? ""}
            onChange={e => onChange({ ...input, birthPlace: e.target.value, lat: "", lng: "", tzOffsetMin: undefined })}
            onBlur={handleCityBlur}
            placeholder={input.precision === "exact"
              ? "Birth city — required for rising sign & houses"
              : "Birth city (optional)"}
          />
          {geocoding ? (
            <p className="muted" style={{ fontSize: ".74rem", marginTop: 4 }}>Looking up location…</p>
          ) : geoLabel ? (
            <p style={{ fontSize: ".74rem", marginTop: 4, color: geoLabel.startsWith("✓") ? "var(--teal)" : "var(--rose)" }}>{geoLabel}</p>
          ) : null}
          {noLocationWarning ? (
            <p className="error" style={{ fontSize: ".74rem", marginTop: 4 }}>
              Exact time without a birth city: houses and rising sign won't compute. Enter a city above.
            </p>
          ) : null}
          {hasCoords ? (
            <p className="muted" style={{ fontSize: ".72rem", marginTop: 2 }}>
              {input.tzOffsetMin !== undefined
                ? `Coordinates resolved · UTC${input.tzOffsetMin >= 0 ? "+" : ""}${input.tzOffsetMin / 60}h at birth`
                : "Coordinates set manually"}
            </p>
          ) : null}
        </div>
      ) : null}

      {/* Manual coordinate override (collapsed by default) */}
      {input.precision !== "year" ? (
        <details style={{ color: "var(--mist2)", fontSize: ".78rem" }}>
          <summary style={{ cursor: "pointer" }}>Enter coordinates manually</summary>
          <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
            <input className="field" value={input.lat ?? ""}
              onChange={e => onChange({ ...input, lat: e.target.value })}
              placeholder="Latitude (e.g. 40.7128)" />
            <input className="field" value={input.lng ?? ""}
              onChange={e => onChange({ ...input, lng: e.target.value })}
              placeholder="Longitude (e.g. -74.0060)" />
          </div>
        </details>
      ) : null}
    </div>
  );
}

"use client";

import { computeNatalChart, type Precision } from "@galaxia/astro";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { buildBirthInput, type BirthFormInput } from "../../lib/birth";
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
  lat: "",
  lng: ""
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
  const [status, setStatus] = useState<string | null>(null);

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
    const built = buildBirthInput(input);
    const natal = computeNatalChart({
      ...built.birth,
      houseSystem: "placidus"
    });

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
        birth_precision: input.precision,
        birth_lat: built.birth.lat,
        birth_lng: built.birth.lng
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
  };

  const saveSelf = async () => {
    setSavingSelf(true);
    setStatus(null);
    try {
      await persistPerson({ displayName: selfName, relation: "self", isSelf: true, isMinor: false, input: selfInput });
      await fetchPeople();
      setStatus("Saved your profile and natal chart.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to save your profile.");
    } finally {
      setSavingSelf(false);
    }
  };

  const savePerson = async () => {
    setSavingPerson(true);
    setStatus(null);
    try {
      if (people.length >= peopleLimit) {
        setStatus(`Free tier limit reached (5 people). Upgrade in settings for unlimited people.`);
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
      setStatus("Person added to your constellation.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to add person.");
    } finally {
      setSavingPerson(false);
    }
  };

  return (
    <main className="container" style={{ padding: "40px 0 80px", display: "grid", gap: 18 }}>
      <h1 className="auth-title">Welcome to Galaxia</h1>
      <p className="muted">Start with yourself, then add people at exact/date/year precision so `/app` is never empty.</p>
      <p style={{ color: "var(--gold-soft)" }}>
        Plan: {tier === "plus" ? "Galaxia+" : "Free"} · {tier === "plus" ? "unlimited people" : "5 people max"}
      </p>

      <section className="glass-card">
        <h2 style={{ marginTop: 0 }}>You first</h2>
        <input className="field" value={selfName} onChange={(event) => setSelfName(event.target.value)} placeholder="Your display name" />
        <BirthFields input={selfInput} onChange={setSelfInput} />
        <button className="pill-link pill-link--gold" disabled={!canSaveSelf || savingSelf} onClick={saveSelf}>
          {savingSelf ? "Saving..." : "Save your profile"}
        </button>
      </section>

      <section className="glass-card">
        <h2 style={{ marginTop: 0 }}>Add people</h2>
        <input className="field" value={personName} onChange={(event) => setPersonName(event.target.value)} placeholder="Person name" />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {relationOptions.map((relation) => (
            <button key={relation} className="pill-link" onClick={() => setPersonRelation(relation)} style={{ borderColor: personRelation === relation ? "var(--gold)" : "var(--line)" }}>
              {relation}
            </button>
          ))}
        </div>
        <label style={{ color: "var(--mist)", display: "flex", gap: 8, alignItems: "center" }}>
          <input type="checkbox" checked={personMinor} onChange={(event) => setPersonMinor(event.target.checked)} />
          This person is a minor
        </label>
        <BirthFields input={personInput} onChange={setPersonInput} />
        <button className="pill-link pill-link--gold" disabled={!canSavePerson || savingPerson} onClick={savePerson}>
          {savingPerson ? "Saving..." : "Add person"}
        </button>
      </section>

      {status ? <p className="success">{status}</p> : null}

      <section className="glass-card">
        <h2 style={{ marginTop: 0 }}>Your constellation</h2>
        {people.length === 0 ? <p className="muted">No people yet. Start with yourself, then add your first relationship.</p> : null}
        <div style={{ display: "grid", gap: 8 }}>
          {people.map((person) => (
            <Link key={person.id} href={`/app/person/${person.id}`} className="glass-card" style={{ padding: 12 }}>
              <strong>{person.display_name}</strong>
              <div className="muted">
                {person.relation} · {person.birth_precision}
              </div>
            </Link>
          ))}
        </div>
      </section>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Link className="pill-link pill-link--gold" href="/app">
          Continue to Galaxia Mea
        </Link>
        <Link className="pill-link" href="/app/groups">
          Groups
        </Link>
      </div>
    </main>
  );
}

function BirthFields({ input, onChange }: { input: BirthFormInput; onChange: (next: BirthFormInput) => void }) {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "grid", gap: 8 }}>
        {precisionTiers.map((tier) => (
          <button key={tier.key} className="glass-card" onClick={() => onChange({ ...input, precision: tier.key })} style={{ textAlign: "left", borderColor: input.precision === tier.key ? "var(--gold)" : "var(--line)" }}>
            <strong style={{ color: input.precision === tier.key ? "var(--gold)" : "var(--cream)" }}>{tier.label}</strong>
            <p className="muted" style={{ margin: "4px 0 0" }}>
              {tier.unlocks}
            </p>
          </button>
        ))}
      </div>
      {input.precision === "year" ? (
        <input className="field" value={input.year} onChange={(event) => onChange({ ...input, year: event.target.value })} placeholder="Birth year (e.g. 1995)" />
      ) : (
        <>
          <input className="field" value={input.date} onChange={(event) => onChange({ ...input, date: event.target.value })} placeholder="Birth date (YYYY-MM-DD)" />
          {input.precision === "exact" ? (
            <input className="field" value={input.time} onChange={(event) => onChange({ ...input, time: event.target.value })} placeholder="Birth time (HH:MM 24h)" />
          ) : null}
        </>
      )}
      <input className="field" value={input.lat ?? ""} onChange={(event) => onChange({ ...input, lat: event.target.value })} placeholder="Latitude (optional)" />
      <input className="field" value={input.lng ?? ""} onChange={(event) => onChange({ ...input, lng: event.target.value })} placeholder="Longitude (optional)" />
    </div>
  );
}

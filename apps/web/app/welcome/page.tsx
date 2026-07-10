"use client";

import { computeNatalChart } from "@galaxia/astro";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BASE_BIRTH_INPUT, BirthFields } from "../../components/birth-fields";
import { CosmicBackground } from "../../components/cosmic-background";
import { CustomCheck } from "../../components/custom-check";
import { InitialAvatar } from "../../components/initial-avatar";
import { Spinner } from "../../components/spinner";
import { buildBirthInput, formatDateForConfirmation, type BirthFormInput } from "../../lib/birth";
import { CHART_ENGINE_VERSION, getPreferredHouseSystem } from "../../lib/house-system";
import { decodeBirthQuery } from "../../lib/quick-chart";
import { createSupabaseBrowserClient } from "../../lib/supabase/client";

type Relation = "partner" | "child" | "parent" | "grandparent" | "sibling" | "friend" | "ancestor" | "self";

const relationOptions: Relation[] = ["partner", "child", "parent", "grandparent", "sibling", "friend", "ancestor"];

const baseInput: BirthFormInput = BASE_BIRTH_INPUT;


/* ─── WelcomePage ─────────────────────────────────────────────────────────── */
export default function WelcomePage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [userId, setUserId]     = useState<string | null>(null);
  const [selfName, setSelfName] = useState("");
  const [selfInput, setSelfInput] = useState<BirthFormInput>(baseInput);
  const [personName, setPersonName]   = useState("");
  const [personRelation, setPersonRelation] = useState<Relation>("friend");
  const [personMinor, setPersonMinor] = useState(false);
  const [personInput, setPersonInput] = useState<BirthFormInput>(baseInput);
  const [people, setPeople]     = useState<Array<{ id: string; display_name: string; relation: string; birth_precision: string; is_self: boolean }>>([]);
  const [savingSelf, setSavingSelf]     = useState(false);
  const [savingPerson, setSavingPerson] = useState(false);
  const [status, setStatus] = useState<{ text: string; ok: boolean } | null>(null);

  // No people cap. Value compounds with every person added; nothing is gated.
  const canSaveSelf   = selfName.trim().length > 1;
  const canSavePerson = personName.trim().length > 1;

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data: peopleRows } = await supabase.from("people").select("id, display_name, relation, birth_precision, is_self").eq("owner_id", user.id).order("created_at", { ascending: false });
      setPeople(peopleRows ?? []);
    };
    void load();
  }, [supabase]);

  // Quick Chart hand-off: /chart's "Save to your galaxy" (signed-out path)
  // sends the visitor through /signup?next=/welcome?prefill=...&name=...
  // Prefill only — never auto-submitted, always reviewed and confirmed here.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const prefill = decodeBirthQuery(params);
    if (!prefill) return;
    const name = params.get("name");
    if (name) setPersonName(name);
    setPersonInput(prefill);
  }, []);

  const fetchPeople = async () => {
    if (!userId) return;
    const { data } = await supabase.from("people").select("id, display_name, relation, birth_precision, is_self").eq("owner_id", userId).order("created_at", { ascending: false });
    setPeople(data ?? []);
  };

  // BUG A: never show the create-self form to someone who already has a self.
  const selfPerson = people.find(p => p.is_self) ?? null;

  const persistPerson = async ({
    displayName, relation, isSelf, isMinor, input
  }: {
    displayName: string; relation: Relation; isSelf: boolean; isMinor: boolean; input: BirthFormInput;
  }) => {
    if (!userId) throw new Error("Please sign in first.");

    // ── Progressive capture: name + relation only, no birth data yet ────────
    if (input.precision === "none") {
      const { error: personError } = await supabase
        .from("people")
        .insert({
          owner_id: userId, is_self: isSelf, display_name: displayName.trim(),
          relation, is_minor: isMinor, birth_precision: "none",
          birth_date: null, birth_time: null, birth_place: null,
          birth_lat: null, birth_lng: null, tz_offset_min: null,
        });
      if (personError) throw new Error(personError.message);
      return null; // no chart computed — none exists yet
    }

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
    // BUG A: never create a second self-profile.
    if (selfPerson) { setStatus({ text: "You're already in your sky. Edit your profile from your chart.", ok: false }); return; }
    setSavingSelf(true); setStatus(null);
    try {
      const natal = await persistPerson({ displayName: selfName, relation: "self", isSelf: true, isMinor: false, input: selfInput });
      await fetchPeople();
      const risingNote = natal?.asc ? ` Rising: ${natal.asc}.` : selfInput.precision === "exact" ? " (No rising — resolve a birth city to unlock houses.)" : "";
      setStatus({ text: `Saved your chart.${risingNote}`, ok: true });
    } catch (error) {
      setStatus({ text: error instanceof Error ? error.message : "Unable to save.", ok: false });
    } finally { setSavingSelf(false); }
  };

  const savePerson = async () => {
    setSavingPerson(true); setStatus(null);
    try {
      const deferred = personInput.precision === "none";
      await persistPerson({ displayName: personName, relation: personRelation, isSelf: false, isMinor: personMinor, input: personInput });
      const savedName = personName;
      setPersonName(""); setPersonMinor(false); setPersonRelation("friend"); setPersonInput(baseInput);
      await fetchPeople();
      setStatus({
        text: deferred
          ? `${savedName} added — open their profile to add birth data, or ask them for it, whenever you're ready.`
          : `${savedName} added to your constellation.`,
        ok: true
      });
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
        </div>

        {/* You first — but never offer to create a second self (BUG A) */}
        {selfPerson ? (
          <section className="glass-card fade-in">
            <p className="eyebrow">You're in your sky</p>
            <p className="muted" style={{ margin: "6px 0 12px" }}>
              You've already added yourself as <strong style={{ color: "var(--cream)" }}>{selfPerson.display_name}</strong>. Edit your birth data from your chart — no need to add yourself again.
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Link href={`/app/person/${selfPerson.id}`} className="btn-primary">View / edit my chart</Link>
              <Link href="/app" className="pill-link">Open Galaxia Mea</Link>
            </div>
          </section>
        ) : (
          <section className="glass-card fade-in">
            <p className="eyebrow">You first</p>
            <input className="field" value={selfName} onChange={e => setSelfName(e.target.value)} placeholder="Your display name" style={{ marginBottom: 12, borderRadius: 14 }} />
            <BirthFields input={selfInput} onChange={setSelfInput} />
            <button className="btn-primary" style={{ marginTop: 14, gap: 8 }} disabled={!canSaveSelf || savingSelf} onClick={saveSelf}>
              {savingSelf && <Spinner size={13} color="#1a1206" />}
              {savingSelf ? "Saving chart…" : "Save my profile"}
            </button>
          </section>
        )}

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
          <BirthFields input={personInput} onChange={setPersonInput} allowNone />
          <button className="btn-primary" style={{ marginTop: 14, gap: 8 }} disabled={!canSavePerson || savingPerson} onClick={savePerson}>
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

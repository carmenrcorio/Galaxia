"use client";

import { computeNatalChart } from "@galaxia/astro";
import { useState } from "react";
import { type BirthFormInput, buildBirthInput } from "../lib/birth";
import { geocodeCity } from "../lib/geocode";
import { createSupabaseBrowserClient } from "../lib/supabase/client";

interface PersonRow {
  id: string;
  display_name: string;
  relation: string;
  is_minor: boolean;
  birth_precision: "exact" | "date" | "year";
  birth_date?: string | null;
  birth_time?: string | null;
  birth_place?: string | null;
  birth_lat?: number | null;
  birth_lng?: number | null;
}

interface Props {
  person: PersonRow;
  userId: string;
  onSaved: () => void;
  onDeleted: () => void;
}

export function EditPersonPanel({ person, userId, onSaved, onDeleted }: Props) {
  const supabase = createSupabaseBrowserClient();
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState(person.display_name);
  const [relation, setRelation]     = useState(person.relation);
  const [isMinor, setIsMinor]       = useState(person.is_minor);
  const [input, setInput] = useState<BirthFormInput>({
    precision: person.birth_precision,
    date: person.birth_date?.slice(0, 10) ?? "",
    time: person.birth_time?.slice(0, 5) ?? "",
    year: person.birth_precision === "year" ? (person.birth_date?.slice(0, 4) ?? "") : "",
    birthPlace: person.birth_place ?? "",
    lat: person.birth_lat != null ? String(person.birth_lat) : "",
    lng: person.birth_lng != null ? String(person.birth_lng) : ""
  });

  async function save() {
    if (!displayName.trim()) { setStatus("Name is required."); return; }
    setSaving(true);
    setStatus(null);
    try {
      let finalInput = { ...input };
      // re-geocode if city changed but no coords
      if (input.precision === "exact" && input.birthPlace?.trim() && !input.lat && !input.lng) {
        const geo = await geocodeCity(input.birthPlace);
        if (geo) finalInput = { ...finalInput, lat: String(geo.lat), lng: String(geo.lng) };
      }

      const built = buildBirthInput(finalInput);
      const natal = computeNatalChart({ ...built.birth, houseSystem: "placidus" });

      const { error: pErr } = await supabase.from("people").update({
        display_name: displayName.trim(),
        relation,
        is_minor: isMinor,
        birth_date: built.birthDate,
        birth_time: built.birthTime,
        birth_place: built.birthPlace,
        birth_precision: finalInput.precision,
        birth_lat: built.birth.lat ?? null,
        birth_lng: built.birth.lng ?? null
      }).eq("id", person.id).eq("owner_id", userId);

      if (pErr) throw new Error(pErr.message);

      const { error: cErr } = await supabase.from("charts").upsert({ person_id: person.id, house_system: "placidus", data: natal, engine_version: 1 });
      if (cErr) throw new Error(cErr.message);

      setStatus("Saved and chart recomputed.");
      setOpen(false);
      onSaved();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Unable to save.");
    } finally {
      setSaving(false);
    }
  }

  async function deletePerson() {
    setDeleting(true);
    // Delete notes, chart, then person (FK cascades handle most but notes may not)
    await supabase.from("notes").delete().eq("about_person", person.id);
    await supabase.from("group_members").delete().eq("person_id", person.id);
    await supabase.from("charts").delete().eq("person_id", person.id);
    const { error } = await supabase.from("people").delete().eq("id", person.id).eq("owner_id", userId);
    setDeleting(false);
    if (error) { setStatus(error.message); return; }
    onDeleted();
  }

  if (!open) {
    return (
      <button className="pill-link" onClick={() => setOpen(true)} style={{ fontSize: 13 }}>
        Edit / delete
      </button>
    );
  }

  return (
    <section className="glass-card" style={{ marginTop: 8 }}>
      <p className="eyebrow" style={{ marginBottom: 10 }}>Edit profile</p>
      <div style={{ display: "grid", gap: 10 }}>
        <input className="field" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Display name" />
        <input className="field" value={relation} onChange={(e) => setRelation(e.target.value)} placeholder="Relation (partner, sibling…)" />
        <label style={{ color: "var(--mist)", display: "flex", gap: 8, alignItems: "center", cursor: "pointer" }}>
          <input type="checkbox" checked={isMinor} onChange={(e) => setIsMinor(e.target.checked)} />
          Minor
        </label>

        {/* Precision selector */}
        <div style={{ display: "flex", gap: 6 }}>
          {(["exact","date","year"] as const).map((p) => (
            <button key={p} className="pill-link" style={{ fontSize: 12, borderColor: input.precision === p ? "var(--gold)" : "var(--line)" }}
              onClick={() => setInput((prev) => ({ ...prev, precision: p }))}>
              {p}
            </button>
          ))}
        </div>

        {input.precision === "year"
          ? <input className="field" value={input.year} onChange={(e) => setInput((prev) => ({ ...prev, year: e.target.value }))} placeholder="Birth year (YYYY)" />
          : <>
              <input className="field" value={input.date} onChange={(e) => setInput((prev) => ({ ...prev, date: e.target.value, lat: "", lng: "" }))} placeholder="Birth date (YYYY-MM-DD)" />
              {input.precision === "exact"
                ? <input className="field" value={input.time} onChange={(e) => setInput((prev) => ({ ...prev, time: e.target.value }))} placeholder="Birth time (HH:MM)" />
                : null}
            </>}

        <input className="field" value={input.birthPlace ?? ""}
          onChange={(e) => setInput((prev) => ({ ...prev, birthPlace: e.target.value, lat: "", lng: "" }))}
          placeholder="Birth city (geocoded on save)" />
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        <button className="pill-link pill-link--gold" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </button>
        <button className="pill-link" onClick={() => setOpen(false)}>Cancel</button>
        {!confirmDelete
          ? <button className="pill-link" style={{ borderColor: "var(--rose)", color: "var(--rose)" }} onClick={() => setConfirmDelete(true)}>Delete person</button>
          : <>
              <button className="pill-link" style={{ background: "var(--rose)", border: "none", color: "var(--cream)" }} onClick={deletePerson} disabled={deleting}>
                {deleting ? "Deleting…" : "Confirm delete"}
              </button>
              <button className="pill-link" onClick={() => setConfirmDelete(false)}>Cancel</button>
            </>}
      </div>
      {status ? <p className={status.includes("aved") ? "success" : "error"} style={{ marginTop: 8, fontSize: 13 }}>{status}</p> : null}
    </section>
  );
}

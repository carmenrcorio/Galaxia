"use client";

import {
  computeNatalChart,
  buildBirthInput,
  type BirthFormInput,
} from "@galaxia/astro";
import { isMinorForSafety } from "@galaxia/core";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CHART_ENGINE_VERSION, getPreferredHouseSystem } from "../lib/house-system";
import { buildWelcomePrefillPath } from "../lib/quick-chart";
import { createSupabaseBrowserClient } from "../lib/supabase/client";
import { Spinner } from "./spinner";

const RELATIONS = ["partner", "child", "parent", "grandparent", "sibling", "friend", "ancestor"] as const;

/**
 * The Quick Chart "Save to your galaxy" CTA.
 *
 * Logged in: saves the person now (name/relation confirmed inline), using the
 * SAME buildBirthInput + computeNatalChart pipeline every other add-person
 * flow uses, respecting the owner's house-system preference.
 *
 * Logged out: links to /signup?next=/welcome?prefill=...&name=... — the birth
 * data (and, only for this one-time redirect, the typed name) travels through
 * signup and lands pre-filled in the /welcome "Add person" form. Nothing is
 * written to the database until the user reviews and saves it there.
 */
export function SaveToGalaxyButton({
  birthInput, defaultName
}: { birthInput: BirthFormInput; defaultName?: string }) {
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(defaultName ?? "");
  const [relation, setRelation] = useState<typeof RELATIONS[number]>("friend");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedPersonId, setSavedPersonId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null);
      setCheckingAuth(false);
    });
  }, []);

  useEffect(() => { if (defaultName) setName(defaultName); }, [defaultName]);

  async function save() {
    if (!userId || !name.trim()) return;
    setSaving(true); setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const built = buildBirthInput(birthInput);
      const houseSystem = await getPreferredHouseSystem(supabase, userId);
      const natal = computeNatalChart({ ...built.birth, houseSystem });

      // This flow has no minor checkbox at all — the age backstop is the
      // ONLY protection a child saved here gets, so it must run on save.
      const effectiveIsMinor = isMinorForSafety({ isMinor: false, birthDate: built.birthDate, birthPrecision: birthInput.precision });

      const { data: person, error: pErr } = await supabase.from("people").insert({
        owner_id: userId, is_self: false, display_name: name.trim(), relation, is_minor: effectiveIsMinor,
        birth_date: built.birthDate, birth_time: built.birthTime, birth_place: built.birthPlace,
        birth_precision: birthInput.precision,
        birth_lat: built.birth.lat ?? null, birth_lng: built.birth.lng ?? null,
        tz_offset_min: built.tzOffsetMin ?? null,
      }).select("id").single();
      if (pErr || !person) throw new Error(pErr?.message ?? "Failed to save.");

      const { error: cErr } = await supabase.from("charts").upsert({
        person_id: person.id, house_system: natal.houseSystem ?? null, data: natal, engine_version: CHART_ENGINE_VERSION
      });
      if (cErr) throw new Error(cErr.message);

      setSavedPersonId(person.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save.");
    } finally {
      setSaving(false);
    }
  }

  if (checkingAuth) return null;

  if (savedPersonId) {
    return (
      <div style={{ textAlign: "center" }}>
        <p style={{ color: "var(--teal)", fontSize: ".88rem", marginBottom: 8 }}>✦ {name} is in your galaxy.</p>
        <Link href={`/app/person/${savedPersonId}`} className="pill-link">View their profile</Link>
      </div>
    );
  }

  if (!userId) {
    const label = defaultName ? `Save ${defaultName} to your galaxy` : "Save to your galaxy";
    return (
      <Link href={`/signup?next=${encodeURIComponent(buildWelcomePrefillPath(birthInput, defaultName))}`} className="btn-primary">
        {label}
      </Link>
    );
  }

  if (!open) {
    return (
      <button type="button" className="btn-primary" onClick={() => setOpen(true)}>
        {defaultName ? `Save ${defaultName} to your galaxy` : "Save to your galaxy"}
      </button>
    );
  }

  return (
    <div className="glass-card" style={{ maxWidth: 380, margin: "0 auto", display: "grid", gap: 10 }}>
      <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Their name" />
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {RELATIONS.map((r) => (
          <button key={r} type="button" className="pill-link" onClick={() => setRelation(r)}
            style={{ fontSize: ".78rem", padding: "5px 11px", borderColor: relation === r ? "rgba(230,174,108,.5)" : undefined, color: relation === r ? "var(--gold)" : undefined }}>
            {r}
          </button>
        ))}
      </div>
      <button className="btn-primary" onClick={save} disabled={saving || !name.trim()} style={{ gap: 8 }}>
        {saving && <Spinner size={13} color="#1a1206" />}
        {saving ? "Saving…" : "Confirm save"}
      </button>
      {error ? <p className="error" style={{ fontSize: ".8rem" }}>{error}</p> : null}
    </div>
  );
}

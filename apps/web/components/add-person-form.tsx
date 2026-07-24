"use client";

import { type BirthFormInput } from "@galaxia/astro";
import { GALAXY_RELATION_PICKER_OPTIONS, type GalaxyPickerRelation } from "@galaxia/core";
import { useEffect, useMemo, useState } from "react";
import { BASE_BIRTH_INPUT, BirthFields } from "./birth-fields";
import { CustomCheck } from "./custom-check";
import { Spinner } from "./spinner";
import { persistPerson } from "../lib/persist-person";
import { createSupabaseBrowserClient } from "../lib/supabase/client";

// FOUNDER-REVIEW: picker labels — refine voice before merge.
const relationOptions = GALAXY_RELATION_PICKER_OPTIONS;

// Shared field copy — used by onboarding step 2 and the standalone add-person
// page. Onboarding may wrap this form with its own titles / precision callout;
// this component never renders onboarding chrome or step progress.
// FOUNDER-REVIEW: authored minor-safety copy — refine voice.
const FIELD_COPY = {
  minorLabel: "This person is a minor (under 18)",
  minorExplain:
    "If you're adding a child, check this. Galaxia keeps guidance about a minor private to you — there's never any two-way AI chat with a child. As a backstop, we also protect anyone whose birth date shows they're under 18 even if this is left unchecked, but checking it makes your intent clear from the start."
};

export type AddPersonSavedInfo = {
  displayName: string;
  deferred: boolean;
  personId: string;
};

export type AddPersonFormProps = {
  userId: string;
  /** Prefill (e.g. Quick Chart → welcome hand-off). */
  initialName?: string;
  initialBirth?: BirthFormInput;
  initialRelation?: GalaxyPickerRelation;
  submitLabel?: string;
  savingLabel?: string;
  /** When false, parent owns status messaging via onSaved / onError. Default true. */
  showStatus?: boolean;
  onSaved?: (info: AddPersonSavedInfo) => void;
  onError?: (message: string) => void;
};

/**
 * Shared add-person fields: name, relation, minor, birth details.
 * Mounted by /welcome step 2 (inside onboarding chrome) and by the standalone
 * /app/add-person page (no onboarding framing). Keep field UX here so the two
 * entry points cannot drift.
 */
export function AddPersonForm({
  userId,
  initialName = "",
  initialBirth,
  initialRelation = "friend",
  submitLabel = "Add to constellation",
  savingLabel = "Adding…",
  showStatus = true,
  onSaved,
  onError
}: AddPersonFormProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [name, setName] = useState(initialName);
  const [relation, setRelation] = useState<GalaxyPickerRelation>(initialRelation);
  const [minor, setMinor] = useState(false);
  const [birth, setBirth] = useState<BirthFormInput>(initialBirth ?? BASE_BIRTH_INPUT);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    if (initialName) setName(initialName);
  }, [initialName]);

  useEffect(() => {
    if (initialBirth) setBirth(initialBirth);
  }, [initialBirth]);

  useEffect(() => {
    setRelation(initialRelation);
  }, [initialRelation]);

  const canSave = name.trim().length > 1;

  const save = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const deferred = birth.precision === "none";
      const { personId } = await persistPerson(supabase, {
        userId,
        displayName: name,
        relation,
        isSelf: false,
        isMinor: minor,
        input: birth
      });
      const savedName = name.trim();
      setName("");
      setMinor(false);
      setRelation("friend");
      setBirth(BASE_BIRTH_INPUT);
      const info: AddPersonSavedInfo = { displayName: savedName, deferred, personId };
      if (showStatus) {
        setStatus({
          text: deferred
            ? `${savedName} is in your sky — open their profile to add a date, or ask them, whenever you're ready.`
            : `${savedName} is in your constellation.`,
          ok: true
        });
      }
      onSaved?.(info);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to add person.";
      if (showStatus) setStatus({ text: message, ok: false });
      onError?.(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <input
        className="field"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Their name"
        style={{ marginBottom: 10, borderRadius: 14 }}
      />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
        {relationOptions.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            className="pill-link"
            onClick={() => setRelation(value)}
            style={{
              fontSize: 13,
              padding: "6px 13px",
              borderColor: relation === value ? "rgba(230,174,108,.5)" : undefined,
              color: relation === value ? "var(--gold)" : undefined
            }}
          >
            {/* FOUNDER-REVIEW: picker label */}
            {label}
          </button>
        ))}
      </div>

      {/* Minor: checkbox + a clearly visible explanation (§9). The
          age backstop protects regardless, but the intent is made
          explicit here, especially when adding a child. */}
      <div style={{ marginBottom: 12 }}>
        <CustomCheck checked={minor} onChange={setMinor} label={FIELD_COPY.minorLabel} />
        <p className="muted" style={{ fontSize: ".74rem", marginTop: 6, lineHeight: 1.5 }}>
          {FIELD_COPY.minorExplain}
        </p>
      </div>

      <BirthFields input={birth} onChange={setBirth} allowNone />
      <button
        className="btn-primary"
        style={{ marginTop: 14, gap: 8 }}
        disabled={!canSave || saving}
        onClick={() => void save()}
      >
        {saving && <Spinner size={13} color="#1a1206" />}
        {saving ? savingLabel : submitLabel}
      </button>

      {showStatus && status ? <p className={status.ok ? "success" : "error"}>{status.text}</p> : null}
    </>
  );
}

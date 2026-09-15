"use client";

/**
 * Person-page picker for declared constellation lines (partner, family,
 * friend, colleague, chosen, other). Remembrance stays on HonorDeclarationBox.
 * Writes relationships rows; the galaxy draws them. Collapsed by default.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Spinner } from "./spinner";
import { createSupabaseBrowserClient } from "../lib/supabase/client";
import {
  DECLARED_BOND_LABELS,
  DECLARED_BOND_TYPES,
  DEFAULT_FETCH_TIMEOUT_MS,
  buildRelationshipInsert,
  canonicalRelationshipPair,
  declaredBondExists,
  declaredBondsFromRows,
  partnerBondAllowed,
  withTimeout,
  type DeclaredBond,
  type DeclaredBondType,
  type HonorPerson,
} from "@galaxia/core";

export const RELATIONSHIP_EDGES_ANCHOR_ID = "relationship-edges";

export const RELATIONSHIP_PICKER_COPY = {
  eyebrow: "Lines on the constellation",
  lede:
    "Choose someone in your galaxy and the kind of bond. The line is only drawn when you add it.",
  remembranceNote:
    "Remembrance light is chosen separately, under who carries their light.",
  emptyGalaxy:
    "Add someone else to your galaxy first. Then you can draw a line here.",
  noneYet: "No lines yet. Nothing is guessed.",
  loading: "Loading the lines on this constellation.",
  personLabel: "Someone in your galaxy",
  typeLabel: "Kind of bond",
  personPlaceholder: "Choose a person",
  add: "Draw this line",
  adding: "Drawing…",
  remove: "Remove",
  saved: "Saved. The line will show on your constellation.",
  removed: "Removed. You can add it again anytime.",
  duplicate: "That line is already on the constellation.",
  self: "A line cannot connect a person to themselves.",
  loadError: "The lines on this constellation could not load. Try again.",
  saveError: "This constellation line could not be saved. Try again.",
  removeError: "This constellation line could not be removed. Try again.",
  partnerRefuse:
    "Partner is a bond between two adults. It is not drawn when either person is under 18. Family, friend, colleague, chosen, or other still can be.",
} as const;

interface RelationshipPersonInput {
  id: string;
  display_name: string;
  is_self?: boolean;
  is_minor?: boolean | null;
  birth_date?: string | null;
  birth_precision?: HonorPerson["birth_precision"];
}

export function RelationshipEdgesBox({
  person,
  userId,
  subjectIsMinor,
  showRemembranceNote,
}: {
  person: RelationshipPersonInput;
  userId: string;
  /** From isMinorForSafety, never raw is_minor. */
  subjectIsMinor: boolean;
  showRemembranceNote?: boolean;
}) {
  const [supabase] = useState(() => createSupabaseBrowserClient());
  const [people, setPeople] = useState<HonorPerson[]>([]);
  const [bonds, setBonds] = useState<DeclaredBond[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [otherId, setOtherId] = useState("");
  const [relationType, setRelationType] = useState<DeclaredBondType>("friend");

  const loadEdges = useCallback(async () => {
    if (!userId || !person.id) return;
    setLoading(true);
    setLoadFailed(false);
    setStatus(null);
    try {
      await withTimeout((async () => {
    const [{ data: peopleRows, error: peopleErr }, { data: relRows, error: relErr }] =
      await Promise.all([
        supabase
          .from("people")
          .select("id, display_name, is_self, is_minor, birth_date, birth_precision, passed_at")
          .eq("owner_id", userId)
          .order("created_at", { ascending: true }),
        supabase
          .from("relationships")
          .select("id, person_a, person_b, relation_type")
          .eq("owner_id", userId),
      ]);
    if (peopleErr || relErr) {
      throw new Error("load");
    }
    const nextPeople = (peopleRows ?? []) as HonorPerson[];
    setPeople(nextPeople);
    setBonds(
      declaredBondsFromRows(
        (relRows ?? []) as Array<{ person_a: string; person_b: string; relation_type: string }>,
        person.id
      )
    );
      })(), DEFAULT_FETCH_TIMEOUT_MS);
    } catch {
      setStatus(RELATIONSHIP_PICKER_COPY.loadError);
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, [supabase, userId, person.id]);

  useEffect(() => {
    void loadEdges();
  }, [loadEdges]);

  const candidates = useMemo(
    () => people.filter((p) => p.id !== person.id),
    [people, person.id]
  );
  const peopleById = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const selectedOther = otherId ? peopleById.get(otherId) : undefined;
  const partnerBlocked =
    relationType === "partner" &&
    (subjectIsMinor ||
      (selectedOther
        ? !partnerBondAllowed(
            {
              isMinor: person.is_minor === true || subjectIsMinor,
              birthDate: person.birth_date,
              birthPrecision: person.birth_precision,
            },
            {
              isMinor: selectedOther.is_minor,
              birthDate: selectedOther.birth_date,
              birthPrecision: selectedOther.birth_precision,
            }
          )
        : false));
  const alreadyDrawn =
    Boolean(otherId) && declaredBondExists(bonds, otherId, relationType);
  const canDraw =
    Boolean(otherId) &&
    !saving &&
    !loading &&
    !partnerBlocked &&
    !alreadyDrawn;

  function nameFor(p: HonorPerson): string {
    return p.is_self ? "You" : p.display_name;
  }

  async function addBond() {
    if (!canDraw || !otherId) return;
    const built = buildRelationshipInsert({
      ownerId: userId,
      personAId: person.id,
      personBId: otherId,
      relationType,
      personA: {
        isMinor: person.is_minor === true || subjectIsMinor,
        birthDate: person.birth_date,
        birthPrecision: person.birth_precision,
      },
      personB: {
        isMinor: selectedOther?.is_minor,
        birthDate: selectedOther?.birth_date,
        birthPrecision: selectedOther?.birth_precision,
      },
    });
    if (built.ok === false) {
      const reason = built.reason;
      setStatus(
        reason === "partner-minor"
          ? RELATIONSHIP_PICKER_COPY.partnerRefuse
          : reason === "self"
            ? RELATIONSHIP_PICKER_COPY.self
            : RELATIONSHIP_PICKER_COPY.loadError
      );
      return;
    }
    setSaving(true);
    setStatus(null);
    const { error } = await supabase.from("relationships").insert(built.row);
    if (error) {
      setSaving(false);
      setStatus(
        error.code === "23505"
          ? RELATIONSHIP_PICKER_COPY.duplicate
          : RELATIONSHIP_PICKER_COPY.saveError
      );
      return;
    }
    setSaving(false);
    setStatus(RELATIONSHIP_PICKER_COPY.saved);
    setOtherId("");
    await loadEdges();
  }

  async function removeBond(bond: DeclaredBond) {
    if (saving) return;
    setSaving(true);
    setStatus(null);
    const pair = canonicalRelationshipPair(person.id, bond.otherId);
    const { error } = await supabase
      .from("relationships")
      .delete()
      .eq("owner_id", userId)
      .eq("relation_type", bond.relationType)
      .eq("person_a", pair.person_a)
      .eq("person_b", pair.person_b);
    if (error) {
      setSaving(false);
      setStatus(RELATIONSHIP_PICKER_COPY.removeError);
      return;
    }
    setSaving(false);
    setStatus(RELATIONSHIP_PICKER_COPY.removed);
    await loadEdges();
  }

  return (
    <details
      id={RELATIONSHIP_EDGES_ANCHOR_ID}
      aria-label={`Constellation lines for ${person.display_name}`}
      className="glass-card fade-in relationship-edges"
      style={{ minWidth: 0, scrollMarginTop: 92 }}
    >
      <summary className="relationship-edges-summary">
        <p className="eyebrow" style={{ margin: 0 }}>
          {RELATIONSHIP_PICKER_COPY.eyebrow}
        </p>
      </summary>

      <div
        className="relationship-edges-body"
        style={{
          display: "grid",
          gap: 10,
          gridTemplateColumns: "minmax(0, 1fr)",
          marginTop: 12,
          minWidth: 0,
        }}
      >
        <p className="muted" style={{ fontSize: ".75rem", margin: 0, lineHeight: 1.5 }}>
          {RELATIONSHIP_PICKER_COPY.lede}
          {showRemembranceNote ? ` ${RELATIONSHIP_PICKER_COPY.remembranceNote}` : ""}
        </p>

        {loading ? (
          <p className="muted" style={{ fontSize: ".8rem", margin: 0 }}>{RELATIONSHIP_PICKER_COPY.loading}</p>
        ) : loadFailed ? (
          <div>
            <p className="muted" style={{ fontSize: ".8rem", margin: 0 }}>{RELATIONSHIP_PICKER_COPY.loadError}</p>
            <button type="button" className="pill-link" onClick={() => void loadEdges()}>Try again</button>
          </div>
        ) : candidates.length === 0 ? (
          <p className="muted" style={{ fontSize: ".8rem", margin: 0, lineHeight: 1.5 }}>
            {RELATIONSHIP_PICKER_COPY.emptyGalaxy}
          </p>
        ) : (
          <>
            <label className="muted" style={{ fontSize: ".75rem", display: "grid", gap: 6 }}>
              {RELATIONSHIP_PICKER_COPY.personLabel}
              <select
                className="field field--rect"
                value={otherId}
                onChange={(e) => {
                  setOtherId(e.target.value);
                  setStatus(null);
                }}
                aria-label={RELATIONSHIP_PICKER_COPY.personLabel}
              >
                <option value="">{RELATIONSHIP_PICKER_COPY.personPlaceholder}</option>
                {candidates.map((c) => (
                  <option key={c.id} value={c.id}>
                    {nameFor(c)}
                  </option>
                ))}
              </select>
            </label>

            <label className="muted" style={{ fontSize: ".75rem", display: "grid", gap: 6 }}>
              {RELATIONSHIP_PICKER_COPY.typeLabel}
              <select
                className="field field--rect"
                value={relationType}
                onChange={(e) => {
                  setRelationType(e.target.value as DeclaredBondType);
                  setStatus(null);
                }}
                aria-label={RELATIONSHIP_PICKER_COPY.typeLabel}
              >
                {DECLARED_BOND_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {DECLARED_BOND_LABELS[type]}
                  </option>
                ))}
              </select>
            </label>

            {partnerBlocked ? (
              <p className="muted" style={{ fontSize: ".78rem", margin: 0, lineHeight: 1.5 }} role="status">
                {RELATIONSHIP_PICKER_COPY.partnerRefuse}
              </p>
            ) : null}

            {alreadyDrawn ? (
              <p className="muted" style={{ fontSize: ".78rem", margin: 0, lineHeight: 1.5 }} role="status">
                {RELATIONSHIP_PICKER_COPY.duplicate}
              </p>
            ) : null}

            <button
              type="button"
              className="btn-primary"
              onClick={() => void addBond()}
              disabled={!canDraw}
              style={{ gap: 8, width: "fit-content", maxWidth: "100%" }}
            >
              {saving && <Spinner size={13} color="#1a1206" />}
              {saving ? RELATIONSHIP_PICKER_COPY.adding : RELATIONSHIP_PICKER_COPY.add}
            </button>
          </>
        )}

        {!loading && bonds.length === 0 && candidates.length > 0 ? (
          <p className="muted" style={{ fontSize: ".8rem", margin: 0, lineHeight: 1.5 }}>
            {RELATIONSHIP_PICKER_COPY.noneYet}
          </p>
        ) : null}

        {bonds.length > 0 ? (
          <ul
            className="relationship-edges-list"
            aria-label={`Existing constellation lines for ${person.display_name}`}
            style={{
              margin: 0,
              padding: 0,
              listStyle: "none",
              display: "grid",
              gap: 8,
              gridTemplateColumns: "minmax(0, 1fr)",
            }}
          >
            {bonds.map((bond) => {
              const other = peopleById.get(bond.otherId);
              const label = other
                ? `${nameFor(other)} · ${DECLARED_BOND_LABELS[bond.relationType]}`
                : DECLARED_BOND_LABELS[bond.relationType];
              return (
                <li
                  key={`${bond.otherId}:${bond.relationType}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    minWidth: 0,
                    padding: "12px 14px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,.08)",
                    background: "rgba(255,255,255,.03)",
                  }}
                >
                  <span
                    style={{
                      color: "var(--cream)",
                      fontSize: ".9rem",
                      lineHeight: 1.35,
                      overflowWrap: "anywhere",
                      minWidth: 0,
                    }}
                  >
                    {label}
                  </span>
                  <button
                    type="button"
                    className="pill-link"
                    onClick={() => void removeBond(bond)}
                    disabled={saving}
                    aria-label={`Remove ${DECLARED_BOND_LABELS[bond.relationType]} with ${other ? nameFor(other) : "this person"}`}
                    style={{ flexShrink: 0, fontSize: ".78rem" }}
                  >
                    {RELATIONSHIP_PICKER_COPY.remove}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}

        {status ? (
          <p
            className="muted"
            style={{ fontSize: ".78rem", margin: 0, lineHeight: 1.5 }}
            role="status"
          >
            {status}
          </p>
        ) : null}
      </div>
    </details>
  );
}

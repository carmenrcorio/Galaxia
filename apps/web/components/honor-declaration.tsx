"use client";

/**
 * Phase 3 honor-declaration — "who carries their light?"
 *
 * Lives at the BOTTOM of the person page (quiet, optional). Private
 * Remembrance reflections stay in RemembranceSpace higher up.
 * Writes relationships rows; galaxy draws them — no second canvas here.
 */

import { useCallback, useEffect, useState } from "react";
import { Spinner } from "./spinner";
import { createSupabaseBrowserClient } from "../lib/supabase/client";
import {
  HONOR_RELATION_TYPE,
  buildHonorRelationshipInsert,
  honorConnectionDiff,
  livingHonorCandidates,
  livingIdsFromHonorRows,
  type HonorPerson,
} from "@galaxia/core";
import { REMEMBRANCE_CHROME, shouldShowRemembranceSpace } from "../lib/remembrance";

interface HonorPersonInput {
  id: string;
  display_name: string;
  passed_at?: string | null;
  is_self?: boolean;
}

export const HONOR_LIGHT_ANCHOR_ID = "honor-light";

export function HonorDeclarationBox({
  person,
  userId,
  subjectIsMinor,
  onSaved,
}: {
  person: HonorPersonInput;
  userId: string;
  /** From isMinorForSafety — never raw is_minor. */
  subjectIsMinor: boolean;
  onSaved?: () => void;
}) {
  const [supabase] = useState(() => createSupabaseBrowserClient());
  const [candidates, setCandidates] = useState<HonorPerson[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [honorLoading, setHonorLoading] = useState(true);
  const [honorSaving, setHonorSaving] = useState(false);
  const [honorStatus, setHonorStatus] = useState<string | null>(null);

  const loadHonorConnections = useCallback(async () => {
    if (!userId || !person.id) return;
    setHonorLoading(true);
    setHonorStatus(null);
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
          .eq("owner_id", userId)
          .eq("relation_type", HONOR_RELATION_TYPE),
      ]);
    if (peopleErr || relErr) {
      setHonorStatus(peopleErr?.message ?? relErr?.message ?? "Unable to load connections.");
      setHonorLoading(false);
      return;
    }
    const people = (peopleRows ?? []) as HonorPerson[];
    const living = livingHonorCandidates(people, person.id);
    const declared = livingIdsFromHonorRows(
      (relRows ?? []) as Array<{ person_a: string; person_b: string; relation_type: string }>,
      person.id
    ).filter((id) => living.some((c) => c.id === id));
    setCandidates(living);
    setSavedIds(declared);
    setSelectedIds(declared);
    setHonorLoading(false);
  }, [supabase, userId, person.id]);

  useEffect(() => {
    void loadHonorConnections();
  }, [loadHonorConnections]);

  if (!shouldShowRemembranceSpace(person)) return null;

  const honorDirty =
    [...selectedIds].sort().join(",") !== [...savedIds].sort().join(",");

  function toggleCarrier(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    setHonorStatus(null);
  }

  async function saveHonorConnections() {
    if (!userId || !person.id || honorSaving || !honorDirty) return;
    setHonorSaving(true);
    setHonorStatus(null);
    const { toAdd, toRemove } = honorConnectionDiff(savedIds, selectedIds);

    for (const livingId of toRemove) {
      const { error } = await supabase
        .from("relationships")
        .delete()
        .eq("owner_id", userId)
        .eq("relation_type", HONOR_RELATION_TYPE)
        .or(
          `and(person_a.eq.${person.id},person_b.eq.${livingId}),and(person_a.eq.${livingId},person_b.eq.${person.id})`
        );
      if (error) {
        setHonorSaving(false);
        setHonorStatus(error.message);
        return;
      }
    }

    for (const livingId of toAdd) {
      const row = buildHonorRelationshipInsert({
        ownerId: userId,
        passedPersonId: person.id,
        livingPersonId: livingId,
      });
      const { error } = await supabase.from("relationships").insert(row);
      if (error) {
        setHonorSaving(false);
        setHonorStatus(error.message);
        return;
      }
    }

    setSavedIds([...selectedIds]);
    setHonorSaving(false);
    setHonorStatus(
      selectedIds.length === 0
        ? "No one carries their light on the constellation — you can add someone anytime."
        : "Saved. Their light will reach the people you chose on your constellation."
    );
    onSaved?.();
  }

  return (
    <section
      id={HONOR_LIGHT_ANCHOR_ID}
      aria-label={`Who carries ${person.display_name}'s light`}
      className="glass-card fade-in honor-declare"
      style={{
        borderColor: REMEMBRANCE_CHROME.border,
        background: REMEMBRANCE_CHROME.background,
        minWidth: 0,
        display: "grid",
        gap: 10,
        gridTemplateColumns: "minmax(0, 1fr)",
        scrollMarginTop: 92,
      }}
    >
      <p className="eyebrow" style={{ margin: 0, color: REMEMBRANCE_CHROME.ancient }}>
        Who carries their light?
      </p>
      <p className="muted" style={{ fontSize: ".75rem", margin: 0, lineHeight: 1.5 }}>
        Choose the living people in your galaxy who hold a thread of continuity with{" "}
        {person.display_name}. Only what you pick is drawn — nothing is guessed.
        {subjectIsMinor ? " This is remembrance light, never romantic." : ""}
      </p>

      {honorLoading ? (
        <p className="muted" style={{ fontSize: ".8rem", margin: 0 }}>Loading…</p>
      ) : candidates.length === 0 ? (
        <p className="muted" style={{ fontSize: ".8rem", margin: 0, lineHeight: 1.5 }}>
          Add someone living to your galaxy first — then you can connect their light here.
        </p>
      ) : (
        <ul
          className="honor-declare-list"
          role="group"
          aria-label={`Living people who carry ${person.display_name}'s light`}
          style={{
            margin: 0,
            padding: 0,
            listStyle: "none",
            display: "grid",
            gap: 8,
            gridTemplateColumns: "minmax(0, 1fr)",
          }}
        >
          {candidates.map((c) => {
            const checked = selectedIds.includes(c.id);
            return (
              <li key={c.id} style={{ minWidth: 0 }}>
                <label
                  className={`honor-declare-option${checked ? " is-selected" : ""}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    width: "100%",
                    maxWidth: "100%",
                    boxSizing: "border-box",
                    padding: "12px 14px",
                    borderRadius: 12,
                    border: checked
                      ? `1px solid ${REMEMBRANCE_CHROME.water}`
                      : "1px solid rgba(255,255,255,.08)",
                    background: checked
                      ? "rgba(111,177,184,.12)"
                      : "rgba(255,255,255,.03)",
                    cursor: "pointer",
                    minHeight: 48,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleCarrier(c.id)}
                    style={{ width: 18, height: 18, flexShrink: 0, accentColor: REMEMBRANCE_CHROME.water }}
                    aria-label={`${c.display_name}${c.is_self ? " (you)" : ""}`}
                  />
                  <span
                    style={{
                      color: "var(--cream)",
                      fontSize: ".9rem",
                      lineHeight: 1.35,
                      overflowWrap: "anywhere",
                      minWidth: 0,
                    }}
                  >
                    {c.is_self ? "You" : c.display_name}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}

      {candidates.length > 0 ? (
        <button
          type="button"
          className="btn-primary"
          onClick={() => void saveHonorConnections()}
          disabled={honorSaving || !honorDirty}
          style={{ gap: 8, width: "fit-content", maxWidth: "100%" }}
        >
          {honorSaving && <Spinner size={13} color="#1a1206" />}
          {honorSaving
            ? "Saving…"
            : selectedIds.length === 0 && savedIds.length > 0
              ? "Clear connections"
              : "Save connections"}
        </button>
      ) : null}

      {honorStatus ? (
        <p
          className="muted"
          style={{ fontSize: ".78rem", margin: 0, lineHeight: 1.5, color: REMEMBRANCE_CHROME.water }}
          role="status"
        >
          {honorStatus}
        </p>
      ) : null}
    </section>
  );
}

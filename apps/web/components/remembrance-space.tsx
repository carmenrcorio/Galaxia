"use client";

/**
 * Private remembrance space on a passed person's page (Phase 2 + Phase 3).
 * Owner-only via notes RLS + page auth. No sharing.
 * Phase 3: declaration UX for honor-constellation ("who carries their light?")
 * writes relationships rows — galaxy draws them; no second canvas here.
 * Ancient-light chrome reuses water/ancient tokens — page chrome, not a second renderer.
 */

import type { NatalChart } from "@galaxia/astro";
import Link from "next/link";
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
} from "../lib/honor-constellation";
import {
  REMEMBRANCE_CHROME,
  REMEMBRANCE_NOTE_KIND,
  buildRemembranceNoteInsert,
  remembranceChartLines,
  remembranceUsesAncientLight,
  remembranceVelaHref,
  shouldShowRemembranceSpace,
} from "../lib/remembrance";

interface RemembrancePerson {
  id: string;
  display_name: string;
  relation?: string | null;
  passed_at?: string | null;
  is_self?: boolean;
}

interface ReflectionRow {
  id: string;
  body: string;
  created_at: string;
}

export function RemembranceSpace({
  person,
  userId,
  chart,
  subjectIsMinor,
  onSaved,
}: {
  person: RemembrancePerson;
  userId: string;
  chart: NatalChart | null;
  /** From isMinorForSafety — never raw is_minor. */
  subjectIsMinor: boolean;
  onSaved?: () => void;
}) {
  const [supabase] = useState(() => createSupabaseBrowserClient());
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [reflections, setReflections] = useState<ReflectionRow[]>([]);
  const [loading, setLoading] = useState(true);

  /* Honor-constellation declaration — explicit multi-select only */
  const [candidates, setCandidates] = useState<HonorPerson[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [honorLoading, setHonorLoading] = useState(true);
  const [honorSaving, setHonorSaving] = useState(false);
  const [honorStatus, setHonorStatus] = useState<string | null>(null);

  const loadReflections = useCallback(async () => {
    if (!userId || !person.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("notes")
      .select("id, body, created_at")
      .eq("owner_id", userId)
      .eq("about_person", person.id)
      .eq("kind", REMEMBRANCE_NOTE_KIND)
      .order("created_at", { ascending: false })
      .limit(40);
    if (error) setStatus(error.message);
    else setReflections((data ?? []) as ReflectionRow[]);
    setLoading(false);
  }, [supabase, userId, person.id]);

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
    void loadReflections();
  }, [loadReflections]);

  useEffect(() => {
    void loadHonorConnections();
  }, [loadHonorConnections]);

  if (!shouldShowRemembranceSpace(person)) return null;

  const ancient = remembranceUsesAncientLight(person);
  const chartLines = remembranceChartLines(chart);
  const velaHref = remembranceVelaHref(person.id);
  const honorDirty =
    [...selectedIds].sort().join(",") !== [...savedIds].sort().join(",");

  async function saveReflection() {
    const body = draft.trim();
    if (!userId || !person.id || !body || saving) return;
    setSaving(true);
    setStatus(null);
    const row = buildRemembranceNoteInsert({ ownerId: userId, personId: person.id, body });
    const { error } = await supabase.from("notes").insert(row);
    setSaving(false);
    if (error) {
      setStatus(error.message);
      return;
    }
    setDraft("");
    await loadReflections();
    onSaved?.();
  }

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
      // Convention: person_a = passed subject, person_b = living carrier.
      // Also clear any legacy reversed row so remove is fully reversible.
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
      aria-label={`Remembrance space for ${person.display_name}`}
      className="glass-card fade-in remembrance-space"
      style={{
        borderColor: REMEMBRANCE_CHROME.border,
        background: REMEMBRANCE_CHROME.background,
        minWidth: 0,
      }}
    >
      <p className="eyebrow" style={{ marginBottom: 6, color: REMEMBRANCE_CHROME.water }}>
        Remembrance{ancient ? " · ancient light" : ""}
      </p>
      <p
        className="muted"
        style={{
          fontSize: ".84rem",
          lineHeight: 1.55,
          margin: "0 0 14px",
          borderLeft: REMEMBRANCE_CHROME.accentBorder,
          paddingLeft: 10,
          maxWidth: "52ch",
        }}
      >
        A private space for {person.display_name} — only you see this. Their chart stays with you;
        nothing here is shared.
      </p>

      {/* Chart framing — existing placements only, honest hedging */}
      {chartLines.length > 0 ? (
        <div
          style={{
            marginBottom: 16,
            padding: "12px 14px",
            borderRadius: 14,
            border: `1px solid ${REMEMBRANCE_CHROME.border}`,
            background: "rgba(10,7,23,.28)",
            minWidth: 0,
          }}
        >
          <p
            className="eyebrow"
            style={{ marginBottom: 8, color: REMEMBRANCE_CHROME.ancient, letterSpacing: ".1em" }}
          >
            Their chart · soft light
          </p>
          <ul
            style={{
              margin: 0,
              padding: 0,
              listStyle: "none",
              display: "grid",
              gap: 6,
              gridTemplateColumns: "minmax(0, 1fr)",
            }}
          >
            {chartLines.map((line) => (
              <li
                key={line}
                style={{
                  color: "var(--cream)",
                  fontSize: ".88rem",
                  lineHeight: 1.45,
                  overflowWrap: "anywhere",
                }}
              >
                {line}
              </li>
            ))}
          </ul>
          <p className="muted" style={{ fontSize: ".72rem", margin: "10px 0 0", lineHeight: 1.45 }}>
            Only what you recorded — year-only and uncertain signs stay hedged. Nothing new is derived here.
          </p>
        </div>
      ) : (
        <p className="muted" style={{ fontSize: ".8rem", marginBottom: 14, lineHeight: 1.5 }}>
          No chart data yet — you can still write reflections below.
        </p>
      )}

      {/* Honor-constellation declaration — explicit multi-select, reversible */}
      <div
        className="honor-declare"
        style={{
          marginBottom: 18,
          padding: "14px 14px",
          borderRadius: 14,
          border: `1px solid ${REMEMBRANCE_CHROME.border}`,
          background: "rgba(10,7,23,.22)",
          minWidth: 0,
          display: "grid",
          gap: 10,
          gridTemplateColumns: "minmax(0, 1fr)",
        }}
      >
        <p className="eyebrow" style={{ margin: 0, color: REMEMBRANCE_CHROME.ancient }}>
          Who carries their light?
        </p>
        <p className="muted" style={{ fontSize: ".75rem", margin: 0, lineHeight: 1.5 }}>
          Choose the living people in your galaxy who hold a thread of continuity with{" "}
          {person.display_name}. Only what you pick is drawn — nothing is guessed.
          {subjectIsMinor
            ? " This is remembrance light, never romantic."
            : ""}
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
      </div>

      {/* Reflections — owner-authored free text */}
      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "minmax(0, 1fr)", minWidth: 0 }}>
        <p className="eyebrow" style={{ margin: 0 }}>Your reflections</p>
        <p className="muted" style={{ fontSize: ".75rem", margin: 0, lineHeight: 1.5 }}>
          Write what you want to hold. Nothing is generated for you.
          {subjectIsMinor
            ? " Guidance about a young person stays parenting-framed — never romantic."
            : ""}
        </p>
        <textarea
          className="field field--rect"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={`A memory, a feeling, something you want to remember about ${person.display_name}…`}
          rows={4}
          style={{ width: "100%", maxWidth: "100%", boxSizing: "border-box", resize: "vertical" }}
          aria-label="Private remembrance reflection"
        />
        <button
          type="button"
          className="btn-primary"
          onClick={() => void saveReflection()}
          disabled={saving || !draft.trim()}
          style={{ gap: 8, width: "fit-content", maxWidth: "100%" }}
        >
          {saving && <Spinner size={13} color="#1a1206" />}
          {saving ? "Saving…" : "Save reflection"}
        </button>
      </div>

      {loading ? (
        <p className="muted" style={{ fontSize: ".8rem", marginTop: 14 }}>Loading reflections…</p>
      ) : reflections.length > 0 ? (
        <div
          style={{
            marginTop: 16,
            display: "grid",
            gap: 8,
            gridTemplateColumns: "minmax(0, 1fr)",
            minWidth: 0,
          }}
        >
          {reflections.map((r) => (
            <div
              key={r.id}
              style={{
                background: "rgba(10,7,23,.4)",
                borderRadius: 10,
                padding: "10px 14px",
                borderLeft: `2px solid ${REMEMBRANCE_CHROME.water}`,
                minWidth: 0,
              }}
            >
              <p
                style={{
                  margin: 0,
                  color: "var(--cream)",
                  lineHeight: 1.55,
                  fontSize: ".86rem",
                  overflowWrap: "anywhere",
                  whiteSpace: "pre-wrap",
                }}
              >
                {r.body}
              </p>
              <small className="muted" style={{ fontSize: ".68rem" }}>
                {new Date(r.created_at).toLocaleDateString()}
              </small>
            </div>
          ))}
        </div>
      ) : (
        <p className="muted" style={{ fontSize: ".8rem", marginTop: 14, lineHeight: 1.5 }}>
          No reflections yet — when you&apos;re ready, write one above.
        </p>
      )}

      {/* Vela on request only — never auto-opens, never sends first */}
      <div
        style={{
          marginTop: 18,
          paddingTop: 14,
          borderTop: "1px solid rgba(111,177,184,.18)",
          display: "grid",
          gap: 8,
          gridTemplateColumns: "minmax(0, 1fr)",
          minWidth: 0,
        }}
      >
        <p className="muted" style={{ fontSize: ".75rem", margin: 0, lineHeight: 1.5 }}>
          Vela is available if you want company with their chart and your own words. Vela never starts
          the conversation — you open it when you choose.
        </p>
        <Link
          href={velaHref as never}
          className="pill-link"
          style={{ fontSize: ".82rem", width: "fit-content", maxWidth: "100%" }}
        >
          Ask Vela about {person.display_name}
        </Link>
      </div>

      {status ? <p className="error" style={{ marginTop: 10, fontSize: ".82rem" }}>{status}</p> : null}
    </section>
  );
}

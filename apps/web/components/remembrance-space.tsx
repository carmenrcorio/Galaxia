"use client";

/**
 * Private remembrance space on a passed person's page (Phase 2).
 * Owner-only via notes RLS + page auth. No sharing.
 * Reflections stay here (easy to reach). Phase 3 honor-declaration
 * ("who carries their light?") lives separately at the page bottom —
 * see HonorDeclarationBox.
 * Ancient-light chrome reuses water/ancient tokens — page chrome, not a second renderer.
 */

import type { NatalChart } from "@galaxia/astro";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Spinner } from "./spinner";
import { createSupabaseBrowserClient } from "../lib/supabase/client";
import {
  REMEMBRANCE_NOTE_KIND,
  buildRemembranceNoteInsert,
  remembranceChartLines,
  remembranceUsesAncientLight,
  shouldShowRemembranceSpace,
} from "@galaxia/core";
import { REMEMBRANCE_CHROME, remembranceVelaHref } from "../lib/remembrance";

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

export const REMEMBRANCE_ANCHOR_ID = "remembrance";

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

  useEffect(() => {
    void loadReflections();
  }, [loadReflections]);

  if (!shouldShowRemembranceSpace(person)) return null;

  const ancient = remembranceUsesAncientLight(person);
  const chartLines = remembranceChartLines(chart);
  const velaHref = remembranceVelaHref(person.id);

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

  return (
    <section
      id={REMEMBRANCE_ANCHOR_ID}
      aria-label={`Remembrance space for ${person.display_name}`}
      className="glass-card fade-in remembrance-space"
      style={{
        borderColor: REMEMBRANCE_CHROME.border,
        background: REMEMBRANCE_CHROME.background,
        minWidth: 0,
        scrollMarginTop: 92,
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

      {/* Reflections — owner-authored free text (stay here; honor box is at page bottom) */}
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

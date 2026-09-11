"use client";

/**
 * Generations Feature 1 — Memorial Timeline.
 *
 * A reverent, chronological view on a memorial profile: the deceased
 * person's own major life transits (computed on the fly from their real
 * chart via @galaxia/astro `computeLifespanTransits` — never stored, never
 * fabricated) interleaved with milestones the owner optionally adds
 * (marriages, births, moves, career changes...). Birth sits at the top;
 * their passing — when the owner has recorded it — sits at the bottom.
 *
 * Tone (per spec): reverent, never casual. No playful copy anywhere here.
 */

import {
  computeLifespanTransits,
  interpretLifespanTransitEvent,
  type LifespanTransitEvent,
  type NatalChart,
} from "@galaxia/astro";
import {
  MEMORIAL_MILESTONE_NOTE_MAX,
  MEMORIAL_MILESTONE_TITLE_MAX,
  memorialTimelinePrecision,
  memorialTimelineWindow,
  shouldShowMemorialTimeline,
  splitFullName,
  validateMemorialMilestoneInput,
} from "@galaxia/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "../lib/supabase/client";
import { ShareImageButton } from "./share-image-button";
import { ShareWatermark } from "./share-watermark";
import { Spinner } from "./spinner";

interface TimelinePerson {
  id: string;
  display_name: string;
  passed_at?: string | null;
  died_on?: string | null;
  is_self?: boolean;
  birth_precision?: "none" | "exact" | "date" | "year";
  birth_date?: string | null;
  birth_time?: string | null;
  tz_offset_min?: number | null;
}

interface MilestoneRow {
  id: string;
  date: string;
  title: string;
  note: string | null;
}

/**
 * Same precision-aware UTC-instant rebuild the person page already uses for
 * chart recompute. Used ONLY for the "Born" anchor entry, which shows this
 * as a real calendar date — so year-only stays `null` here, always. Never
 * feed this value into anything that will render it as a specific day.
 */
function rebuildBirthDateUTC(person: TimelinePerson): string | null {
  if (!person.birth_date) return null;
  const [yr, mo, dy] = person.birth_date.slice(0, 10).split("-").map(Number);
  if (person.birth_precision === "exact") {
    if (!person.birth_time || person.tz_offset_min == null) return null;
    const [hr, mn] = person.birth_time.slice(0, 5).split(":").map(Number);
    return new Date(Date.UTC(yr!, mo! - 1, dy!, hr!, mn!, 0) - person.tz_offset_min * 60_000).toISOString();
  }
  if (person.birth_precision === "date") return `${person.birth_date.slice(0, 10)}T12:00:00.000Z`;
  return null; // year-only: no real day to show as "Born" — see transitSampleDateUTC below.
}

/**
 * Internal-only reference instant for the lifespan-transit scan on a
 * year-only chart: the same mid-year "working date" convention
 * `computeNatalChart` already uses for year precision (`getWorkingDate`,
 * @galaxia/astro index.ts) — never a real birth day, never rendered to the
 * user (unlike `rebuildBirthDateUTC`, which backs the visible "Born" line).
 */
function transitSampleDateUTC(person: TimelinePerson): string | null {
  if (person.birth_precision === "year" && person.birth_date) {
    const year = person.birth_date.slice(0, 4);
    return `${year}-07-01T12:00:00.000Z`;
  }
  return rebuildBirthDateUTC(person);
}

type TimelineEntry =
  | { kind: "anchor-birth"; sortKey: string; date: Date }
  | { kind: "anchor-passing"; sortKey: string; date: Date }
  | { kind: "transit"; sortKey: string; date: Date; event: LifespanTransitEvent }
  | { kind: "milestone"; sortKey: string; date: Date; milestone: MilestoneRow };

const MEMORIAL_GOLD = "#d4a855";

function formatLongDate(d: Date): string {
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

export function MemorialTimeline({
  person,
  userId,
  chart,
  onDiedOnSaved,
}: {
  person: TimelinePerson;
  userId: string;
  chart: NatalChart | null;
  /** Called after the owner records a date of passing, so the parent can refresh person state. */
  onDiedOnSaved?: (diedOn: string) => void;
}) {
  const [supabase] = useState(() => createSupabaseBrowserClient());
  const [milestones, setMilestones] = useState<MilestoneRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [draftDate, setDraftDate] = useState("");
  const [draftTitle, setDraftTitle] = useState("");
  const [draftNote, setDraftNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [diedOnDraft, setDiedOnDraft] = useState("");
  const [savingDiedOn, setSavingDiedOn] = useState(false);
  const [editingDiedOn, setEditingDiedOn] = useState(false);

  const shareRef = useRef<HTMLDivElement>(null);

  const loadMilestones = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("memorial_milestones")
      .select("id, date, title, note")
      .eq("profile_id", person.id)
      .order("date", { ascending: true });
    if (error) setStatus(error.message);
    else setMilestones((data ?? []) as MilestoneRow[]);
    setLoading(false);
  }, [supabase, person.id]);

  useEffect(() => {
    void loadMilestones();
  }, [loadMilestones]);

  const shouldShow = shouldShowMemorialTimeline(person, chart);
  const precision = memorialTimelinePrecision(person);
  const isApproximate = precision === "approximate";
  const birthDateUTC = rebuildBirthDateUTC(person);
  const transitSampleUTC = transitSampleDateUTC(person);
  const { endDateUTC, endIsKnown } = memorialTimelineWindow(person);
  const firstName = splitFullName(person.display_name).firstName || person.display_name;

  const lifespanEvents = useMemo(() => {
    if (!chart || !transitSampleUTC) return [] as LifespanTransitEvent[];
    try {
      return computeLifespanTransits(chart, transitSampleUTC, endDateUTC, precision);
    } catch {
      return [] as LifespanTransitEvent[];
    }
  }, [chart, transitSampleUTC, endDateUTC, precision]);

  const entries = useMemo(() => {
    const list: TimelineEntry[] = [];
    if (birthDateUTC) {
      const d = new Date(birthDateUTC);
      list.push({ kind: "anchor-birth", sortKey: d.toISOString(), date: d });
    }
    for (const event of lifespanEvents) {
      list.push({ kind: "transit", sortKey: event.dateUTC, date: new Date(event.dateUTC), event });
    }
    for (const m of milestones) {
      const d = new Date(`${m.date.slice(0, 10)}T12:00:00.000Z`);
      list.push({ kind: "milestone", sortKey: d.toISOString(), date: d, milestone: m });
    }
    if (endIsKnown) {
      const d = new Date(endDateUTC);
      list.push({ kind: "anchor-passing", sortKey: d.toISOString(), date: d });
    }
    return list.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [birthDateUTC, lifespanEvents, milestones, endIsKnown, endDateUTC]);

  if (!shouldShow) return null;

  function beginAdd() {
    setEditingId(null);
    setDraftDate("");
    setDraftTitle("");
    setDraftNote("");
    setShowAddForm(true);
  }

  function beginEdit(m: MilestoneRow) {
    setEditingId(m.id);
    setDraftDate(m.date.slice(0, 10));
    setDraftTitle(m.title);
    setDraftNote(m.note ?? "");
    setShowAddForm(true);
  }

  async function saveMilestone() {
    const validation = validateMemorialMilestoneInput({ title: draftTitle, note: draftNote, date: draftDate });
    if (validation.ok === false) {
      setStatus(validation.error);
      return;
    }
    setSaving(true);
    setStatus(null);
    const row = { profile_id: person.id, user_id: userId, date: draftDate, title: validation.title, note: validation.note };
    const { error } = editingId
      ? await supabase.from("memorial_milestones").update(row).eq("id", editingId)
      : await supabase.from("memorial_milestones").insert(row);
    setSaving(false);
    if (error) {
      setStatus(error.message);
      return;
    }
    setShowAddForm(false);
    setEditingId(null);
    await loadMilestones();
  }

  async function deleteMilestone(id: string) {
    setStatus(null);
    const { error } = await supabase.from("memorial_milestones").delete().eq("id", id);
    if (error) {
      setStatus(error.message);
      return;
    }
    await loadMilestones();
  }

  async function saveDiedOn() {
    if (!diedOnDraft) return;
    setSavingDiedOn(true);
    setStatus(null);
    const { error } = await supabase.from("people").update({ died_on: diedOnDraft }).eq("id", person.id).eq("owner_id", userId);
    setSavingDiedOn(false);
    if (error) {
      setStatus(error.message);
      return;
    }
    setEditingDiedOn(false);
    onDiedOnSaved?.(diedOnDraft);
  }

  return (
    <section
      id="memorial-timeline"
      aria-label={`Timeline for ${person.display_name}`}
      className="glass-card fade-in"
      style={{ scrollMarginTop: 92, borderColor: "rgba(111,177,184,.22)" }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div>
          <p className="eyebrow" style={{ marginBottom: 6, color: "rgba(111,177,184,.9)" }}>Timeline</p>
          <p className="muted" style={{ fontSize: ".84rem", lineHeight: 1.6, margin: 0, maxWidth: "50ch" }}>
            {person.display_name}&apos;s major life transits, gently interleaved with the moments you&apos;ve chosen to
            keep. Their chart never changes. This is the layer that holds what mattered.
          </p>
        </div>
        <ShareImageButton
          targetRef={shareRef}
          filename={`${person.display_name.replace(/\s+/g, "-").toLowerCase()}-timeline.png`}
          label="Share timeline"
        />
      </div>

      {isApproximate ? (
        <p className="muted" style={{ fontSize: ".76rem", lineHeight: 1.6, marginTop: 10, maxWidth: "50ch" }}>
          {firstName}&apos;s birth date is recorded as a year only, so these moments are placed by age rather than by
          date.
        </p>
      ) : null}

      {endIsKnown && !editingDiedOn ? (
        <p className="muted" style={{ fontSize: ".72rem", marginTop: 10 }}>
          Passing recorded as {formatLongDate(new Date(endDateUTC))}.{" "}
          <button
            type="button"
            className="pill-link"
            style={{ fontSize: ".68rem", padding: "2px 8px", marginLeft: 4 }}
            onClick={() => { setDiedOnDraft(person.died_on ?? ""); setEditingDiedOn(true); }}
          >
            Correct this date
          </button>
        </p>
      ) : null}

      {!endIsKnown || editingDiedOn ? (
        <div
          style={{
            marginTop: 16,
            padding: "12px 14px",
            borderRadius: 12,
            border: `1px solid ${MEMORIAL_GOLD}40`,
            background: `${MEMORIAL_GOLD}0f`,
          }}
        >
          <p className="muted" style={{ fontSize: ".8rem", lineHeight: 1.6, margin: "0 0 8px" }}>
            {editingDiedOn
              ? "Correct the date they passed."
              : "The date they passed isn't recorded, so their timeline runs from their birth to today. Add it to complete their timeline and see the full picture of their life."}
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <input
              type="date"
              className="field"
              value={diedOnDraft}
              onChange={(e) => setDiedOnDraft(e.target.value)}
              style={{ maxWidth: 180 }}
              aria-label={`Date ${person.display_name} passed`}
            />
            <button type="button" className="pill-link" onClick={() => void saveDiedOn()} disabled={savingDiedOn || !diedOnDraft} style={{ gap: 6 }}>
              {savingDiedOn && <Spinner size={11} />}
              {savingDiedOn ? "Saving…" : editingDiedOn ? "Save correction" : "Add date of passing"}
            </button>
            {editingDiedOn ? (
              <button type="button" className="pill-link" onClick={() => setEditingDiedOn(false)}>
                Cancel
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <div ref={shareRef} style={{ position: "relative", marginTop: 20, padding: "4px 4px 30px" }}>
        {loading ? (
          <p className="muted" style={{ fontSize: ".82rem" }}>Gathering their timeline…</p>
        ) : entries.length === 0 ? (
          <p className="muted" style={{ fontSize: ".84rem", lineHeight: 1.6 }}>
            Their timeline is still quiet. Add the moments that mattered: a wedding, a move, the year they started
            something that became who they were.
          </p>
        ) : (
          <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 0 }}>
            {entries.map((entry, idx) => (
              <li
                key={`${entry.kind}-${entry.sortKey}-${idx}`}
                style={{
                  position: "relative",
                  paddingLeft: 30,
                  paddingBottom: idx === entries.length - 1 ? 0 : 20,
                  borderLeft: idx === entries.length - 1 ? "none" : "1px solid rgba(183,154,216,.16)",
                  marginLeft: 8,
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    left: -9,
                    top: 2,
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: entry.kind === "milestone" ? ".7rem" : ".82rem",
                    background:
                      entry.kind === "milestone"
                        ? `${MEMORIAL_GOLD}22`
                        : entry.kind.startsWith("anchor")
                          ? "rgba(111,177,184,.22)"
                          : "rgba(111,177,184,.12)",
                    border:
                      entry.kind === "milestone"
                        ? `1px solid ${MEMORIAL_GOLD}77`
                        : "1px solid rgba(111,177,184,.4)",
                    color: entry.kind === "milestone" ? MEMORIAL_GOLD : "var(--teal)",
                  }}
                >
                  {entry.kind === "milestone" ? "●" : "✦"}
                </span>

                {entry.kind === "anchor-birth" ? (
                  <div>
                    <p className="eyebrow" style={{ margin: "0 0 2px", color: "var(--teal)" }}>Born</p>
                    <p style={{ margin: 0, fontFamily: "var(--serif)", color: "var(--cream)", fontSize: ".98rem" }}>
                      {formatLongDate(entry.date)}
                    </p>
                  </div>
                ) : entry.kind === "anchor-passing" ? (
                  <div>
                    <p className="eyebrow" style={{ margin: "0 0 2px", color: "var(--teal)" }}>Passed</p>
                    <p style={{ margin: 0, fontFamily: "var(--serif)", color: "var(--cream)", fontSize: ".98rem" }}>
                      {formatLongDate(entry.date)}
                    </p>
                  </div>
                ) : entry.kind === "transit" ? (
                  (() => {
                    const copy = interpretLifespanTransitEvent(entry.event);
                    return (
                      <div>
                        {entry.event.isApproximate ? (
                          <p className="eyebrow" style={{ margin: "0 0 2px", color: "var(--teal)" }}>
                            Around age {entry.event.ageEstimate}
                          </p>
                        ) : null}
                        <p style={{ margin: "0 0 3px", fontFamily: "var(--serif)", color: "var(--cream)", fontSize: ".92rem" }}>
                          {copy.headline}
                        </p>
                        <p className="muted" style={{ margin: 0, fontSize: ".8rem", lineHeight: 1.55, maxWidth: "56ch" }}>
                          {copy.body}
                        </p>
                      </div>
                    );
                  })()
                ) : (
                  <div>
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
                      <p style={{ margin: "0 0 3px", fontFamily: "var(--serif)", color: MEMORIAL_GOLD, fontSize: ".94rem" }}>
                        {entry.milestone.title}
                      </p>
                      <span style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                        <button type="button" className="pill-link" style={{ fontSize: ".68rem", padding: "2px 8px" }} onClick={() => beginEdit(entry.milestone)}>
                          Edit
                        </button>
                        <button type="button" className="pill-link" style={{ fontSize: ".68rem", padding: "2px 8px" }} onClick={() => void deleteMilestone(entry.milestone.id)}>
                          Remove
                        </button>
                      </span>
                    </div>
                    <p className="muted" style={{ margin: "0 0 3px", fontSize: ".74rem" }}>{formatLongDate(entry.date)}</p>
                    {entry.milestone.note ? (
                      <p className="muted" style={{ margin: 0, fontSize: ".82rem", lineHeight: 1.55, maxWidth: "56ch" }}>
                        {entry.milestone.note}
                      </p>
                    ) : null}
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}
        <ShareWatermark />
      </div>

      <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid rgba(183,154,216,.1)" }}>
        {!showAddForm ? (
          <button type="button" className="btn-primary" onClick={beginAdd} style={{ gap: 8 }}>
            + Add a memory
          </button>
        ) : (
          <div style={{ display: "grid", gap: 10, maxWidth: 420 }}>
            <p className="eyebrow" style={{ margin: 0 }}>{editingId ? "Edit this memory" : "Add the moments that mattered"}</p>
            <input
              type="date"
              className="field"
              value={draftDate}
              onChange={(e) => setDraftDate(e.target.value)}
              aria-label="Date"
            />
            <input
              className="field"
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value.slice(0, MEMORIAL_MILESTONE_TITLE_MAX))}
              placeholder={`e.g. "Married Mom", "Started the bakery"`}
              maxLength={MEMORIAL_MILESTONE_TITLE_MAX}
              aria-label="Title"
            />
            <textarea
              className="field field--rect"
              value={draftNote}
              onChange={(e) => setDraftNote(e.target.value.slice(0, MEMORIAL_MILESTONE_NOTE_MAX))}
              placeholder="A note, if you want one (optional)"
              rows={3}
              maxLength={MEMORIAL_MILESTONE_NOTE_MAX}
              aria-label="Note (optional)"
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className="btn-primary" onClick={() => void saveMilestone()} disabled={saving || !draftDate || !draftTitle.trim()} style={{ gap: 8 }}>
                {saving && <Spinner size={13} color="#1a1206" />}
                {saving ? "Saving…" : "Save"}
              </button>
              <button type="button" className="pill-link" onClick={() => { setShowAddForm(false); setEditingId(null); }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {status ? <p className="error" style={{ marginTop: 10, fontSize: ".82rem" }}>{status}</p> : null}
    </section>
  );
}

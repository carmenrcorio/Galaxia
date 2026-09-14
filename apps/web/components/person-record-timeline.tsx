"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  RECORD_TAG_IDS,
  filterRecordEntries,
  formatRecordEntryDate,
  groupRecordEntriesByMonth,
  toggleRecordTag,
  type RecordTagId,
  type RecordViewFilters
} from "@galaxia/core";
import {
  RECORD_CLEAR_FILTERS,
  RECORD_DATE_FROM_LABEL,
  RECORD_DATE_TO_LABEL,
  RECORD_FILTER_EMPTY,
  RECORD_SEARCH_LABEL,
  RECORD_SEARCH_PLACEHOLDER,
  RECORD_TAG_ENTRY_LABEL,
  RECORD_TAG_FILTER_LABEL,
  RECORD_TAG_LABELS
} from "../lib/record-copy";
import type { RecordEntry } from "../lib/record";
import { ThreadMenu } from "./thread-menu";

const RECORD_META: Record<string, { label: string; color: string }> = {
  note:            { label: "You noted",       color: "rgba(230,174,108,.4)" },
  tending:         { label: "Tending note",    color: "rgba(111,177,184,.5)" },
  vela_pin:        { label: "Pinned from Vela", color: "rgba(183,154,216,.5)" },
  compare_reading: { label: "Saved comparison", color: "rgba(230,174,108,.5)" },
  cohort_reading:  { label: "Saved group reading", color: "rgba(111,177,184,.4)" },
  remembrance:     { label: "Remembrance",     color: "rgba(111,177,184,.55)" },
  // FOUNDER-REVIEW: authored. Record label for longitude-changing chart rewrite.
  chart_correction:{ label: "Chart corrected", color: "rgba(230,174,108,.55)" },
  conversation:    { label: "Vela conversation", color: "rgba(183,154,216,.4)" },
};

const CHIP: CSSProperties = {
  fontSize: ".68rem",
  letterSpacing: ".04em",
  borderRadius: 999,
  padding: "4px 9px",
  cursor: "pointer",
  border: "1px solid rgba(230,174,108,.28)",
  background: "transparent",
  color: "var(--mist2)"
};

const CHIP_ON: CSSProperties = {
  ...CHIP,
  background: "rgba(230,174,108,.18)",
  color: "var(--gold)",
  border: "1px solid rgba(230,174,108,.5)"
};

function filtersActive(filters: RecordViewFilters): boolean {
  return Boolean(filters.q?.trim() || filters.from || filters.to || filters.tag);
}

function RecordItem({
  entry,
  onArchive,
  onTagsChange
}: {
  entry: RecordEntry;
  onArchive?: (entryId: string) => void;
  onTagsChange?: (noteId: string, tags: RecordTagId[]) => void;
}) {
  const meta = RECORD_META[entry.kind] ?? RECORD_META.note;
  const withdrawn = Boolean(entry.withdrawnReason);
  const canTag = entry.kind !== "conversation" && Boolean(onTagsChange);
  const tags = entry.tags ?? [];
  return (
    <div style={{ background: "rgba(10,7,23,.4)", borderRadius: 10, padding: "10px 14px", borderLeft: `2px solid ${withdrawn ? "rgba(183,154,216,.2)" : meta.color}`, opacity: withdrawn ? .7 : 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 4, alignItems: "center" }}>
        <span style={{ fontSize: ".62rem", fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--mist2)" }}>{meta.label}</span>
        <span style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <time className="muted" dateTime={entry.createdAt} style={{ fontSize: ".68rem" }}>{formatRecordEntryDate(entry.createdAt)}</time>
          {entry.kind === "conversation" && onArchive ? (
            <ThreadMenu threadId={entry.id.replace(/^thread-/, "")} onArchive={() => onArchive(entry.id)} />
          ) : null}
        </span>
      </div>
      {withdrawn ? (
        <p className="muted" style={{ margin: 0, lineHeight: 1.55, fontSize: ".82rem", fontStyle: "italic" }}>{entry.body}</p>
      ) : (
        <p style={{ margin: 0, color: "var(--cream)", lineHeight: 1.55, fontSize: ".86rem" }}>{entry.body}</p>
      )}
      {entry.kind === "conversation" && entry.href ? (
        <Link href={entry.href as never} style={{ fontSize: ".72rem", color: "var(--gold-soft)" }}>Reopen conversation →</Link>
      ) : null}
      {entry.kind === "vela_pin" && entry.sourceThreadId ? (
        <Link href={`/app/vela?threadId=${entry.sourceThreadId}`} style={{ fontSize: ".72rem", color: "var(--gold-soft)" }}>Reopen conversation →</Link>
      ) : null}
      {entry.kind === "compare_reading" ? (
        <Link href="/app/compare" style={{ fontSize: ".72rem", color: "var(--gold-soft)" }}>Open Compare →</Link>
      ) : null}
      {entry.kind === "cohort_reading" ? (
        <Link
          href={entry.groupId ? `/app/groups?groupId=${entry.groupId}` : "/app/groups"}
          style={{ fontSize: ".72rem", color: "var(--gold-soft)" }}
        >
          Open Groups →
        </Link>
      ) : null}
      {canTag ? (
        <div style={{ marginTop: 8 }} role="group" aria-label={RECORD_TAG_ENTRY_LABEL}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {RECORD_TAG_IDS.map((id) => {
              const on = tags.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => onTagsChange?.(entry.id, toggleRecordTag(tags, id))}
                  style={on ? CHIP_ON : CHIP}
                >
                  {RECORD_TAG_LABELS[id]}
                </button>
              );
            })}
          </div>
        </div>
      ) : tags.length > 0 ? (
        <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
          {tags.map((id) => (
            <span key={id} style={{ ...CHIP, cursor: "default" }}>{RECORD_TAG_LABELS[id]}</span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function PersonRecordTimeline({
  entries,
  onArchive,
  onTagsChange,
  onFiltersChange
}: {
  entries: RecordEntry[];
  onArchive?: (entryId: string) => void;
  onTagsChange?: (noteId: string, tags: RecordTagId[]) => void;
  onFiltersChange?: (filters: RecordViewFilters) => void;
}) {
  const [filters, setFilters] = useState<RecordViewFilters>({});
  const didMount = useRef(false);
  const onFiltersChangeRef = useRef(onFiltersChange);
  onFiltersChangeRef.current = onFiltersChange;

  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    const t = setTimeout(() => onFiltersChangeRef.current?.(filters), 300);
    return () => clearTimeout(t);
  }, [filters]);

  const visible = useMemo(() => filterRecordEntries(entries, filters), [entries, filters]);
  const months = useMemo(() => groupRecordEntriesByMonth(visible), [visible]);
  const active = filtersActive(filters);

  function setTagFilter(id: RecordTagId) {
    setFilters((prev) => ({ ...prev, tag: prev.tag === id ? undefined : id }));
  }

  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
        <label style={{ display: "grid", gap: 4 }}>
          <span className="muted" style={{ fontSize: ".62rem", letterSpacing: ".1em", textTransform: "uppercase" }}>{RECORD_SEARCH_LABEL}</span>
          <input
            type="search"
            className="field field--rect"
            value={filters.q ?? ""}
            placeholder={RECORD_SEARCH_PLACEHOLDER}
            onChange={(e) => setFilters((prev) => ({ ...prev, q: e.target.value }))}
            aria-label={RECORD_SEARCH_LABEL}
          />
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <label style={{ display: "grid", gap: 4 }}>
            <span className="muted" style={{ fontSize: ".62rem", letterSpacing: ".1em", textTransform: "uppercase" }}>{RECORD_DATE_FROM_LABEL}</span>
            <input
              type="date"
              className="field field--rect"
              value={filters.from ?? ""}
              onChange={(e) => setFilters((prev) => ({ ...prev, from: e.target.value || undefined }))}
              aria-label={RECORD_DATE_FROM_LABEL}
            />
          </label>
          <label style={{ display: "grid", gap: 4 }}>
            <span className="muted" style={{ fontSize: ".62rem", letterSpacing: ".1em", textTransform: "uppercase" }}>{RECORD_DATE_TO_LABEL}</span>
            <input
              type="date"
              className="field field--rect"
              value={filters.to ?? ""}
              onChange={(e) => setFilters((prev) => ({ ...prev, to: e.target.value || undefined }))}
              aria-label={RECORD_DATE_TO_LABEL}
            />
          </label>
        </div>
        <div role="group" aria-label={RECORD_TAG_FILTER_LABEL}>
          <p className="muted" style={{ fontSize: ".62rem", letterSpacing: ".1em", textTransform: "uppercase", margin: "0 0 6px" }}>{RECORD_TAG_FILTER_LABEL}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {RECORD_TAG_IDS.map((id) => {
              const on = filters.tag === id;
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setTagFilter(id)}
                  style={on ? CHIP_ON : CHIP}
                >
                  {RECORD_TAG_LABELS[id]}
                </button>
              );
            })}
          </div>
        </div>
        {active ? (
          <button
            type="button"
            className="pill-link"
            style={{ justifySelf: "start", fontSize: ".74rem" }}
            onClick={() => setFilters({})}
          >
            {RECORD_CLEAR_FILTERS}
          </button>
        ) : null}
      </div>

      {months.length > 0 ? (
        <div style={{ display: "grid", gap: 14 }}>
          {months.map((month) => (
            <section key={month.monthKey} aria-labelledby={`record-month-${month.monthKey}`}>
              <h3
                id={`record-month-${month.monthKey}`}
                style={{ margin: "0 0 8px", fontSize: ".72rem", letterSpacing: ".12em", textTransform: "uppercase", color: "var(--gold-soft)", fontWeight: 700 }}
              >
                {month.heading}
              </h3>
              <div style={{ display: "grid", gap: 8 }}>
                {month.entries.map((entry) => (
                  <RecordItem key={entry.id} entry={entry} onArchive={onArchive} onTagsChange={onTagsChange} />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <p className="muted" style={{ fontSize: ".8rem", marginTop: 4 }}>{RECORD_FILTER_EMPTY}</p>
      )}
    </div>
  );
}

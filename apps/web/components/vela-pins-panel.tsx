"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  VELA_PIN_COLLAPSE_LIMIT,
  groupPinnedInsightsByTheme,
  visiblePinnedInsights,
  type PinSort,
  type PinThemeId
} from "@galaxia/core";
import type { RecordEntry } from "../lib/record";
import {
  PIN_THEME_LABELS,
  VELA_PIN_SEARCH_EMPTY,
  VELA_PIN_SEARCH_LABEL,
  VELA_PIN_SEARCH_PLACEHOLDER,
  VELA_PIN_SHOW_LATEST,
  VELA_PIN_SORT_LABEL,
  VELA_PIN_SORT_NEWEST,
  VELA_PIN_SORT_OLDEST,
  VELA_PIN_THEME_GROUP_UNTHEMED,
  velaPinSeeAllLabel
} from "../lib/vela-pin-copy";
import { PinThemePicker } from "./pin-theme-picker";

const SORT_CHIP: CSSProperties = {
  fontSize: ".72rem",
  letterSpacing: ".04em",
  borderRadius: 999,
  padding: "4px 10px",
  cursor: "pointer",
  border: "1px solid rgba(183,154,216,.28)",
  background: "transparent",
  color: "var(--mist2)"
};

const SORT_CHIP_ON: CSSProperties = {
  ...SORT_CHIP,
  background: "rgba(183,154,216,.18)",
  color: "var(--cream)",
  border: "1px solid rgba(183,154,216,.5)"
};

export function VelaPinsPanel({
  pins,
  onThemeChange,
  onSearchChange
}: {
  pins: RecordEntry[];
  onThemeChange?: (noteId: string, theme: PinThemeId | null) => void;
  onSearchChange?: (q: string) => void;
}) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<PinSort>("newest");
  const [expanded, setExpanded] = useState(false);
  const didMount = useRef(false);
  const onSearchChangeRef = useRef(onSearchChange);
  onSearchChangeRef.current = onSearchChange;

  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    const t = setTimeout(() => onSearchChangeRef.current?.(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  const searching = Boolean(q.trim());
  const grouped = expanded || searching;
  const visible = useMemo(
    () => visiblePinnedInsights(pins, { q, sort, expanded }),
    [pins, q, sort, expanded]
  );
  const groups = useMemo(
    () => (grouped ? groupPinnedInsightsByTheme(visible) : null),
    [visible, grouped]
  );
  const canCollapse = pins.length > VELA_PIN_COLLAPSE_LIMIT && !searching;

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <label style={{ display: "grid", gap: 4 }}>
        <span className="muted" style={{ fontSize: ".62rem", letterSpacing: ".1em", textTransform: "uppercase" }}>{VELA_PIN_SEARCH_LABEL}</span>
        <input
          type="search"
          className="field field--rect"
          value={q}
          placeholder={VELA_PIN_SEARCH_PLACEHOLDER}
          onChange={(e) => setQ(e.target.value)}
          aria-label={VELA_PIN_SEARCH_LABEL}
        />
      </label>
      <div role="group" aria-label={VELA_PIN_SORT_LABEL} style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        <button
          type="button"
          aria-pressed={sort === "newest"}
          onClick={() => setSort("newest")}
          style={sort === "newest" ? SORT_CHIP_ON : SORT_CHIP}
        >
          {VELA_PIN_SORT_NEWEST}
        </button>
        <button
          type="button"
          aria-pressed={sort === "oldest"}
          onClick={() => setSort("oldest")}
          style={sort === "oldest" ? SORT_CHIP_ON : SORT_CHIP}
        >
          {VELA_PIN_SORT_OLDEST}
        </button>
      </div>
      {canCollapse ? (
        <button
          type="button"
          className="pill-link"
          style={{ justifySelf: "start", fontSize: ".74rem" }}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? VELA_PIN_SHOW_LATEST : velaPinSeeAllLabel(pins.length)}
        </button>
      ) : null}

      {visible.length === 0 ? (
        <p className="muted" style={{ fontSize: ".8rem", margin: 0 }}>{VELA_PIN_SEARCH_EMPTY}</p>
      ) : groups ? (
        <div style={{ display: "grid", gap: 12 }}>
          {groups.map((group) => {
            const heading = group.theme ? PIN_THEME_LABELS[group.theme] : VELA_PIN_THEME_GROUP_UNTHEMED;
            return (
              <section key={group.theme ?? "none"} aria-label={heading}>
                <h3 style={{ margin: "0 0 8px", fontSize: ".72rem", letterSpacing: ".12em", textTransform: "uppercase", color: "var(--gold-soft)", fontWeight: 700 }}>
                  {heading}
                </h3>
                <div style={{ display: "grid", gap: 8 }}>
                  {group.entries.map((pin) => (
                    <VelaPinCard key={pin.id} pin={pin} onThemeChange={onThemeChange} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {visible.map((pin) => (
            <VelaPinCard key={pin.id} pin={pin} onThemeChange={onThemeChange} />
          ))}
        </div>
      )}
    </div>
  );
}

function VelaPinCard({
  pin,
  onThemeChange
}: {
  pin: RecordEntry;
  onThemeChange?: (noteId: string, theme: PinThemeId | null) => void;
}) {
  return (
    <div style={{ borderLeft: `2px solid ${pin.withdrawnReason ? "rgba(183,154,216,.15)" : "rgba(183,154,216,.35)"}`, paddingLeft: 12, opacity: pin.withdrawnReason ? .7 : 1 }}>
      <p style={{ margin: "0 0 4px", color: pin.withdrawnReason ? "var(--mist2)" : "var(--mist)", fontStyle: pin.withdrawnReason ? "italic" : "normal", fontSize: ".86rem", lineHeight: 1.55 }}>{pin.body}</p>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <small className="muted" style={{ fontSize: ".68rem" }}>{new Date(pin.createdAt).toLocaleDateString()}</small>
        {pin.sourceThreadId ? (
          <Link href={`/app/vela?threadId=${pin.sourceThreadId}`} style={{ fontSize: ".7rem", color: "var(--gold-soft)" }}>Reopen conversation →</Link>
        ) : null}
      </div>
      {onThemeChange && !pin.withdrawnReason ? (
        <div style={{ marginTop: 8 }}>
          <PinThemePicker value={pin.theme ?? null} onChange={(theme) => onThemeChange(pin.id, theme)} />
        </div>
      ) : null}
    </div>
  );
}

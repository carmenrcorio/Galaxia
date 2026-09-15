"use client";

/**
 * Searchable group field. Same slot card, portal, search, and scrolling
 * list as PersonPickerField. Groups have no minor-safety label.
 */

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { InitialAvatar } from "./initial-avatar";

export type GroupPickerOption = {
  id: string;
  displayName: string;
  memberCount?: number;
};

// FOUNDER-REVIEW: authored group picker copy.
export const GROUP_PICKER_COPY = {
  placeholder: "Choose a group",
  search: "Search by name",
  empty: "No group matches that name.",
  addGroup: "Add a group"
};

const DESKTOP_MQ = "(min-width: 720px)";
const POPOVER_WIDTH = 320;

function memberCountLabel(count: number): string {
  // FOUNDER-REVIEW: "(N members)" member count label text
  return `(${count} members)`;
}

function useDesktopPicker(): boolean {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_MQ);
    const apply = () => setDesktop(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return desktop;
}

function popoverCoords(trigger: HTMLElement): { top: number; left: number; width: number } {
  const rect = trigger.getBoundingClientRect();
  const width = Math.min(Math.max(rect.width, POPOVER_WIDTH), window.innerWidth - 16);
  let left = rect.left;
  left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
  return { top: rect.bottom + 8, left, width };
}

function sortByName(groups: readonly GroupPickerOption[]): GroupPickerOption[] {
  return [...groups].sort((a, b) =>
    a.displayName.localeCompare(b.displayName, undefined, { sensitivity: "base" })
  );
}

function matchesQuery(group: GroupPickerOption, query: string): boolean {
  if (!query) return true;
  return group.displayName.toLowerCase().includes(query);
}

export function GroupPickerField({
  label,
  groups,
  selectedId,
  onSelect,
  addGroupHref
}: {
  label: string;
  groups: readonly GroupPickerOption[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  addGroupHref: string;
}) {
  const desktop = useDesktopPicker();
  const dialogTitleId = useId();
  const searchId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [coords, setCoords] = useState({ top: 0, left: 0, width: POPOVER_WIDTH });
  const [mounted, setMounted] = useState(false);

  const selected = groups.find((group) => group.id === selectedId) ?? null;
  const normalizedQuery = query.trim().toLowerCase();

  const filtered = useMemo(
    () => sortByName(groups.filter((group) => matchesQuery(group, normalizedQuery))),
    [groups, normalizedQuery]
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();
    function update() {
      const el = triggerRef.current;
      if (!el) return;
      setCoords(popoverCoords(el));
    }
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  function close() {
    setOpen(false);
    setQuery("");
  }

  function choose(id: string) {
    onSelect(id);
    close();
    triggerRef.current?.focus();
  }

  const picker = open && mounted
    ? createPortal(
        <>
          <div
            className="compare-person-picker__backdrop"
            onClick={close}
            role="presentation"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogTitleId}
            className={`compare-person-picker__panel${desktop ? " compare-person-picker__panel--popover" : " compare-person-picker__panel--sheet"}`}
            style={desktop ? { top: coords.top, left: coords.left, width: coords.width } : undefined}
          >
            <p id={dialogTitleId} className="eyebrow" style={{ marginBottom: 10 }}>
              {label}
            </p>
            <input
              id={searchId}
              ref={searchRef}
              className="field field--rect"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={GROUP_PICKER_COPY.search}
              aria-label={GROUP_PICKER_COPY.search}
              style={{ marginBottom: 10 }}
            />
            <div className="compare-person-picker__list">
              {filtered.length > 0 ? (
                filtered.map((group) => (
                  <GroupOptionRow
                    key={group.id}
                    group={group}
                    selected={group.id === selectedId}
                    onChoose={choose}
                  />
                ))
              ) : (
                <div style={{ padding: "8px 2px 4px" }}>
                  <p className="muted" style={{ fontSize: ".82rem", marginBottom: 8 }}>
                    {/* FOUNDER-REVIEW: GROUP_PICKER_COPY.empty */}
                    {GROUP_PICKER_COPY.empty}
                  </p>
                  <Link href={addGroupHref as never} className="pill-link" style={{ fontSize: ".82rem" }}>
                    {/* FOUNDER-REVIEW: "Add a group" empty-state link label text */}
                    {GROUP_PICKER_COPY.addGroup}
                  </Link>
                </div>
              )}
            </div>
          </div>
        </>,
        document.body
      )
    : null;

  return (
    <div className="compare-person-field">
      <p className="eyebrow" style={{ fontSize: ".62rem", marginBottom: 5 }}>{label}</p>
      <button
        ref={triggerRef}
        type="button"
        className="compare-person-field__trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          setQuery("");
          setOpen(true);
        }}
      >
        {selected ? (
          <>
            <InitialAvatar
              name={selected.displayName}
              size="sm"
              personId={selected.id}
            />
            <span className="compare-person-field__text">
              <span className="compare-person-field__name">{selected.displayName}</span>
              {typeof selected.memberCount === "number" ? (
                <span className="compare-person-field__role">{memberCountLabel(selected.memberCount)}</span>
              ) : null}
            </span>
          </>
        ) : (
          <span className="compare-person-field__placeholder">
            {/* FOUNDER-REVIEW: GROUP_PICKER_COPY.placeholder */}
            {GROUP_PICKER_COPY.placeholder}
          </span>
        )}
      </button>
      {picker}
    </div>
  );
}

function GroupOptionRow({
  group,
  selected,
  onChoose
}: {
  group: GroupPickerOption;
  selected: boolean;
  onChoose: (id: string) => void;
}) {
  return (
    <button
      type="button"
      className={`compare-person-picker__option${selected ? " compare-person-picker__option--selected" : ""}`}
      aria-pressed={selected}
      onClick={() => onChoose(group.id)}
    >
      <InitialAvatar
        name={group.displayName}
        size="sm"
        personId={group.id}
      />
      <span className="compare-person-field__text">
        <span className="compare-person-field__name">{group.displayName}</span>
        {typeof group.memberCount === "number" ? (
          <span className="compare-person-field__role">{memberCountLabel(group.memberCount)}</span>
        ) : null}
      </span>
    </button>
  );
}

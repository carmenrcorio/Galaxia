"use client";

/**
 * Searchable person field shared by /app/compare (and later Vela). Sheet on
 * small viewports, anchored popover from 720px up. The options list scrolls
 * inside a fixed-height container so the page height does not grow with
 * constellation size.
 */

import { GALAXY_RELATION_PICKER_OPTIONS, isMinorForSafety } from "@galaxia/core";
import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { InitialAvatar } from "./initial-avatar";

export type PersonPickerOption = {
  id: string;
  display_name: string;
  relation: string;
  sun?: string | null;
  passed_at?: string | null;
  is_minor?: boolean | null;
  birth_date?: string | null;
  birth_precision?: "none" | "exact" | "date" | "year" | null;
};

export const COMPARE_PERSON_PICKER_COPY = {
  placeholder: "Choose a person",
  search: "Search by name",
  recent: "Recent",
  empty: "No one matches that name.",
  addPerson: "Add a person",
  selfRole: "You"
};

const MINOR_NAME_SUFFIX = " (minor)";

const DESKTOP_MQ = "(min-width: 720px)";
const POPOVER_WIDTH = 320;

function storedRelationLabel(relation: string): string {
  if (relation === "self") return COMPARE_PERSON_PICKER_COPY.selfRole;
  const option = GALAXY_RELATION_PICKER_OPTIONS.find((entry) => entry.value === relation);
  return option?.label ?? relation;
}

function displayNameForPicker(person: PersonPickerOption): string {
  if (!isMinorForSafety({
    isMinor: person.is_minor ?? false,
    birthDate: person.birth_date,
    birthPrecision: person.birth_precision
  })) {
    return person.display_name;
  }
  return `${person.display_name}${MINOR_NAME_SUFFIX}`;
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

function sortByName(people: readonly PersonPickerOption[]): PersonPickerOption[] {
  return [...people].sort((a, b) =>
    a.display_name.localeCompare(b.display_name, undefined, { sensitivity: "base" })
  );
}

function matchesQuery(person: PersonPickerOption, query: string): boolean {
  if (!query) return true;
  return person.display_name.toLowerCase().includes(query);
}

export function PersonPickerField({
  label,
  people,
  recentPeople,
  selectedId,
  disabledId,
  onSelect,
  addPersonHref
}: {
  label: string;
  people: readonly PersonPickerOption[];
  recentPeople: readonly PersonPickerOption[];
  selectedId: string | null;
  disabledId: string | null;
  onSelect: (id: string) => void;
  addPersonHref: string;
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

  const selected = people.find((person) => person.id === selectedId) ?? null;
  const normalizedQuery = query.trim().toLowerCase();

  const { filteredRecent, filteredAll } = useMemo(() => {
    const recent = normalizedQuery
      ? []
      : recentPeople.filter((person) => matchesQuery(person, normalizedQuery));
    const recentIds = new Set(recent.map((person) => person.id));
    const all = sortByName(
      people.filter((person) => {
        if (!matchesQuery(person, normalizedQuery)) return false;
        if (!normalizedQuery && recentIds.has(person.id)) return false;
        return true;
      })
    );
    return { filteredRecent: recent, filteredAll: all };
  }, [people, recentPeople, normalizedQuery]);
  const showRecent = !normalizedQuery && filteredRecent.length > 0;

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
    if (id === disabledId) return;
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
              placeholder={COMPARE_PERSON_PICKER_COPY.search}
              aria-label={COMPARE_PERSON_PICKER_COPY.search}
              style={{ marginBottom: 10 }}
            />
            <div className="compare-person-picker__list">
              {showRecent ? (
                <div style={{ marginBottom: 10 }}>
                  <p className="eyebrow" style={{ fontSize: ".62rem", marginBottom: 6 }}>
                                        {COMPARE_PERSON_PICKER_COPY.recent}
                  </p>
                  {filteredRecent.map((person) => (
                    <PersonOptionRow
                      key={`recent-${person.id}`}
                      person={person}
                      selected={person.id === selectedId}
                      disabled={person.id === disabledId}
                      onChoose={choose}
                    />
                  ))}
                </div>
              ) : null}
              {filteredAll.length > 0 ? (
                filteredAll.map((person) => (
                  <PersonOptionRow
                    key={`all-${person.id}`}
                    person={person}
                    selected={person.id === selectedId}
                    disabled={person.id === disabledId}
                    onChoose={choose}
                  />
                ))
              ) : (
                <div style={{ padding: "8px 2px 4px" }}>
                  <p className="muted" style={{ fontSize: ".82rem", marginBottom: 8 }}>
                                        {COMPARE_PERSON_PICKER_COPY.empty}
                  </p>
                  <Link href={addPersonHref as never} className="pill-link" style={{ fontSize: ".82rem" }}>
                                        {COMPARE_PERSON_PICKER_COPY.addPerson}
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
              name={selected.display_name}
              size="sm"
              personId={selected.id}
              sunSign={selected.sun}
              memorial={Boolean(selected.passed_at)}
            />
            <span className="compare-person-field__text">
              <span className="compare-person-field__name">{displayNameForPicker(selected)}</span>
              <span className="compare-person-field__role">
                {storedRelationLabel(selected.relation)}
              </span>
            </span>
          </>
        ) : (
          <span className="compare-person-field__placeholder">
                        {COMPARE_PERSON_PICKER_COPY.placeholder}
          </span>
        )}
      </button>
      {picker}
    </div>
  );
}

function PersonOptionRow({
  person,
  selected,
  disabled,
  onChoose
}: {
  person: PersonPickerOption;
  selected: boolean;
  disabled: boolean;
  onChoose: (id: string) => void;
}) {
  return (
    <button
      type="button"
      className={`compare-person-picker__option${selected ? " compare-person-picker__option--selected" : ""}`}
      disabled={disabled}
      aria-disabled={disabled}
      aria-pressed={selected}
      onClick={() => onChoose(person.id)}
    >
      <InitialAvatar
        name={person.display_name}
        size="sm"
        personId={person.id}
        sunSign={person.sun}
        memorial={Boolean(person.passed_at)}
      />
      <span className="compare-person-field__text">
        <span className="compare-person-field__name">{displayNameForPicker(person)}</span>
        <span className="compare-person-field__role">{storedRelationLabel(person.relation)}</span>
      </span>
    </button>
  );
}

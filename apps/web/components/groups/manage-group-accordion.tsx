"use client";

/**
 * Manage group — closed-by-default disclosure holding the group editor
 * (name, kind, member selector, save/update/delete). Previously this was
 * the page's leading section; it is now demoted to housekeeping that lives
 * below all the reading/insight surfaces.
 */

import { OWNED_DELETE_COPY } from "@galaxia/core";
import { useState } from "react";
import { InitialAvatar } from "../initial-avatar";
import { Spinner } from "../spinner";

export type GroupKind = "siblings" | "friends" | "family" | "group";

const GROUP_KINDS: GroupKind[] = ["siblings", "friends", "family", "group"];

interface PersonLite {
  id: string;
  display_name: string;
}

interface ManageGroupAccordionProps {
  open: boolean;
  onToggle: (open: boolean) => void;
  isEditing: boolean;
  people: PersonLite[];
  groupName: string;
  onGroupNameChange: (v: string) => void;
  groupKind: GroupKind;
  onGroupKindChange: (k: GroupKind) => void;
  selectedPersonIds: string[];
  onToggleMember: (id: string) => void;
  loadedBelowMinimum: boolean;
  belowMinimumNotice: string;
  savingGroup: boolean;
  onSave: () => void;
  buildingOverlay: boolean;
  onGenerateReading: () => void;
  canDelete: boolean;
  confirmDelete: boolean;
  deleteWarning: string | null;
  deletingGroup: boolean;
  onBeginDelete: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
}

export function ManageGroupAccordion({
  open,
  onToggle,
  isEditing,
  people,
  groupName,
  onGroupNameChange,
  groupKind,
  onGroupKindChange,
  selectedPersonIds,
  onToggleMember,
  loadedBelowMinimum,
  belowMinimumNotice,
  savingGroup,
  onSave,
  buildingOverlay,
  onGenerateReading,
  canDelete,
  confirmDelete,
  deleteWarning,
  deletingGroup,
  onBeginDelete,
  onConfirmDelete,
  onCancelDelete,
}: ManageGroupAccordionProps) {
  const [query, setQuery] = useState("");
  const filteredPeople = query.trim()
    ? people.filter((p) => p.display_name.toLowerCase().includes(query.trim().toLowerCase()))
    : people;

  return (
    <details
      className="glass-card fade-in manage-group-accordion"
      open={open}
      onToggle={(e) => onToggle((e.currentTarget as HTMLDetailsElement).open)}
    >
      <summary>
        <span>
          <span className="eyebrow" style={{ marginBottom: 0 }}>Manage group</span>
        </span>
      </summary>

      <div className="manage-group-accordion-body">
        <p className="eyebrow" style={{ fontSize: ".62rem", marginBottom: 8 }}>Name</p>
        <input
          className="field"
          value={groupName}
          onChange={(e) => onGroupNameChange(e.target.value)}
          placeholder="Group name (e.g. Siblings)"
          style={{ marginBottom: 14 }}
        />

        <p className="eyebrow" style={{ fontSize: ".62rem", marginBottom: 8 }}>Type</p>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 18 }}>
          {GROUP_KINDS.map((k) => (
            <button
              key={k}
              type="button"
              className={`group-tag${groupKind === k ? " group-tag--selected" : ""}`}
              onClick={() => onGroupKindChange(k)}
            >
              {k}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
          <p className="eyebrow" style={{ fontSize: ".62rem", margin: 0 }}>Members</p>
          <span className="muted" style={{ fontSize: ".76rem" }}>
            {selectedPersonIds.length} {selectedPersonIds.length === 1 ? "member" : "members"} selected
          </span>
        </div>

        {people.length > 8 ? (
          <input
            className="field field--rect"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people…"
            style={{ marginBottom: 10 }}
            aria-label="Search people"
          />
        ) : null}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          {filteredPeople.map((p) => {
            const selected = selectedPersonIds.includes(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onToggleMember(p.id)}
                className={`group-member-chip${selected ? " group-member-chip--selected" : ""}`}
                aria-pressed={selected}
              >
                <span className="group-member-chip__check" aria-hidden="true">{selected ? "✓" : ""}</span>
                <InitialAvatar name={p.display_name} size="sm" />
                <span>{p.display_name}</span>
              </button>
            );
          })}
          {filteredPeople.length === 0 ? (
            <p className="muted" style={{ fontSize: ".82rem" }}>No one matches “{query}”.</p>
          ) : null}
        </div>

        {loadedBelowMinimum ? (
          <p className="muted" style={{ fontSize: 13, marginBottom: 10 }}>{belowMinimumNotice}</p>
        ) : null}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn-primary" onClick={onSave} disabled={savingGroup} style={{ gap: 8 }}>
            {savingGroup && <Spinner size={13} color="#1a1206" />}
            {savingGroup ? (isEditing ? "Updating…" : "Saving…") : isEditing ? "Update group" : "Save group"}
          </button>
          <button
            type="button"
            className="pill-link"
            onClick={onGenerateReading}
            disabled={buildingOverlay || loadedBelowMinimum}
            style={{ gap: 8 }}
          >
            {buildingOverlay && <Spinner size={12} />}
            {buildingOverlay ? "Building…" : "Generate group reading"}
          </button>
          {canDelete ? (
            !confirmDelete ? (
              <button
                type="button"
                className="pill-link"
                style={{ borderColor: "rgba(218,140,140,.4)", color: "var(--rose)" }}
                onClick={onBeginDelete}
              >
                Delete group
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="pill-link"
                  style={{ background: "rgba(218,140,140,.15)", borderColor: "var(--rose)", color: "var(--rose)", gap: 8 }}
                  onClick={onConfirmDelete}
                  disabled={deletingGroup}
                >
                  {deletingGroup && <Spinner size={12} color="var(--rose)" />}
                  {deletingGroup ? OWNED_DELETE_COPY.groupConfirmingButton : OWNED_DELETE_COPY.groupConfirmButton}
                </button>
                <button type="button" className="pill-link" onClick={onCancelDelete}>
                  Cancel
                </button>
              </>
            )
          ) : null}
        </div>
        {confirmDelete && deleteWarning ? (
          <p className="muted" style={{ fontSize: 13, marginTop: 10, color: "var(--rose)" }}>{deleteWarning}</p>
        ) : null}
      </div>
    </details>
  );
}

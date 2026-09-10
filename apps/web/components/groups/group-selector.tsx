"use client";

/**
 * Group selector — horizontally scrollable card switcher for /app/groups.
 * Replaces the old plain-text "Saved groups" list. Each card carries an
 * overlapping avatar cluster (InitialAvatar, unchanged component/style) and
 * a one-line astrological signature computed by `groupSignatureLine`.
 */

import { InitialAvatar } from "../initial-avatar";

export interface GroupSelectorMember {
  id: string;
  name: string;
}

export interface GroupSelectorItem {
  id: string;
  name: string;
  kind: string;
  members: GroupSelectorMember[];
  /** e.g. "3 members · 2 Pluto signs · 1 fault line" — see lib/groups-copy. */
  signature: string;
}

interface GroupSelectorProps {
  groups: GroupSelectorItem[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreateNew: () => void;
}

const CLUSTER_CAP = 4;

export function GroupSelector({ groups, activeId, onSelect, onCreateNew }: GroupSelectorProps) {
  return (
    <div className="group-switcher" role="tablist" aria-label="Your groups">
      {groups.map((g) => {
        const active = g.id === activeId;
        return (
          <button
            key={g.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(g.id)}
            className={`group-switcher-card${active ? " group-switcher-card--active" : ""}`}
          >
            <div className="group-switcher-card__name">{g.name}</div>
            <div className="avatar-cluster">
              {g.members.slice(0, CLUSTER_CAP).map((m) => (
                <InitialAvatar key={m.id} name={m.name} size="sm" />
              ))}
              {g.members.length > CLUSTER_CAP ? (
                <span style={{ fontSize: 11, color: "var(--mist2)", marginLeft: 8, alignSelf: "center" }}>
                  +{g.members.length - CLUSTER_CAP}
                </span>
              ) : null}
            </div>
            <div className="group-switcher-card__signature">{g.signature}</div>
          </button>
        );
      })}
      <button type="button" className="group-switcher-add" onClick={onCreateNew} aria-label="Create a new group">
        <span className="group-switcher-add__plus" aria-hidden="true">+</span>
        <span style={{ fontSize: 12 }}>New group</span>
      </button>
    </div>
  );
}

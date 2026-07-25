/**
 * Roster-keyed current cohort readings for Groups.
 *
 * Persistence lives in `notes` (`kind = 'cohort_reading'`,
 * `payload.source = 'groups_current'`). The structural key is
 * `(group_id, member_set_hash)` — a changed roster cannot match a stale row.
 */

import { GROUP_MIN_MEMBERS } from "./owned-delete";

export const GROUPS_CURRENT_SOURCE = "groups_current" as const;

export type CohortOverlaySnapshot = {
  sharedSky: Array<{ planet: string; sign: string }>;
  faultLines: Array<{
    planet: string;
    groups: Array<{ sign: string; names: string[] }>;
  }>;
  label: string;
};

export type CohortPairHighlight = { pair: string; summary: string };

/** Payload shape written for the current Groups reading (curated/computed only). */
export type GroupsCurrentPayload = {
  source: typeof GROUPS_CURRENT_SOURCE;
  member_set_hash: string;
  memberIds: string[];
  memberNames: string[];
  overlay: CohortOverlaySnapshot;
  pairHighlights: CohortPairHighlight[];
};

/** Hydrated cohort panel state — same shape for fresh compute and note reload. */
export type CohortReadingState = {
  memberIds: string[];
  memberNames: string[];
  overlay: CohortOverlaySnapshot;
  pairHighlights: CohortPairHighlight[];
};

/**
 * Deterministic roster fingerprint: sorted unique person ids, FNV-1a 32-bit hex.
 * Order of input does not matter; duplicates collapse.
 */
export function memberSetHash(personIds: readonly string[]): string {
  const sorted = [...new Set(personIds.filter(Boolean))].sort();
  const input = sorted.join("\n");
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

export function buildGroupsCurrentPayload(input: {
  memberIds: readonly string[];
  memberNames: readonly string[];
  overlay: CohortOverlaySnapshot;
  pairHighlights: readonly CohortPairHighlight[];
}): GroupsCurrentPayload {
  const memberIds = [...new Set(input.memberIds.filter(Boolean))].sort();
  return {
    source: GROUPS_CURRENT_SOURCE,
    member_set_hash: memberSetHash(memberIds),
    memberIds,
    memberNames: [...input.memberNames],
    overlay: input.overlay,
    pairHighlights: [...input.pairHighlights]
  };
}

export function isGroupsCurrentPayload(payload: unknown): payload is GroupsCurrentPayload {
  if (!payload || typeof payload !== "object") return false;
  const p = payload as Record<string, unknown>;
  if (p.source !== GROUPS_CURRENT_SOURCE) return false;
  if (typeof p.member_set_hash !== "string" || !p.member_set_hash) return false;
  if (!Array.isArray(p.memberIds) || !Array.isArray(p.memberNames)) return false;
  if (!p.overlay || typeof p.overlay !== "object") return false;
  const overlay = p.overlay as Record<string, unknown>;
  if (!Array.isArray(overlay.sharedSky) || !Array.isArray(overlay.faultLines)) return false;
  if (typeof overlay.label !== "string") return false;
  if (!Array.isArray(p.pairHighlights)) return false;
  return true;
}

/** Hydrate the Groups reading surface from a stored groups_current payload. */
export function cohortStateFromGroupsCurrentPayload(payload: unknown): CohortReadingState | null {
  if (!isGroupsCurrentPayload(payload)) return null;
  return {
    memberIds: [...payload.memberIds],
    memberNames: [...payload.memberNames],
    overlay: {
      sharedSky: payload.overlay.sharedSky.map((item) => ({ ...item })),
      faultLines: payload.overlay.faultLines.map((line) => ({
        planet: line.planet,
        groups: line.groups.map((g) => ({ sign: g.sign, names: [...g.names] }))
      })),
      label: payload.overlay.label
    },
    pairHighlights: payload.pairHighlights.map((item) => ({ ...item }))
  };
}

export type GroupsCurrentNoteCandidate = {
  id: string;
  payload: unknown;
  member_set_hash?: string | null;
};

/**
 * Pick the current reading for a live roster. Structural miss when the hash
 * does not match — stale rows for an older roster never win.
 */
export function selectGroupsCurrentForRoster(
  memberIds: readonly string[],
  notes: readonly GroupsCurrentNoteCandidate[]
): { id: string; payload: GroupsCurrentPayload } | null {
  const hash = memberSetHash(memberIds);
  for (const note of notes) {
    if (!isGroupsCurrentPayload(note.payload)) continue;
    const rowHash = note.member_set_hash ?? note.payload.member_set_hash;
    if (rowHash !== hash) continue;
    if (note.payload.member_set_hash !== hash) continue;
    return { id: note.id, payload: note.payload };
  }
  return null;
}

/**
 * Control-flow guard before `cohortOverlay`: returns the member list only when
 * every entry has a non-null `gen` and the cohort minimum is met. Empty / partial
 * input yields null — callers must not call `cohortOverlay` on null.
 */
export function readyMembersForCohortOverlay<T extends { gen: unknown }>(
  members: ReadonlyArray<{ gen?: T["gen"] | null | undefined } & Omit<T, "gen">>,
  minMembers: number = GROUP_MIN_MEMBERS
): T[] | null {
  if (members.length < minMembers) return null;
  const ready: T[] = [];
  for (const member of members) {
    if (member.gen == null) return null;
    ready.push(member as T);
  }
  if (ready.length === 0) return null;
  return ready;
}

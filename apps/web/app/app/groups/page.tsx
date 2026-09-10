"use client";

import { cohortOverlay, compareGenerational, type FamilyComparePersonInput, type GenSignature, type NatalChart } from "@galaxia/astro";
import {
  OWNED_DELETE_COPY,
  formatGroupDeleteConfirmation,
  hasPassed,
  isBelowGroupMinimum,
  readyMembersForCohortOverlay
} from "@galaxia/core";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { ChartGridSection } from "../../../components/groups/chart-grid-section";
import { GenerationalMap } from "../../../components/groups/generational-map";
import { GroupSelector, type GroupSelectorItem } from "../../../components/groups/group-selector";
import { ManageGroupAccordion, type GroupKind } from "../../../components/groups/manage-group-accordion";
import { PairDynamicsSection } from "../../../components/groups/pair-dynamics-section";
import { InitialAvatar } from "../../../components/initial-avatar";
import { Spinner } from "../../../components/spinner";
import { BODY_GLYPH, SIGN_GLYPH } from "../../../lib/design";
import { fetchGroupsCurrentReading, upsertGroupsCurrentReading } from "../../../lib/groups-cohort";
import {
  capitalizeWord,
  describePartialOverlap,
  faultLinesInterpretation,
  groupSignatureLine,
  sharedSkyPartialOverlaps,
  SHARED_SKY_NO_OVERLAP_NOTE,
  GEN_PLANET_MEANING,
  type CohortOverlayLike,
  type GenPlanetKey,
} from "../../../lib/groups-copy";
import { createSupabaseBrowserClient } from "../../../lib/supabase/client";

interface PersonLite { id: string; display_name: string; passed_at?: string | null; }
interface GroupRow    { id: string; name: string; kind: GroupKind; }

/** Single source of truth for the currently loaded saved group (or null = new draft). */
interface LoadedGroup {
  id: string;
  name: string;
  kind: GroupKind;
  memberIds: string[];
}

interface CohortPairHighlightState { pair: string; summary: string; }

interface CohortState {
  groupLabel: string;
  memberNames: string[];
  memberIds: string[];
  overlay: CohortOverlayLike & { label: string };
  pairHighlights: CohortPairHighlightState[];
}

function sameMembers(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((id) => set.has(id));
}

/**
 * FOUNDER-REVIEW preview titles. Never title an unsaved composition as a saved group.
 * - dirty + loaded: "Unsaved preview, based on {group name}"
 * - dirty / no loaded: "Unsaved preview"
 * - clean + loaded: saved group name
 */
function previewTitle(
  loaded: LoadedGroup | null,
  form: { name: string; kind: GroupKind; memberIds: string[] }
): string {
  if (!loaded) return "Unsaved preview";
  const dirty =
    form.name.trim() !== loaded.name ||
    form.kind !== loaded.kind ||
    !sameMembers(form.memberIds, loaded.memberIds);
  if (dirty) return `Unsaved preview, based on ${loaded.name}`;
  return loaded.name;
}

export default function GroupsPage() {
  return (
    <Suspense fallback={<main className="app-content"><div className="skeleton skeleton-title" /></main>}>
      <GroupsPageInner />
    </Suspense>
  );
}

function GroupsPageInner() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialGroupId = searchParams.get("groupId");
  const paramLoadRef = useRef<string | null>(null);
  const autoSelectRef = useRef(false);
  const autoOpenEmptyRef = useRef(false);

  const [userId, setUserId]               = useState<string|null>(null);
  const [people, setPeople]               = useState<PersonLite[]>([]);
  const [groups, setGroups]               = useState<GroupRow[]>([]);
  const [groupSummaries, setGroupSummaries] = useState<GroupSelectorItem[]>([]);
  /** Currently loaded saved group; null means working on an explicit new draft. */
  const [loadedGroup, setLoadedGroup]     = useState<LoadedGroup|null>(null);
  const [selectedPersonIds, setSelectedPersonIds] = useState<string[]>([]);
  const [groupName, setGroupName]         = useState("");
  const [groupKind, setGroupKind]         = useState<GroupKind>("group");
  const [status, setStatus]               = useState<string|null>(null);
  const [cohort, setCohort]               = useState<CohortState|null>(null);
  const [savingGroup, setSavingGroup]     = useState(false);
  const [buildingOverlay, setBuildingOverlay] = useState(false);
  const [savingReading, setSavingReading] = useState(false);
  const [readingSaved, setReadingSaved]   = useState(false);
  const [askingVela, setAskingVela]       = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteWarning, setDeleteWarning] = useState<string | null>(null);
  const [deletingGroup, setDeletingGroup] = useState(false);
  const [manageOpen, setManageOpen]       = useState(false);
  /** Personal-planet chart grid (any group kind) — independent of the generational cohort above. */
  const [chartGridMembers, setChartGridMembers] = useState<FamilyComparePersonInput[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      await Promise.all([fetchPeople(user.id), fetchGroupSummaries(user.id)]);
    };
    void load();
  }, [supabase]);

  useEffect(() => {
    if (!initialGroupId || !userId || groups.length === 0) return;
    if (paramLoadRef.current === initialGroupId) return;
    paramLoadRef.current = initialGroupId;
    void loadGroup(initialGroupId);
  }, [initialGroupId, userId, groups]);

  // First visit with existing groups and no explicit deep link: land on the
  // most recent group instead of a blank switcher — the dashboard should
  // read as populated immediately, not as an empty admin panel.
  useEffect(() => {
    if (autoSelectRef.current) return;
    if (initialGroupId) return;
    if (!userId || groupSummaries.length === 0) return;
    autoSelectRef.current = true;
    if (!loadedGroup) void loadGroup(groupSummaries[0]!.id);
  }, [userId, groupSummaries, initialGroupId, loadedGroup]);

  // Brand new account with no groups at all: open the editor so there is
  // something to do, instead of a page that reads as empty.
  useEffect(() => {
    if (autoOpenEmptyRef.current) return;
    if (!userId) return;
    if (groupSummaries.length > 0) { autoOpenEmptyRef.current = true; return; }
    autoOpenEmptyRef.current = true;
    setManageOpen(true);
  }, [userId, groupSummaries]);

  // Chart grid: independent of the generational cohort (which requires a
  // computed `generational` signature per member) — this only needs the
  // base chart, so it renders even when the cohort reading can't. Runs off
  // `selectedPersonIds` directly rather than piggybacking on buildOverlay,
  // so it stays populated even when a saved reading is hydrated from a
  // stored note (which skips buildOverlay entirely).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (selectedPersonIds.length < 3) { setChartGridMembers([]); return; }
      const { data: chartRows } = await supabase
        .from("charts")
        .select("person_id, data")
        .in("person_id", selectedPersonIds);
      if (cancelled) return;
      const chartByPerson = new Map((chartRows ?? []).map((r) => [r.person_id as string, r.data as NatalChart]));
      const members: FamilyComparePersonInput[] = people
        .filter((p) => selectedPersonIds.includes(p.id) && chartByPerson.has(p.id))
        .map((p) => ({ id: p.id, name: p.display_name, chart: chartByPerson.get(p.id)!, passed: hasPassed(p) }));
      setChartGridMembers(members);
    })();
    return () => { cancelled = true; };
  }, [selectedPersonIds, people, supabase]);

  const formComposition = useMemo(
    () => ({ name: groupName, kind: groupKind, memberIds: selectedPersonIds }),
    [groupName, groupKind, selectedPersonIds]
  );

  const dirty = useMemo(() => {
    if (!loadedGroup) {
      return (
        groupName.trim().length > 0 ||
        groupKind !== "group" ||
        selectedPersonIds.length > 0
      );
    }
    return (
      groupName.trim() !== loadedGroup.name ||
      groupKind !== loadedGroup.kind ||
      !sameMembers(selectedPersonIds, loadedGroup.memberIds)
    );
  }, [loadedGroup, groupName, groupKind, selectedPersonIds]);

  const cohortTitle = previewTitle(loadedGroup, formComposition);
  const selectedPeople = people.filter(p => selectedPersonIds.includes(p.id));
  const selectedNames = selectedPeople.map(p => p.display_name);
  const loadedBelowMinimum = Boolean(loadedGroup && isBelowGroupMinimum(loadedGroup.memberIds.length));
  /** Persist reading / Ask Vela only for a clean saved group at the create minimum. */
  const canPersistAgainstLoaded = Boolean(loadedGroup) && !dirty && !loadedBelowMinimum;
  const showWorkspace = Boolean(loadedGroup) || dirty;

  const partialOverlaps = useMemo(
    () => (cohort ? sharedSkyPartialOverlaps(cohort.overlay.faultLines, cohort.memberIds.length) : []),
    [cohort]
  );

  async function fetchPeople(uid: string) {
    const { data } = await supabase.from("people").select("id, display_name, passed_at").eq("owner_id", uid).order("display_name");
    setPeople((data ?? []) as PersonLite[]);
  }

  /**
   * Loads saved groups plus everything the selector needs to show an
   * astrological signature per card ("3 members · 2 Pluto signs · 1 fault
   * line") without waiting for a group to be opened. Client-only compute
   * with the same `cohortOverlay` engine the reading uses — never a second
   * astrology implementation, and never a signature when chart data for
   * every member isn't available (no fabricated one-liners).
   */
  async function fetchGroupSummaries(uid: string) {
    const { data: groupRows } = await supabase
      .from("groups")
      .select("id, name, kind")
      .eq("owner_id", uid)
      .order("created_at", { ascending: false });
    const rows = (groupRows ?? []) as GroupRow[];
    setGroups(rows);
    if (rows.length === 0) { setGroupSummaries([]); return; }

    const { data: memberRows } = await supabase
      .from("group_members")
      .select("group_id, person_id")
      .in("group_id", rows.map((r) => r.id));
    const membersByGroup = new Map<string, string[]>();
    for (const r of memberRows ?? []) {
      const gid = r.group_id as string;
      const arr = membersByGroup.get(gid);
      if (arr) arr.push(r.person_id as string); else membersByGroup.set(gid, [r.person_id as string]);
    }
    const personIds = [...new Set((memberRows ?? []).map((r) => r.person_id as string))];

    const nameById = new Map<string, string>();
    const genById = new Map<string, GenSignature | undefined>();
    if (personIds.length > 0) {
      const [{ data: peopleRows }, { data: chartRows }] = await Promise.all([
        supabase.from("people").select("id, display_name").in("id", personIds),
        supabase.from("charts").select("person_id, data").in("person_id", personIds),
      ]);
      for (const p of peopleRows ?? []) nameById.set(p.id as string, p.display_name as string);
      for (const c of chartRows ?? []) genById.set(c.person_id as string, (c.data as NatalChart | undefined)?.generational);
    }

    const summaries: GroupSelectorItem[] = rows.map((g) => {
      const memberIds = membersByGroup.get(g.id) ?? [];
      const members = memberIds.map((id) => ({ id, name: nameById.get(id) ?? "?" }));
      const gens = memberIds.map((id) => genById.get(id)).filter((x): x is GenSignature => Boolean(x));
      const overlay: CohortOverlayLike | null =
        memberIds.length >= 2 && gens.length === memberIds.length
          ? cohortOverlay(memberIds.map((id) => ({ name: nameById.get(id) ?? "?", gen: genById.get(id)! })))
          : null;
      return { id: g.id, name: g.name, kind: g.kind, members, signature: groupSignatureLine(memberIds.length, overlay) };
    });
    setGroupSummaries(summaries);
  }

  const toggleSelection = (id: string) => setSelectedPersonIds(cur => cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id]);

  /** Explicit new-group state: clears loaded group so the next Save creates. */
  function startNewGroup() {
    setLoadedGroup(null);
    setGroupName("");
    setGroupKind("group");
    setSelectedPersonIds([]);
    setCohort(null);
    setReadingSaved(false);
    setStatus(null);
    setConfirmDelete(false);
    setDeleteWarning(null);
    setManageOpen(true);
  }

  async function beginDeleteGroup() {
    if (!loadedGroup) return;
    const { count, error } = await supabase
      .from("threads")
      .select("id", { count: "exact", head: true })
      .eq("group_id", loadedGroup.id);
    if (error) {
      setStatus(error.message);
      return;
    }
    // FOUNDER-REVIEW: formatGroupDeleteConfirmation
    setDeleteWarning(formatGroupDeleteConfirmation(loadedGroup.name, count ?? 0));
    setConfirmDelete(true);
  }

  async function confirmDeleteGroup() {
    if (!loadedGroup || !userId) return;
    setDeletingGroup(true);
    setStatus(null);
    const { error } = await supabase.rpc("delete_own_group", { p_group_id: loadedGroup.id });
    setDeletingGroup(false);
    if (error) {
      setStatus(error.message || OWNED_DELETE_COPY.groupErrorGeneric);
      return;
    }
    startNewGroup();
    setManageOpen(false);
    await fetchGroupSummaries(userId);
    setStatus("Group deleted.");
  }

  async function saveGroup() {
    if (!userId) return;
    if (groupName.trim().length < 2) { setStatus("Give the group a name."); return; }
    if (selectedPersonIds.length < 3) { setStatus("Select at least 3 people for a group."); return; }
    setSavingGroup(true);
    setStatus(null);
    const name = groupName.trim();
    try {
      if (loadedGroup) {
        // UPDATE existing group (same id). Never silently insert a duplicate.
        const { error: gErr } = await supabase
          .from("groups")
          .update({ name, kind: groupKind })
          .eq("id", loadedGroup.id)
          .eq("owner_id", userId);
        if (gErr) { setStatus(gErr.message); return; }

        const prev = new Set(loadedGroup.memberIds);
        const next = new Set(selectedPersonIds);
        const toRemove = loadedGroup.memberIds.filter((id) => !next.has(id));
        const toAdd = selectedPersonIds.filter((id) => !prev.has(id));
        if (toRemove.length > 0) {
          const { error: delErr } = await supabase
            .from("group_members")
            .delete()
            .eq("group_id", loadedGroup.id)
            .in("person_id", toRemove);
          if (delErr) { setStatus(delErr.message); return; }
        }
        if (toAdd.length > 0) {
          const { error: addErr } = await supabase
            .from("group_members")
            .insert(toAdd.map((pid) => ({ group_id: loadedGroup.id, person_id: pid })));
          if (addErr) { setStatus(addErr.message); return; }
        }

        const updated: LoadedGroup = {
          id: loadedGroup.id,
          name,
          kind: groupKind,
          memberIds: [...selectedPersonIds],
        };
        setLoadedGroup(updated);
        setGroupName(name);
        await fetchGroupSummaries(userId);
        // Post-save: reading panel must show this group, not a prior preview.
        await buildOverlay(selectedPersonIds, name, updated);
        setStatus("Group updated.");
      } else {
        // CREATE: only when no group is loaded (explicit new-group state).
        const { data: g, error: gErr } = await supabase
          .from("groups")
          .insert({ owner_id: userId, name, kind: groupKind })
          .select("id, name, kind")
          .single();
        if (gErr || !g) { setStatus(gErr?.message ?? "Unable to create group."); return; }
        const { error: mErr } = await supabase
          .from("group_members")
          .insert(selectedPersonIds.map((pid) => ({ group_id: g.id, person_id: pid })));
        if (mErr) { setStatus(mErr.message); return; }

        const created: LoadedGroup = {
          id: g.id,
          name: g.name,
          kind: g.kind as GroupKind,
          memberIds: [...selectedPersonIds],
        };
        setLoadedGroup(created);
        setGroupName(created.name);
        setGroupKind(created.kind);
        await fetchGroupSummaries(userId);
        await buildOverlay(selectedPersonIds, created.name, created);
        setStatus("Group saved.");
      }
    } finally {
      setSavingGroup(false);
    }
  }

  async function loadGroup(gid: string) {
    let row = groups.find((g) => g.id === gid) ?? null;
    if (!row && userId) {
      const { data } = await supabase
        .from("groups")
        .select("id, name, kind")
        .eq("id", gid)
        .eq("owner_id", userId)
        .maybeSingle();
      if (data) row = data as GroupRow;
    }
    if (!row) return;
    const { data } = await supabase.from("group_members").select("person_id").eq("group_id", gid);
    const ids = (data ?? []).map((r) => r.person_id as string);
    const next: LoadedGroup = {
      id: gid,
      name: row.name,
      kind: row.kind,
      memberIds: ids,
    };
    // Load populates the full model + form (id, name, kind, members).
    setLoadedGroup(next);
    setGroupName(row.name);
    setGroupKind(row.kind);
    setSelectedPersonIds(ids);
    setReadingSaved(false);
    setStatus(null);
    setConfirmDelete(false);
    setDeleteWarning(null);
    setManageOpen(false);

    if (ids.length < 3) {
      setCohort(null);
      if (isBelowGroupMinimum(ids.length)) setStatus(OWNED_DELETE_COPY.belowMinimumNotice);
      return;
    }

    // Hydrate from persisted current reading when roster hash matches — same surface.
    if (userId) {
      const stored = await fetchGroupsCurrentReading(supabase, userId, gid, ids);
      if (stored) {
        setCohort({
          groupLabel: row.name,
          memberNames: stored.state.memberNames,
          memberIds: stored.state.memberIds,
          overlay: stored.state.overlay,
          pairHighlights: stored.state.pairHighlights
        });
        return;
      }
    }
    await buildOverlay(ids, row.name, next);
  }

  /**
   * Build overlay only after member charts are resolved and non-empty
   * (`readyMembersForCohortOverlay` — empty input never reaches cohortOverlay).
   * Upserts notes.groups_current keyed by (group_id, member_set_hash).
   */
  async function buildOverlay(idsArg?: string[], labelArg?: string, persistGroup?: LoadedGroup | null) {
    const ids = idsArg ?? selectedPersonIds;
    const persistFor = persistGroup !== undefined ? persistGroup : loadedGroup;
    if (ids.length < 3) { setStatus("Pick at least 3 people."); return; }
    setBuildingOverlay(true);
    setStatus(null);
    try {
      let sel = people.filter(p => ids.includes(p.id));
      if (sel.length !== ids.length && userId) {
        const { data } = await supabase
          .from("people")
          .select("id, display_name")
          .in("id", ids)
          .eq("owner_id", userId);
        sel = (data ?? []) as PersonLite[];
      }
      if (sel.length !== ids.length) {
        setStatus("Group members not found.");
        setCohort(null);
        return;
      }
      const chartRes = await Promise.all(sel.map(async p => {
        const { data } = await supabase.from("charts").select("data").eq("person_id", p.id).single();
        return { person: p, chart: data?.data as NatalChart|undefined };
      }));
      const candidates = chartRes.map((r) => ({
        name: r.person.display_name,
        id: r.person.id,
        gen: r.chart?.generational as GenSignature | undefined
      }));
      const ready = readyMembersForCohortOverlay<{ name: string; id: string; gen: GenSignature }>(candidates);
      if (!ready) {
        const missing = candidates.find((r) => r.gen == null);
        if (missing) setStatus(`Missing chart for ${missing.name}.`);
        else setStatus("Pick at least 3 people.");
        setCohort(null);
        return;
      }
      const overlay = cohortOverlay(ready.map((r) => ({ name: r.name, gen: r.gen })));
      const pairHighlights: CohortPairHighlightState[] = [];
      for (let i = 0; i < ready.length; i++) {
        for (let j = i + 1; j < ready.length; j++) {
          const a = ready[i]!; const b = ready[j]!;
          const rel = compareGenerational(a.gen, b.gen);
          pairHighlights.push({ pair: `${a.name} × ${b.name}`, summary: rel.sameGeneration ? `Same generation (${rel.shared.map(s => `${s.planet} ${s.sign}`).join(", ")}).` : `Fault line: ${rel.diverged.map(d => `${d.planet} ${d.signA}/${d.signB}`).join(" · ")}.` });
        }
      }
      const label =
        labelArg ??
        previewTitle(loadedGroup, {
          name: groupName,
          kind: groupKind,
          memberIds: ids,
        });
      const memberNames = ready.map((r) => r.name);
      const memberIds = ready.map((r) => r.id);
      const highlights = pairHighlights.slice(0, 3);
      setCohort({ groupLabel: label, memberNames, memberIds, overlay, pairHighlights: highlights });
      setReadingSaved(false);

      if (persistFor && userId) {
        const { error } = await upsertGroupsCurrentReading(supabase, {
          ownerId: userId,
          groupId: persistFor.id,
          groupName: persistFor.name,
          memberIds,
          memberNames,
          overlay,
          pairHighlights: highlights
        });
        if (error) setStatus(error);
      }
    } finally {
      setBuildingOverlay(false);
    }
  }

  /** Save the cohort overlay as an immutable dated reading on the group's record. */
  async function saveCohortReading() {
    if (!userId || !cohort || !loadedGroup || dirty) return;
    setSavingReading(true);
    const body = `Group reading for ${loadedGroup.name}: ${cohort.overlay.label}`;
    const { error } = await supabase.from("notes").insert({
      owner_id: userId, group_id: loadedGroup.id, kind: "cohort_reading", body,
      payload: { overlay: cohort.overlay, pairHighlights: cohort.pairHighlights, memberNames: cohort.memberNames }
    });
    setSavingReading(false);
    if (error) { setStatus(error.message); return; }
    setReadingSaved(true); setStatus("Reading saved to this group.");
  }

  /**
   * Persist a server-computed current overlay (POST /api/groups/cohort runs
   * @galaxia/astro cohortOverlay), then open Vela focused on this group.
   * Uses the loaded saved group id (DB members), never a dirty local draft.
   */
  async function askVelaAboutGroup() {
    if (!loadedGroup || dirty || askingVela) return;
    setAskingVela(true);
    setStatus(null);
    try {
      const res = await fetch("/api/groups/cohort", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId: loadedGroup.id })
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        setStatus(body.error ?? "Could not prepare this group's reading for Vela.");
        return;
      }
      router.push(`/app/vela?scope=group&groupId=${loadedGroup.id}`);
    } finally {
      setAskingVela(false);
    }
  }

  function resolvePairPersonId(name: string): string | null {
    if (!cohort) return null;
    const idx = cohort.memberNames.indexOf(name);
    return idx >= 0 ? cohort.memberIds[idx] ?? null : null;
  }

  return (
    <main className="app-content">
      <p className="eyebrow">Relationship intelligence</p>
      <h1 className="page-title">Groups</h1>
      <p className="muted lede">See each group&apos;s shared sky, its generational fault lines, and how each pair connects.</p>

      {groupSummaries.length > 0 ? (
        <GroupSelector
          groups={groupSummaries}
          activeId={loadedGroup?.id ?? null}
          onSelect={(id) => void loadGroup(id)}
          onCreateNew={startNewGroup}
        />
      ) : (
        <section className="glass-card fade-in">
          <p className="card-title" style={{ marginBottom: 8 }}>Build your first group</p>
          <p className="muted" style={{ fontSize: ".86rem" }}>
            Add three or more people below to see their shared sky and generational fault lines.
          </p>
        </section>
      )}

      {showWorkspace ? (
        <>
          {/* Group hero */}
          <section className="glass-card fade-in">
            <p className="eyebrow" style={{ marginBottom: 8 }}>{groupKind}</p>
            <h2 className="page-title" style={{ marginBottom: 14 }}>{cohortTitle}</h2>
            {selectedNames.length > 0 ? (
              <>
                <div className="avatar-cluster" style={{ marginBottom: 10 }}>
                  {selectedPeople.map((p) => <InitialAvatar key={p.id} name={p.display_name} />)}
                </div>
                <p className="muted" style={{ fontSize: ".82rem", marginBottom: 14 }}>{selectedNames.join(", ")}</p>
              </>
            ) : null}
            {cohort ? (
              <p style={{ fontStyle: "italic", color: "var(--cream)", fontSize: "1rem", lineHeight: 1.5, margin: 0 }}>
                {cohort.overlay.label}
              </p>
            ) : loadedBelowMinimum ? (
              <p className="muted" style={{ fontSize: ".86rem", margin: 0 }}>{OWNED_DELETE_COPY.belowMinimumNotice}</p>
            ) : buildingOverlay ? (
              <p className="muted" style={{ fontSize: ".86rem", margin: 0 }}>Reading this group&apos;s generational sky…</p>
            ) : selectedPersonIds.length > 0 && selectedPersonIds.length < 3 ? (
              <p className="muted" style={{ fontSize: ".86rem", margin: 0 }}>
                Add {3 - selectedPersonIds.length} more {3 - selectedPersonIds.length === 1 ? "person" : "people"} in Manage
                group below to see this group&apos;s shared sky and fault lines.
              </p>
            ) : selectedPersonIds.length === 0 ? (
              <p className="muted" style={{ fontSize: ".86rem", margin: 0 }}>
                Choose members in Manage group below to see this group&apos;s generational signature.
              </p>
            ) : null}
          </section>

          {/* Group reading */}
          {cohort ? (
            <section className="glass-card fade-in fade-in-delay-1">
              <p className="eyebrow" style={{ marginBottom: 10 }}>Group reading</p>
              <p style={{
                fontFamily: "var(--serif)", fontSize: "1.12rem", lineHeight: 1.65, color: "var(--cream)",
                fontStyle: "italic", borderLeft: "2px solid rgba(230,174,108,.3)", paddingLeft: 16, margin: "0 0 22px",
              }}>
                {cohort.overlay.label}
              </p>
              {canPersistAgainstLoaded ? (
                <div style={{ display: "grid", gap: 10 }}>
                  <button
                    className="btn-primary"
                    type="button"
                    onClick={() => void askVelaAboutGroup()}
                    disabled={askingVela}
                    style={{ width: "100%", justifyContent: "center", gap: 9, fontSize: ".95rem" }}
                  >
                    <span aria-hidden="true">✦</span>
                    {askingVela ? "Opening Vela…" : "Ask Vela about this group"}
                  </button>
                  <button
                    className="pill-link"
                    onClick={saveCohortReading}
                    disabled={savingReading || readingSaved}
                    style={{ width: "100%", justifyContent: "center", gap: 8 }}
                  >
                    {savingReading && <Spinner size={12} />}
                    {readingSaved ? "✓ Reading saved" : savingReading ? "Saving…" : "Save this reading"}
                  </button>
                </div>
              ) : (
                <p className="muted" style={{ fontSize: ".8rem", margin: 0 }}>
                  {loadedGroup
                    ? "Save your changes in Manage group below before keeping this reading or asking Vela."
                    : "Save this as a group in Manage group below to keep this reading and ask Vela about it."}
                </p>
              )}
            </section>
          ) : null}

          {/* Generational map */}
          {cohort ? <GenerationalMap memberNames={cohort.memberNames} overlay={cohort.overlay} /> : null}

          {/* Shared sky */}
          {cohort ? (
            <section className="glass-card fade-in">
              <p className="eyebrow" style={{ marginBottom: 10 }}>Shared sky</p>
              {cohort.overlay.sharedSky.length > 0 ? (
                <div style={{ display: "grid", gap: 4 }}>
                  {cohort.overlay.sharedSky.map((item) => (
                    <div key={`${item.planet}-${item.sign}`} className="pl-row">
                      <div className="glyph-sq" style={{ fontSize: ".9rem" }}>{BODY_GLYPH[item.planet]}</div>
                      <div>
                        <div className="pl-body">{capitalizeWord(item.planet)} in {SIGN_GLYPH[item.sign]} {item.sign}</div>
                        <div className="pl-desc">Shared by the whole group</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : partialOverlaps.length > 0 ? (
                <div style={{ display: "grid", gap: 10 }}>
                  {partialOverlaps.map((o) => (
                    <p key={`${o.planet}-${o.sign}`} className="muted" style={{ fontSize: ".86rem", lineHeight: 1.6, margin: 0 }}>
                      {describePartialOverlap(o)}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="muted" style={{ fontSize: ".86rem", lineHeight: 1.6 }}>{SHARED_SKY_NO_OVERLAP_NOTE}</p>
              )}
            </section>
          ) : null}

          {/* Fault lines */}
          {cohort && cohort.overlay.faultLines.length > 0 ? (
            <section className="teal-callout fade-in">
              <p className="eyebrow" style={{ marginBottom: 10 }}>Fault lines</p>
              <p className="muted" style={{ fontSize: ".86rem", lineHeight: 1.6, marginBottom: 18 }}>
                {faultLinesInterpretation(cohort.overlay.faultLines)}
              </p>
              {cohort.overlay.faultLines.map((line) => (
                <div key={line.planet} style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                    <span style={{ fontSize: "1.3rem", color: "var(--gold-soft)" }} aria-hidden="true">{BODY_GLYPH[line.planet]}</span>
                    <strong style={{ color: "var(--teal)", letterSpacing: ".04em" }}>{line.planet.toUpperCase()}</strong>
                  </div>
                  <p className="muted" style={{ fontSize: ".76rem", fontStyle: "italic", marginLeft: 34, marginBottom: 8 }}>
                    {GEN_PLANET_MEANING[line.planet as GenPlanetKey] ?? "a distinctive generational signature"}
                  </p>
                  {line.groups.map((g) => (
                    <div key={`${line.planet}-${g.sign}`} style={{ marginLeft: 34, marginBottom: 4 }}>
                      <span style={{ color: "var(--cream)", fontWeight: 600 }}>{SIGN_GLYPH[g.sign]} {g.sign}</span>
                      <span className="muted" style={{ fontSize: 13 }}> — {g.names.join(", ")}</span>
                    </div>
                  ))}
                </div>
              ))}
            </section>
          ) : null}

          {/* Pair dynamics */}
          {cohort ? (
            <PairDynamicsSection
              items={cohort.pairHighlights}
              resolveId={resolvePairPersonId}
              onOpenPair={(idA, idB) => router.push(`/app/compare?a=${idA}&b=${idB}`)}
            />
          ) : null}

          {/* Chart grid — personal planets, any group kind. */}
          <ChartGridSection members={chartGridMembers} />
        </>
      ) : null}

      <ManageGroupAccordion
        open={manageOpen}
        onToggle={setManageOpen}
        isEditing={Boolean(loadedGroup)}
        people={people}
        groupName={groupName}
        onGroupNameChange={setGroupName}
        groupKind={groupKind}
        onGroupKindChange={setGroupKind}
        selectedPersonIds={selectedPersonIds}
        onToggleMember={toggleSelection}
        loadedBelowMinimum={loadedBelowMinimum}
        belowMinimumNotice={OWNED_DELETE_COPY.belowMinimumNotice}
        savingGroup={savingGroup}
        onSave={() => void saveGroup()}
        buildingOverlay={buildingOverlay}
        onGenerateReading={() => void buildOverlay()}
        canDelete={Boolean(loadedGroup)}
        confirmDelete={confirmDelete}
        deleteWarning={deleteWarning}
        deletingGroup={deletingGroup}
        onBeginDelete={() => void beginDeleteGroup()}
        onConfirmDelete={() => void confirmDeleteGroup()}
        onCancelDelete={() => { setConfirmDelete(false); setDeleteWarning(null); }}
      />

      {status ? <p className={status.startsWith("Group saved") || status.startsWith("Group updated") || status.startsWith("Group deleted") ? "success" : "error"}>{status}</p> : null}
    </main>
  );
}

"use client";

import { cohortOverlay, compareGenerational, type GenSignature, type NatalChart } from "@galaxia/astro";
import {
  OWNED_DELETE_COPY,
  formatGroupDeleteConfirmation,
  isBelowGroupMinimum
} from "@galaxia/core";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { InitialAvatar } from "../../../components/initial-avatar";
import { Spinner } from "../../../components/spinner";
import { BODY_GLYPH, SIGN_GLYPH } from "../../../lib/design";
import { createSupabaseBrowserClient } from "../../../lib/supabase/client";

type GroupKind = "siblings"|"friends"|"family"|"group";
interface PersonLite { id: string; display_name: string; }
interface GroupRow    { id: string; name: string; kind: GroupKind; }

/** Single source of truth for the currently loaded saved group (or null = new draft). */
interface LoadedGroup {
  id: string;
  name: string;
  kind: GroupKind;
  memberIds: string[];
}

const PLANET_LINES: Record<string, string> = {
  Aquarius: "The reformers, wired to question the rules",
  Capricorn: "A pragmatic, build-it kind of dreaming",
  Scorpio: "Intensity, loyalty, all-or-nothing depth",
  Sagittarius: "Restless and free, truth-seeking above all",
  Pisces: "Absorbent, compassionate, permeable to everything",
  Aries: "Pioneer energy, direct and quick to act",
  Taurus: "Steady builders — slow, sensory, lasting",
  Gemini: "Curious, adaptable, always in dialogue",
  Cancer: "Tender, protective, feeding those they love",
  Leo: "Warm and expressive — needing to be seen",
  Virgo: "Devoted to craft, always refining",
  Libra: "Harmony-seeking, beauty as a moral value",
};
function planetLine(sign: string): string { return PLANET_LINES[sign] ?? "A distinctive generation signature"; }

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
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();
  const [userId, setUserId]               = useState<string|null>(null);
  const [people, setPeople]               = useState<PersonLite[]>([]);
  const [groups, setGroups]               = useState<GroupRow[]>([]);
  /** Currently loaded saved group; null means working on an explicit new draft. */
  const [loadedGroup, setLoadedGroup]     = useState<LoadedGroup|null>(null);
  const [selectedPersonIds, setSelectedPersonIds] = useState<string[]>([]);
  const [groupName, setGroupName]         = useState("");
  const [groupKind, setGroupKind]         = useState<GroupKind>("group");
  const [status, setStatus]               = useState<string|null>(null);
  const [cohort, setCohort]               = useState<any>(null);
  const [savingGroup, setSavingGroup]     = useState(false);
  const [buildingOverlay, setBuildingOverlay] = useState(false);
  const [savingReading, setSavingReading] = useState(false);
  const [readingSaved, setReadingSaved]   = useState(false);
  const [askingVela, setAskingVela]       = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteWarning, setDeleteWarning] = useState<string | null>(null);
  const [deletingGroup, setDeletingGroup] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      await Promise.all([fetchPeople(user.id), fetchGroups(user.id)]);
    };
    void load();
  }, [supabase]);

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
  const selectedNames = people.filter(p => selectedPersonIds.includes(p.id)).map(p => p.display_name);
  const loadedBelowMinimum = Boolean(loadedGroup && isBelowGroupMinimum(loadedGroup.memberIds.length));
  /** Persist reading / Ask Vela only for a clean saved group at the create minimum. */
  const canPersistAgainstLoaded = Boolean(loadedGroup) && !dirty && !loadedBelowMinimum;

  async function fetchPeople(uid: string) {
    const { data } = await supabase.from("people").select("id, display_name").eq("owner_id", uid).order("display_name");
    setPeople((data ?? []) as PersonLite[]);
  }
  async function fetchGroups(uid: string) {
    const { data } = await supabase.from("groups").select("id, name, kind").eq("owner_id", uid).order("created_at", { ascending: false });
    setGroups((data ?? []) as GroupRow[]);
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
    await fetchGroups(userId);
    setStatus("Group deleted.");
  }

  async function saveGroup() {
    if (!userId) return;
    if (groupName.trim().length < 2) { setStatus("Give the group a name."); return; }
    if (selectedPersonIds.length < 3) { setStatus("Select at least 3 people for a cohort."); return; }
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
        await fetchGroups(userId);
        // Post-save: reading panel must show this group, not a prior preview.
        await buildOverlay(selectedPersonIds, name);
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
        await fetchGroups(userId);
        await buildOverlay(selectedPersonIds, created.name);
        setStatus("Group saved.");
      }
    } finally {
      setSavingGroup(false);
    }
  }

  async function loadGroup(gid: string) {
    const row = groups.find((g) => g.id === gid);
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
    if (ids.length >= 3) await buildOverlay(ids, row.name);
    else {
      setCohort(null);
      if (isBelowGroupMinimum(ids.length)) setStatus(OWNED_DELETE_COPY.belowMinimumNotice);
    }
  }

  /**
   * Build the overlay locally only (no DB write). Accepts an explicit id list +
   * label so load/save can run without waiting for setState to propagate.
   */
  async function buildOverlay(idsArg?: string[], labelArg?: string) {
    const ids = idsArg ?? selectedPersonIds;
    if (ids.length < 3) { setStatus("Pick at least 3 people."); return; }
    setBuildingOverlay(true);
    setStatus(null);
    try {
      const sel = people.filter(p => ids.includes(p.id));
      const chartRes = await Promise.all(sel.map(async p => {
        const { data } = await supabase.from("charts").select("data").eq("person_id", p.id).single();
        return { person: p, chart: data?.data as NatalChart|undefined };
      }));
      const missing = chartRes.find(r => !r.chart?.generational);
      if (missing) { setStatus(`Missing chart for ${missing.person.display_name}.`); setCohort(null); return; }
      const overlay = cohortOverlay(chartRes.map(r => ({ name: r.person.display_name, gen: r.chart!.generational as GenSignature })));
      const pairHighlights: Array<{ pair: string; summary: string }> = [];
      for (let i = 0; i < chartRes.length; i++) {
        for (let j = i + 1; j < chartRes.length; j++) {
          const a = chartRes[i]; const b = chartRes[j];
          const rel = compareGenerational(a.chart!.generational as GenSignature, b.chart!.generational as GenSignature);
          pairHighlights.push({ pair: `${a.person.display_name} × ${b.person.display_name}`, summary: rel.sameGeneration ? `Same generation (${rel.shared.map(s => `${s.planet} ${s.sign}`).join(", ")}).` : `Fault line: ${rel.diverged.map(d => `${d.planet} ${d.signA}/${d.signB}`).join(" · ")}.` });
        }
      }
      // Label from explicit arg (post-save / load) or from dirty vs loadedGroup.
      const label =
        labelArg ??
        previewTitle(loadedGroup, {
          name: groupName,
          kind: groupKind,
          memberIds: ids,
        });
      setCohort({ groupLabel: label, memberNames: sel.map(p => p.display_name), memberIds: sel.map(p => p.id), overlay, pairHighlights: pairHighlights.slice(0, 3) });
      setReadingSaved(false);
    } finally {
      setBuildingOverlay(false);
    }
  }

  /** Save the cohort overlay as an immutable dated reading on the group's record. */
  async function saveCohortReading() {
    if (!userId || !cohort || !loadedGroup || dirty) return;
    setSavingReading(true);
    const body = `Cohort reading for ${loadedGroup.name}: ${cohort.overlay.label}`;
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
        setStatus(body.error ?? "Could not prepare this group's cohort for Vela.");
        return;
      }
      router.push(`/app/vela?scope=group&groupId=${loadedGroup.id}`);
    } finally {
      setAskingVela(false);
    }
  }

  return (
    <main className="app-content">
      <p className="eyebrow">Cohorts</p>
      <h1 className="page-title">Groups</h1>
      <p className="muted">Build sibling/friend/family sets and see shared sky + generational fault lines.</p>

      {/* Saved groups */}
      <section className="glass-card fade-in">
        <p className="eyebrow" style={{ marginBottom: 10 }}>Saved groups</p>
        {groups.length === 0 ? <p className="muted" style={{ fontSize: 13 }}>No groups yet — create one below.</p> : null}
        <div style={{ display: "grid", gap: 8 }}>
          {groups.map(g => (
            <button key={g.id} onClick={() => loadGroup(g.id)} style={{ textAlign: "left", background: "rgba(255,255,255,.025)", border: `1px solid ${loadedGroup?.id === g.id ? "rgba(230,174,108,.4)" : "rgba(183,154,216,.15)"}`, borderRadius: 14, padding: "12px 16px", cursor: "pointer", transition: "border-color .15s" }}>
              <div style={{ color: loadedGroup?.id === g.id ? "var(--gold)" : "var(--cream)", fontWeight: 600 }}>{g.name}</div>
              <div className="muted" style={{ fontSize: 12 }}>{g.kind}</div>
            </button>
          ))}
        </div>
      </section>

      {/* Create / edit cohort */}
      <section className="glass-card fade-in fade-in-delay-1">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
          <p className="eyebrow" style={{ marginBottom: 0 }}>
            {loadedGroup ? "Edit cohort" : "Create cohort"}
          </p>
          {loadedGroup ? (
            <button type="button" className="pill-link" onClick={startNewGroup} style={{ fontSize: 12, padding: "5px 11px" }}>
              New group
            </button>
          ) : null}
        </div>
        <input className="field" value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="Group name (e.g. Siblings)" style={{ marginBottom: 10 }} />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
          {(["siblings","friends","family","group"] as GroupKind[]).map(k => (
            <button key={k} className="pill-link" style={{ fontSize: 13, padding: "6px 13px", borderColor: groupKind === k ? "rgba(230,174,108,.5)" : undefined, color: groupKind === k ? "var(--gold)" : undefined }} onClick={() => setGroupKind(k)}>{k}</button>
          ))}
        </div>
        <p className="eyebrow" style={{ marginBottom: 8 }}>Select members (3+)</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          {people.map(p => {
            const sel = selectedPersonIds.includes(p.id);
            return (
              <button key={p.id} onClick={() => toggleSelection(p.id)} style={{ display: "flex", alignItems: "center", gap: 7, padding: "6px 12px", border: `1px solid ${sel ? "rgba(230,174,108,.45)" : "rgba(183,154,216,.2)"}`, borderRadius: 100, background: sel ? "rgba(230,174,108,.06)" : "transparent", cursor: "pointer" }}>
                <InitialAvatar name={p.display_name} size="sm" />
                <span style={{ color: sel ? "var(--gold)" : "var(--cream)", fontSize: 13 }}>{p.display_name}</span>
              </button>
            );
          })}
        </div>
        {selectedNames.length > 0 ? (
          <div className="avatar-cluster" style={{ marginBottom: 12 }}>
            {people.filter(p => selectedPersonIds.includes(p.id)).slice(0, 6).map(p => <InitialAvatar key={p.id} name={p.display_name} size="sm" />)}
            {selectedPersonIds.length > 6 ? <span style={{ fontSize: 11, color: "var(--mist2)", marginLeft: 8 }}>+{selectedPersonIds.length - 6}</span> : null}
          </div>
        ) : null}
        {loadedBelowMinimum ? (
          <p className="muted" style={{ fontSize: 13, marginBottom: 10 }}>{OWNED_DELETE_COPY.belowMinimumNotice}</p>
        ) : null}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn-primary" onClick={saveGroup} disabled={savingGroup} style={{ gap: 8 }}>
            {savingGroup && <Spinner size={13} color="#1a1206" />}
            {savingGroup ? (loadedGroup ? "Updating…" : "Saving…") : loadedGroup ? "Update group" : "Save group"}
          </button>
          <button
            className="pill-link"
            onClick={() => buildOverlay()}
            disabled={buildingOverlay || loadedBelowMinimum}
            style={{ gap: 8 }}
          >
            {buildingOverlay && <Spinner size={12} />}
            {buildingOverlay ? "Building…" : "Generate cohort overlay"}
          </button>
          {loadedGroup ? (
            !confirmDelete ? (
              <button
                type="button"
                className="pill-link"
                style={{ borderColor: "rgba(218,140,140,.4)", color: "var(--rose)" }}
                onClick={() => void beginDeleteGroup()}
              >
                Delete group
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="pill-link"
                  style={{ background: "rgba(218,140,140,.15)", borderColor: "var(--rose)", color: "var(--rose)", gap: 8 }}
                  onClick={() => void confirmDeleteGroup()}
                  disabled={deletingGroup}
                >
                  {deletingGroup && <Spinner size={12} color="var(--rose)" />}
                  {deletingGroup ? OWNED_DELETE_COPY.groupConfirmingButton : OWNED_DELETE_COPY.groupConfirmButton}
                </button>
                <button type="button" className="pill-link" onClick={() => { setConfirmDelete(false); setDeleteWarning(null); }}>
                  Cancel
                </button>
              </>
            )
          ) : null}
        </div>
        {confirmDelete && deleteWarning ? (
          <p className="muted" style={{ fontSize: 13, marginTop: 10, color: "var(--rose)" }}>{deleteWarning}</p>
        ) : null}
      </section>

      {/* Cohort results: title is derived from loadedGroup + dirty, never fabricated */}
      {cohort ? (
        <>
          <section className="glass-card fade-in">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div className="avatar-cluster">
                {cohort.memberIds.slice(0,5).map((id: string, i: number) => {
                  const name = cohort.memberNames[i] ?? "?";
                  return <InitialAvatar key={id} name={name} size="sm" />;
                })}
              </div>
              <div>
                <h2 className="card-title" style={{ marginBottom: 0 }}>{cohortTitle}</h2>
                <p className="muted" style={{ fontSize: 12, margin: 0 }}>{cohort.memberNames.join(", ")}</p>
              </div>
            </div>
            <p className="muted" style={{ fontStyle: "italic" }}>{cohort.overlay.label}</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12, alignItems: "center" }}>
              {canPersistAgainstLoaded ? (
                <>
                  <button className="pill-link" onClick={saveCohortReading} disabled={savingReading || readingSaved} style={{ gap: 8 }}>
                    {savingReading && <Spinner size={12} />}
                    {readingSaved ? "✓ Reading saved" : savingReading ? "Saving…" : "Save this reading"}
                  </button>
                  <button className="pill-link" type="button" onClick={() => void askVelaAboutGroup()} disabled={askingVela}>
                    {askingVela ? "Opening Vela…" : "Ask Vela about this group"}
                  </button>
                </>
              ) : (
                <span className="muted" style={{ fontSize: ".76rem" }}>
                  {loadedGroup
                    ? "Save your changes before keeping this reading or asking Vela."
                    : "Save this cohort as a group to keep this reading and ask Vela about it."}
                </span>
              )}
            </div>
          </section>

          <section className="glass-card fade-in">
            <p className="eyebrow" style={{ marginBottom: 10 }}>Shared sky</p>
            {cohort.overlay.sharedSky.length === 0 ? <p className="muted" style={{ fontSize: 13 }}>No full-group shared outer-planet signatures.</p> : null}
            <div style={{ display: "grid", gap: 4 }}>
              {cohort.overlay.sharedSky.map((item: any) => (
                <div key={`${item.planet}-${item.sign}`} className="pl-row">
                  <div className="glyph-sq" style={{ fontSize: ".9rem" }}>{BODY_GLYPH[item.planet]}</div>
                  <div>
                    <div className="pl-body">{item.planet} in {SIGN_GLYPH[item.sign]} {item.sign}</div>
                    <div className="pl-desc">{planetLine(item.sign)}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {cohort.overlay.faultLines.length > 0 ? (
            <section className="teal-callout fade-in">
              <p className="eyebrow" style={{ marginBottom: 10 }}>Fault lines</p>
              {cohort.overlay.faultLines.map((line: any) => (
                <div key={line.planet} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <div className="glyph-sq" style={{ fontSize: ".9rem" }}>{BODY_GLYPH[line.planet]}</div>
                    <strong style={{ color: "var(--teal)" }}>{line.planet.toUpperCase()}</strong>
                  </div>
                  {line.groups.map((g: any) => (
                    <div key={`${line.planet}-${g.sign}`} style={{ marginLeft: 38, marginBottom: 4 }}>
                      <span style={{ color: "var(--cream)", fontWeight: 600 }}>{SIGN_GLYPH[g.sign]} {g.sign}</span>
                      <span className="muted" style={{ fontSize: 13 }}> — {g.names.join(", ")}</span>
                    </div>
                  ))}
                </div>
              ))}
            </section>
          ) : null}

          {cohort.pairHighlights.length > 0 ? (
            <section className="glass-card fade-in">
              <p className="eyebrow" style={{ marginBottom: 10 }}>Pair highlights</p>
              {cohort.pairHighlights.map((item: any) => (
                <div key={item.pair} style={{ borderRadius: 10, border: "1px solid rgba(183,154,216,.12)", padding: "10px 12px", marginBottom: 8, background: "rgba(255,255,255,.015)" }}>
                  <div style={{ color: "var(--cream)", fontWeight: 600, marginBottom: 4 }}>{item.pair}</div>
                  <p className="muted" style={{ margin: 0, fontSize: 13 }}>{item.summary}</p>
                </div>
              ))}
            </section>
          ) : null}
        </>
      ) : null}

      {status ? <p className={status.startsWith("Group saved") || status.startsWith("Group updated") ? "success" : "error"}>{status}</p> : null}
    </main>
  );
}

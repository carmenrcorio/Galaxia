"use client";

import { cohortOverlay, compareGenerational, type GenSignature, type NatalChart } from "@galaxia/astro";
import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "../../../lib/supabase/client";

type GroupKind = "siblings" | "friends" | "family" | "group";

interface PersonLite {
  id: string;
  display_name: string;
}

interface GroupRow {
  id: string;
  name: string;
  kind: GroupKind;
}

export default function GroupsPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [userId, setUserId] = useState<string | null>(null);
  const [people, setPeople] = useState<PersonLite[]>([]);
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedPersonIds, setSelectedPersonIds] = useState<string[]>([]);
  const [groupName, setGroupName] = useState("");
  const [groupKind, setGroupKind] = useState<GroupKind>("group");
  const [status, setStatus] = useState<string | null>(null);
  const [cohort, setCohort] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      await Promise.all([fetchPeople(user.id), fetchGroups(user.id)]);
    };
    void load();
  }, [supabase]);

  const selectedNames = people.filter((person) => selectedPersonIds.includes(person.id)).map((person) => person.display_name);

  async function fetchPeople(uid: string) {
    const { data } = await supabase.from("people").select("id, display_name").eq("owner_id", uid).order("display_name", { ascending: true });
    setPeople((data ?? []) as PersonLite[]);
  }

  async function fetchGroups(uid: string) {
    const { data } = await supabase.from("groups").select("id, name, kind").eq("owner_id", uid).order("created_at", { ascending: false });
    setGroups((data ?? []) as GroupRow[]);
  }

  const toggleSelection = (personId: string) => {
    setSelectedPersonIds((current) => (current.includes(personId) ? current.filter((id) => id !== personId) : [...current, personId]));
  };

  async function saveGroup() {
    if (!userId) return;
    if (groupName.trim().length < 2) {
      setStatus("Give the group a name.");
      return;
    }
    if (selectedPersonIds.length < 3) {
      setStatus("Select at least 3 people for a cohort.");
      return;
    }
    const { data: createdGroup, error: groupError } = await supabase.from("groups").insert({ owner_id: userId, name: groupName.trim(), kind: groupKind }).select("id, name, kind").single();
    if (groupError || !createdGroup) {
      setStatus(groupError?.message ?? "Unable to create group.");
      return;
    }
    const { error: memberError } = await supabase.from("group_members").insert(selectedPersonIds.map((personId) => ({ group_id: createdGroup.id, person_id: personId })));
    if (memberError) {
      setStatus(memberError.message);
      return;
    }
    setGroupName("");
    setGroupKind("group");
    setSelectedPersonIds([]);
    setSelectedGroupId(createdGroup.id);
    await fetchGroups(userId);
    setStatus("Group saved.");
  }

  async function loadGroupMembers(groupId: string) {
    setSelectedGroupId(groupId);
    const { data, error } = await supabase.from("group_members").select("person_id").eq("group_id", groupId);
    if (error) {
      setStatus(error.message);
      return;
    }
    setSelectedPersonIds((data ?? []).map((row) => row.person_id as string));
  }

  async function buildOverlay() {
    if (selectedPersonIds.length < 3) {
      setStatus("Pick at least 3 people to build cohort overlay.");
      return;
    }
    const selectedPeople = people.filter((person) => selectedPersonIds.includes(person.id));
    const chartResponses = await Promise.all(
      selectedPeople.map(async (person) => {
        const { data } = await supabase.from("charts").select("data").eq("person_id", person.id).single();
        return { person, chart: data?.data as NatalChart | undefined };
      })
    );
    const missing = chartResponses.find((response) => !response.chart?.generational);
    if (missing) {
      setStatus(`Missing chart for ${missing.person.display_name}.`);
      return;
    }
    const overlay = cohortOverlay(chartResponses.map((row) => ({ name: row.person.display_name, gen: row.chart!.generational as GenSignature })));
    const pairHighlights: Array<{ pair: string; summary: string }> = [];
    for (let i = 0; i < chartResponses.length; i += 1) {
      for (let j = i + 1; j < chartResponses.length; j += 1) {
        const a = chartResponses[i];
        const b = chartResponses[j];
        const relation = compareGenerational(a.chart!.generational as GenSignature, b.chart!.generational as GenSignature);
        pairHighlights.push({
          pair: `${a.person.display_name} × ${b.person.display_name}`,
          summary: relation.sameGeneration ? `Mostly same generation (${relation.shared.map((item) => `${item.planet} ${item.sign}`).join(", ")}).` : `Fault line: ${relation.diverged.map((item) => `${item.planet} ${item.signA}/${item.signB}`).join(" · ")}.`
        });
      }
    }
    setCohort({
      groupLabel: groups.find((group) => group.id === selectedGroupId)?.name ?? "Ad-hoc cohort",
      memberNames: selectedPeople.map((person) => person.display_name),
      overlay,
      pairHighlights: pairHighlights.slice(0, 3)
    });
    setStatus(null);
  }

  return (
    <main className="container" style={{ padding: "30px 0 80px", display: "grid", gap: 12 }}>
      <h1 className="auth-title">Groups & Cohorts</h1>
      <p className="muted">Build sibling/friend/family sets and see shared sky + generational fault lines.</p>

      <section className="glass-card">
        <h2 style={{ marginTop: 0 }}>Saved groups</h2>
        {groups.length === 0 ? <p className="muted">No groups yet. Create one below.</p> : null}
        <div style={{ display: "grid", gap: 8 }}>
          {groups.map((group) => (
            <button key={group.id} className="glass-card" style={{ textAlign: "left", borderColor: selectedGroupId === group.id ? "var(--gold)" : "var(--line)" }} onClick={() => loadGroupMembers(group.id)}>
              <strong>{group.name}</strong>
              <div className="muted">{group.kind}</div>
            </button>
          ))}
        </div>
      </section>

      <section className="glass-card">
        <h2 style={{ marginTop: 0 }}>Create / edit cohort</h2>
        <input className="field" value={groupName} onChange={(event) => setGroupName(event.target.value)} placeholder="Group name (e.g. Siblings)" />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {(["siblings", "friends", "family", "group"] as GroupKind[]).map((kind) => (
            <button key={kind} className="pill-link" style={{ borderColor: groupKind === kind ? "var(--gold)" : "var(--line)" }} onClick={() => setGroupKind(kind)}>
              {kind}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {people.map((person) => {
            const selected = selectedPersonIds.includes(person.id);
            return (
              <button key={person.id} className="pill-link" style={{ borderColor: selected ? "var(--gold)" : "var(--line)" }} onClick={() => toggleSelection(person.id)}>
                {person.display_name}
              </button>
            );
          })}
        </div>
        <p className="muted">Selected: {selectedNames.length > 0 ? selectedNames.join(", ") : "none"}</p>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="pill-link pill-link--gold" onClick={saveGroup}>
            Save group
          </button>
          <button className="pill-link" onClick={buildOverlay}>
            Generate cohort overlay
          </button>
        </div>
      </section>

      {cohort ? (
        <>
          <section className="glass-card">
            <h2 style={{ marginTop: 0 }}>{cohort.groupLabel}</h2>
            <p className="muted">Members: {cohort.memberNames.join(", ")}</p>
            <p className="muted">{cohort.overlay.label}</p>
          </section>
          <section className="glass-card">
            <h2 style={{ marginTop: 0 }}>Shared sky</h2>
            {cohort.overlay.sharedSky.map((item: any) => (
              <p key={`${item.planet}-${item.sign}`} className="muted">
                {item.planet.toUpperCase()} in {item.sign}
              </p>
            ))}
          </section>
          <section className="glass-card">
            <h2 style={{ marginTop: 0 }}>Fault lines</h2>
            {cohort.overlay.faultLines.length === 0 ? <p className="muted">No major splits.</p> : null}
            {cohort.overlay.faultLines.map((line: any) => (
              <div key={line.planet}>
                <strong>{line.planet.toUpperCase()}</strong>
                {line.groups.map((group: any) => (
                  <p key={`${line.planet}-${group.sign}`} className="muted">
                    {group.sign}: {group.names.join(", ")}
                  </p>
                ))}
              </div>
            ))}
          </section>
        </>
      ) : null}

      {status ? <p className="success">{status}</p> : null}
      <small className="muted">{userId ? "Connected to shared Supabase account." : "Checking session..."}</small>
    </main>
  );
}

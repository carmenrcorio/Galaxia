"use client";

import { cohortOverlay, compareGenerational, type GenSignature, type NatalChart } from "@galaxia/astro";
import { useEffect, useMemo, useState } from "react";
import { InitialAvatar } from "../../../components/initial-avatar";
import { Spinner } from "../../../components/spinner";
import { BODY_GLYPH, SIGN_GLYPH } from "../../../lib/design";
import { createSupabaseBrowserClient } from "../../../lib/supabase/client";

type GroupKind = "siblings"|"friends"|"family"|"group";
interface PersonLite { id: string; display_name: string; }
interface GroupRow    { id: string; name: string; kind: GroupKind; }

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

export default function GroupsPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [userId, setUserId]               = useState<string|null>(null);
  const [people, setPeople]               = useState<PersonLite[]>([]);
  const [groups, setGroups]               = useState<GroupRow[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string|null>(null);
  const [selectedPersonIds, setSelectedPersonIds] = useState<string[]>([]);
  const [groupName, setGroupName]         = useState("");
  const [groupKind, setGroupKind]         = useState<GroupKind>("group");
  const [status, setStatus]               = useState<string|null>(null);
  const [cohort, setCohort]               = useState<any>(null);
  const [savingGroup, setSavingGroup]     = useState(false);
  const [buildingOverlay, setBuildingOverlay] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      await Promise.all([fetchPeople(user.id), fetchGroups(user.id)]);
    };
    void load();
  }, [supabase]);

  const selectedNames = people.filter(p => selectedPersonIds.includes(p.id)).map(p => p.display_name);

  async function fetchPeople(uid: string) {
    const { data } = await supabase.from("people").select("id, display_name").eq("owner_id", uid).order("display_name");
    setPeople((data ?? []) as PersonLite[]);
  }
  async function fetchGroups(uid: string) {
    const { data } = await supabase.from("groups").select("id, name, kind").eq("owner_id", uid).order("created_at", { ascending: false });
    setGroups((data ?? []) as GroupRow[]);
  }
  const toggleSelection = (id: string) => setSelectedPersonIds(cur => cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id]);

  async function saveGroup() {
    if (!userId) return;
    if (groupName.trim().length < 2) { setStatus("Give the group a name."); return; }
    if (selectedPersonIds.length < 3) { setStatus("Select at least 3 people for a cohort."); return; }
    setSavingGroup(true);
    const { data: g, error: gErr } = await supabase.from("groups").insert({ owner_id: userId, name: groupName.trim(), kind: groupKind }).select("id, name, kind").single();
    if (gErr || !g) { setStatus(gErr?.message ?? "Unable to create group."); return; }
    const { error: mErr } = await supabase.from("group_members").insert(selectedPersonIds.map(pid => ({ group_id: g.id, person_id: pid })));
    if (mErr) { setStatus(mErr.message); return; }
    setGroupName(""); setGroupKind("group"); setSelectedPersonIds([]); setSelectedGroupId(g.id);
    await fetchGroups(userId); setSavingGroup(false); setStatus("Group saved.");
  }
  async function loadGroupMembers(gid: string) {
    setSelectedGroupId(gid);
    const { data } = await supabase.from("group_members").select("person_id").eq("group_id", gid);
    const ids = (data ?? []).map(r => r.person_id as string);
    setSelectedPersonIds(ids);
    // One click: selecting a saved group also regenerates its overlay, so the
    // reading is never a dead membership list (audit: saved groups were inert).
    if (ids.length >= 3) await buildOverlay(ids, groups.find(g => g.id === gid)?.name ?? "Cohort");
    else setCohort(null);
  }

  /**
   * Build the overlay. Accepts an explicit id list + label so it can run
   * immediately after selecting a saved group without waiting for setState
   * to propagate (this was the audited "generate twice" bug).
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
      const label = labelArg ?? groups.find(g => g.id === selectedGroupId)?.name ?? "Ad-hoc cohort";
      setCohort({ groupLabel: label, memberNames: sel.map(p => p.display_name), memberIds: sel.map(p => p.id), overlay, pairHighlights: pairHighlights.slice(0, 3) });
    } finally {
      setBuildingOverlay(false);
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
            <button key={g.id} onClick={() => loadGroupMembers(g.id)} style={{ textAlign: "left", background: "rgba(255,255,255,.025)", border: `1px solid ${selectedGroupId === g.id ? "rgba(230,174,108,.4)" : "rgba(183,154,216,.15)"}`, borderRadius: 14, padding: "12px 16px", cursor: "pointer", transition: "border-color .15s" }}>
              <div style={{ color: selectedGroupId === g.id ? "var(--gold)" : "var(--cream)", fontWeight: 600 }}>{g.name}</div>
              <div className="muted" style={{ fontSize: 12 }}>{g.kind}</div>
            </button>
          ))}
        </div>
      </section>

      {/* Create cohort */}
      <section className="glass-card fade-in fade-in-delay-1">
        <p className="eyebrow" style={{ marginBottom: 10 }}>Create / edit cohort</p>
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
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn-primary" onClick={saveGroup} disabled={savingGroup} style={{ gap: 8 }}>
            {savingGroup && <Spinner size={13} color="#1a1206" />}
            {savingGroup ? "Saving…" : "Save group"}
          </button>
          <button className="pill-link" onClick={() => buildOverlay()} disabled={buildingOverlay} style={{ gap: 8 }}>
            {buildingOverlay && <Spinner size={12} />}
            {buildingOverlay ? "Building…" : "Generate cohort overlay"}
          </button>
        </div>
      </section>

      {/* Cohort results */}
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
                <h2 className="card-title" style={{ marginBottom: 0 }}>{cohort.groupLabel}</h2>
                <p className="muted" style={{ fontSize: 12, margin: 0 }}>{cohort.memberNames.join(", ")}</p>
              </div>
            </div>
            <p className="muted" style={{ fontStyle: "italic" }}>{cohort.overlay.label}</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
              {selectedGroupId ? (
                <a className="pill-link" href={`/app/vela?scope=group&groupId=${selectedGroupId}`}>Ask Vela about this group</a>
              ) : (
                <span className="muted" style={{ fontSize: ".76rem" }}>Save this cohort as a group to ask Vela about it.</span>
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

      {status ? <p className={status.startsWith("Group saved") ? "success" : "error"}>{status}</p> : null}
    </main>
  );
}

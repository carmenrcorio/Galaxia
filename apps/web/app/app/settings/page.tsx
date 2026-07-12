"use client";

import type { HouseSystem } from "@galaxia/astro";
import { useEffect, useMemo, useState } from "react";
import { Spinner } from "../../../components/spinner";
import { HOUSE_SYSTEM_OPTIONS, isHouseSystem } from "@galaxia/astro";
import { createSupabaseBrowserClient } from "../../../lib/supabase/client";

interface PersonLite {
  id: string;
  display_name: string;
  relation: string;
}

interface GroupLite {
  id: string;
  name: string;
  kind: string;
}

export default function SettingsPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [people, setPeople] = useState<PersonLite[]>([]);
  const [groups, setGroups] = useState<GroupLite[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [houseSystem, setHouseSystem] = useState<HouseSystem>("placidus");
  const [savingHouseSystem, setSavingHouseSystem] = useState(false);
  const [houseSystemStatus, setHouseSystemStatus] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const [{ data: profile }, { data: peopleRows }, { data: groupRows }] = await Promise.all([
        supabase.from("profiles").select("house_system").eq("id", user.id).maybeSingle(),
        supabase.from("people").select("id, display_name, relation").eq("owner_id", user.id).order("display_name", { ascending: true }),
        supabase.from("groups").select("id, name, kind").eq("owner_id", user.id).order("created_at", { ascending: false })
      ]);
      if (isHouseSystem(profile?.house_system)) setHouseSystem(profile.house_system);
      setPeople((peopleRows ?? []) as PersonLite[]);
      setGroups((groupRows ?? []) as GroupLite[]);
    };
    void load();
  }, [supabase]);

  const changeHouseSystem = async (next: HouseSystem) => {
    if (!userId || next === houseSystem) return;
    setSavingHouseSystem(true); setHouseSystemStatus(null);
    const previous = houseSystem;
    setHouseSystem(next);
    const { error } = await supabase.from("profiles").upsert({ id: userId, house_system: next });
    setSavingHouseSystem(false);
    if (error) { setHouseSystem(previous); setHouseSystemStatus(error.message); return; }
    setHouseSystemStatus("Saved. Each chart recomputes with the new system the next time you open it.");
  };

  const signOut = async () => {
    setSigningOut(true);
    const { error } = await supabase.auth.signOut();
    if (error) { setStatus(error.message); setSigningOut(false); return; }
    window.location.href = "/login";
  };

  return (
    <main className="app-content">
      <p className="eyebrow">Account</p>
      <h1 className="page-title">Settings</h1>

      <section className="glass-card">
        <h2 className="card-title">Subscription</h2>
        <p className="muted">Nothing here is locked. This is the whole product.</p>
        <p className="muted">14 days, everything included. We'll remind you before the trial ends.</p>
      </section>

      <section className="glass-card">
        <h2 className="card-title">House system</h2>
        <p className="muted" style={{ marginBottom: 12 }}>
          How the twelve houses are divided on charts with an exact birth time. Placidus is the default and matches astro.com and Cafe Astrology.
        </p>
        <div style={{ display: "grid", gap: 8 }}>
          {HOUSE_SYSTEM_OPTIONS.map((option) => {
            const active = houseSystem === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => void changeHouseSystem(option.value)}
                disabled={savingHouseSystem}
                aria-pressed={active}
                style={{
                  textAlign: "left", cursor: "pointer", borderRadius: 12, padding: "10px 14px",
                  background: active ? "rgba(230,174,108,.09)" : "rgba(255,255,255,.02)",
                  border: active ? "1px solid rgba(230,174,108,.45)" : "1px solid rgba(183,154,216,.14)"
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: active ? "var(--gold)" : "var(--cream)", fontWeight: 600, fontSize: ".9rem" }}>{option.label}</span>
                  {active ? <span style={{ color: "var(--gold)", fontSize: ".72rem" }}>✓ in use</span> : null}
                  {active && savingHouseSystem ? <Spinner size={11} /> : null}
                </span>
                <span className="muted" style={{ display: "block", fontSize: ".78rem", marginTop: 2 }}>{option.description}</span>
              </button>
            );
          })}
        </div>
        <p className="muted" style={{ fontSize: ".74rem", marginTop: 10 }}>
          Placidus is undefined at polar latitudes (above roughly 66°). If a birth place is inside the polar circles, that chart shows Whole Sign instead — and says so.
        </p>
        {houseSystemStatus ? <p className={houseSystemStatus.startsWith("Saved") ? "success" : "error"} style={{ fontSize: ".78rem", marginTop: 8 }}>{houseSystemStatus}</p> : null}
      </section>

      <section className="glass-card">
        <h2 className="card-title">Privacy</h2>
        <p className="muted">Your private notes are visible only to you — never shared with the person they're about and never included in shared-space Vela conversations.</p>
        <p className="muted">Shared spaces require consent from all participants and are blocked when any participant is a minor.</p>
      </section>

      <section className="glass-card">
        <h2 className="card-title">Your people ({people.length})</h2>
        {people.length === 0 ? (
          <p className="muted">No people yet — add yourself and your circle in <a href="/welcome" style={{ color: "var(--gold)" }}>onboarding</a>.</p>
        ) : null}
        <div style={{ display: "grid", gap: 6 }}>
          {people.map((person) => (
            <div key={person.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
              <span style={{ color: "var(--cream)" }}>{person.display_name}</span>
              <span className="muted" style={{ fontSize: 13 }}>{person.relation}</span>
            </div>
          ))}
        </div>
      </section>

      {groups.length > 0 ? (
        <section className="glass-card">
          <h2 className="card-title">Your groups ({groups.length})</h2>
          <div style={{ display: "grid", gap: 6 }}>
            {groups.map((group) => (
              <div key={group.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
                <span style={{ color: "var(--cream)" }}>{group.name}</span>
                <span className="muted" style={{ fontSize: 13 }}>{group.kind}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <button className="pill-link" onClick={signOut} disabled={signingOut} style={{ gap: 8 }}>
        {signingOut && <Spinner size={12} />}
        {signingOut ? "Signing out…" : "Sign out"}
      </button>
      {status ? <p className="error">{status}</p> : null}
    </main>
  );
}

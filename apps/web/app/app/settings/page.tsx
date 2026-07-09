"use client";

import { useEffect, useMemo, useState } from "react";
import { Spinner } from "../../../components/spinner";
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
  const [tier, setTier] = useState<"free" | "plus">("free");
  const [people, setPeople] = useState<PersonLite[]>([]);
  const [groups, setGroups] = useState<GroupLite[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [{ data: profile }, { data: peopleRows }, { data: groupRows }] = await Promise.all([
        supabase.from("profiles").select("subscription_tier").eq("id", user.id).single(),
        supabase.from("people").select("id, display_name, relation").eq("owner_id", user.id).order("display_name", { ascending: true }),
        supabase.from("groups").select("id, name, kind").eq("owner_id", user.id).order("created_at", { ascending: false })
      ]);
      setTier((profile?.subscription_tier as "free" | "plus") ?? "free");
      setPeople((peopleRows ?? []) as PersonLite[]);
      setGroups((groupRows ?? []) as GroupLite[]);
    };
    void load();
  }, [supabase]);

  const signOut = async () => {
    setSigningOut(true);
    const { error } = await supabase.auth.signOut();
    if (error) { setStatus(error.message); setSigningOut(false); return; }
    window.location.href = "/login";
  };

  return (
    <main className="container app-content">
      <p className="eyebrow">Account</p>
      <h1 className="page-title">Settings</h1>

      <section className="glass-card">
        <h2 className="card-title">Subscription</h2>
        {tier === "plus" ? (
          <p className="muted">You're on <strong style={{ color: "var(--gold)" }}>Galaxia+</strong> — unlimited people, groups, and Vela.</p>
        ) : (
          <>
            <p className="muted">You're on the <strong>Free</strong> plan — up to 5 people and 12 Vela messages per day.</p>
            <div className="upsell-card">
              <p style={{ margin: "0 0 4px", fontFamily: "var(--font-fraunces)", fontSize: 18, color: "var(--cream)" }}>
                Galaxia+ — <em>coming soon</em>
              </p>
              <p className="muted" style={{ margin: "0 0 10px", fontSize: 14 }}>Unlimited people, groups, cohort overlays, and Vela conversations. Early access pricing for founding members.</p>
              <span className="pill-link">Notify me when it's available</span>
            </div>
          </>
        )}
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

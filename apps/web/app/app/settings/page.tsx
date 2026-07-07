"use client";

import { useEffect, useMemo, useState } from "react";
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
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
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

  const switchTier = async () => {
    if (!userId) return;
    const nextTier = tier === "free" ? "plus" : "free";
    const { error } = await supabase.from("profiles").upsert({ id: userId, subscription_tier: nextTier });
    if (error) {
      setStatus(error.message);
      return;
    }
    setTier(nextTier);
    setStatus(nextTier === "plus" ? "Galaxia+ enabled (debug toggle)." : "Switched to free tier.");
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      setStatus(error.message);
      return;
    }
    window.location.href = "/login";
  };

  return (
    <main className="container" style={{ padding: "30px 0 80px", display: "grid", gap: 12 }}>
      <h1 className="auth-title">Settings</h1>

      <section className="glass-card">
        <h2 style={{ marginTop: 0 }}>Subscription</h2>
        <p className="muted">Current plan: {tier === "plus" ? "Galaxia+" : "Free"}</p>
        <button className="pill-link pill-link--gold" onClick={switchTier}>
          {tier === "plus" ? "Switch to Free (debug)" : "Upgrade to Galaxia+ (debug)"}
        </button>
      </section>

      <section className="glass-card">
        <h2 style={{ marginTop: 0 }}>Privacy & shared spaces</h2>
        <p className="muted">Private notes are owner-only and excluded from shared-mode Vela context.</p>
        <p className="muted">Shared spaces require participant consent and are blocked for minor-involved scopes.</p>
      </section>

      <section className="glass-card">
        <h2 style={{ marginTop: 0 }}>People</h2>
        {people.length === 0 ? <p className="muted">No people yet.</p> : null}
        {people.map((person) => (
          <div key={person.id} className="glass-card" style={{ padding: 10 }}>
            <strong>{person.display_name}</strong>
            <div className="muted">{person.relation}</div>
          </div>
        ))}
      </section>

      <section className="glass-card">
        <h2 style={{ marginTop: 0 }}>Groups</h2>
        {groups.length === 0 ? <p className="muted">No groups yet.</p> : null}
        {groups.map((group) => (
          <div key={group.id} className="glass-card" style={{ padding: 10 }}>
            <strong>{group.name}</strong>
            <div className="muted">{group.kind}</div>
          </div>
        ))}
      </section>

      <button className="pill-link" onClick={signOut}>
        Sign out
      </button>
      {status ? <p className="success">{status}</p> : null}
    </main>
  );
}

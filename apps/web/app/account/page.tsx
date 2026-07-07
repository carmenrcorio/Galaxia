"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { publicEnv } from "../../lib/env";
import { createSupabaseBrowserClient } from "../../lib/supabase/client";

export default function AccountPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("Friend");
  const [tier, setTier] = useState<"free" | "plus">("free");
  const [people, setPeople] = useState<string[]>([]);
  const siteUrl = publicEnv.siteUrl || "";

  useEffect(() => {
    const load = async () => {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email ?? "");
      const [{ data: profile }, { count }, { data: sample }] = await Promise.all([
        supabase.from("profiles").select("display_name, subscription_tier").eq("id", user.id).single(),
        supabase.from("people").select("id", { count: "exact", head: true }).eq("owner_id", user.id),
        supabase.from("people").select("display_name").eq("owner_id", user.id).limit(5)
      ]);
      setDisplayName(profile?.display_name ?? user.email?.split("@")[0] ?? "Friend");
      setTier((profile?.subscription_tier as "free" | "plus") ?? "free");
      const firstNames = (sample ?? []).map((row) => row.display_name as string);
      setPeople([String(count ?? 0), ...firstNames]);
    };
    void load();
  }, [supabase]);

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <main className="container" style={{ padding: "50px 0", display: "grid", gap: 12 }}>
      <h1 className="auth-title">Your Galaxia account</h1>
      <p className="muted">
        Signed in as <strong>{displayName}</strong> ({email}).
      </p>
      <section className="glass-card">
        <h2 style={{ marginTop: 0 }}>Constellation summary</h2>
        <p className="muted">
          {people[0] ?? 0} people in your galaxy{people.length > 1 ? ` · ${people.slice(1).join(", ")}` : ""}.
        </p>
        <p className="muted">Entitlement: {tier === "plus" ? "Galaxia+" : "Free"}</p>
      </section>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Link className="pill-link" href="/app">
          Open web app
        </Link>
        <Link className="pill-link" href="/app/settings">
          Settings
        </Link>
        <Link className="pill-link" href="/download">
          Get the app
        </Link>
        <a className="pill-link" href={`${siteUrl}/account`}>
          Open in Galaxia (deep link)
        </a>
      </div>
      <button className="pill-link" onClick={signOut}>
        Sign out
      </button>
    </main>
  );
}

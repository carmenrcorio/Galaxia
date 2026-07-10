"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CosmicBackground } from "../../components/cosmic-background";
import { GetApp } from "../../components/get-app";
import { InitialAvatar } from "../../components/initial-avatar";
import { SignOutButton } from "../../components/sign-out-button";
import { TrialBanner } from "../../components/trial-banner";
import { publicEnv } from "../../lib/env";
import { createSupabaseBrowserClient } from "../../lib/supabase/client";

export default function AccountPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [email, setEmail]           = useState("");
  const [displayName, setDisplayName] = useState("Friend");
  const [peopleCount, setPeopleCount] = useState(0);
  const [sampleNames, setSampleNames] = useState<string[]>([]);
  const siteUrl = publicEnv.siteUrl || "";

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email ?? "");
      const [{ data: profile }, { count }, { data: sample }] = await Promise.all([
        supabase.from("profiles").select("display_name").eq("id", user.id).single(),
        supabase.from("people").select("id", { count: "exact", head: true }).eq("owner_id", user.id),
        supabase.from("people").select("display_name").eq("owner_id", user.id).limit(5)
      ]);
      setDisplayName(profile?.display_name ?? user.email?.split("@")[0] ?? "Friend");
      setPeopleCount(count ?? 0);
      setSampleNames((sample ?? []).map(r => r.display_name as string));
    };
    void load();
  }, [supabase]);

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      <CosmicBackground />

      {/* Nav header — same as app layout */}
      <header style={{ position: "sticky", top: 0, zIndex: 30, borderBottom: "1px solid rgba(183,154,216,.12)", background: "rgba(10,7,23,.72)", backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)" }}>
        <nav className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", gap: 10, flexWrap: "wrap" }}>
          <Link href="/app" style={{ color: "var(--gold)", fontFamily: "var(--font-fraunces)", fontSize: 22 }}>Galaxia</Link>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {[["Galaxia Mea","/app"],["Compare","/app/compare"],["Groups","/app/groups"],["Vela","/app/vela"],["Settings","/app/settings"]].map(([label, href]) => (
              <Link key={href} href={href as never} style={{ color: "var(--mist)", fontSize: 13, fontWeight: 500, padding: "5px 12px", borderRadius: 100 }}>{label}</Link>
            ))}
          </div>
        </nav>
      </header>

      <TrialBanner />

      <main className="app-content">
        <div className="person-row fade-in" style={{ gap: 16 }}>
          <InitialAvatar name={displayName} size="lg" />
          <div>
            <p className="eyebrow">Account</p>
            <h1 className="page-title">{displayName}</h1>
            <p className="muted" style={{ margin: 0, fontSize: 14 }}>{email}</p>
          </div>
        </div>

        {/* Constellation summary */}
        <section className="glass-card fade-in">
          <p className="eyebrow" style={{ marginBottom: 10 }}>Your constellation</p>
          <p className="muted">{peopleCount} {peopleCount === 1 ? "person" : "people"} in your galaxy{sampleNames.length ? ` · ${sampleNames.join(", ")}` : ""}.</p>
          <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>Nothing here is locked. This is the whole product.</p>
        </section>

        {/* Actions */}
        <section className="glass-card fade-in fade-in-delay-1">
          <p className="eyebrow" style={{ marginBottom: 12 }}>Quick actions</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <Link className="btn-primary" href="/app">Open Galaxia Mea</Link>
            <Link className="pill-link" href="/subscribe">Subscribe</Link>
            <Link className="pill-link" href="/account/data">Your data</Link>
            {siteUrl ? <a className="pill-link" href={`${siteUrl}/account`}>Open in app</a> : null}
          </div>
        </section>

        <GetApp source="account" />

        <div style={{ marginTop: 4 }}>
          <SignOutButton />
        </div>
      </main>
    </div>
  );
}

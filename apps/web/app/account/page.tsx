"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CosmicBackground } from "../../components/cosmic-background";
import { GetApp } from "../../components/get-app";
import { InitialAvatar } from "../../components/initial-avatar";
import { SignOutButton } from "../../components/sign-out-button";
import { Spinner } from "../../components/spinner";
import { TrialBanner } from "../../components/trial-banner";
import { publicEnv } from "../../lib/env";
import { createSupabaseBrowserClient } from "../../lib/supabase/client";

export default function AccountPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [userId, setUserId]         = useState<string | null>(null);
  const [email, setEmail]           = useState("");
  // The name the user explicitly set on their profile, and the name on their
  // "self" person record (from onboarding). Kept separate so we can resolve a
  // display name without ever presenting the raw email AS the person's name.
  const [profileName, setProfileName] = useState<string>("");
  const [selfName, setSelfName]       = useState<string>("");
  const [nameDraft, setNameDraft]     = useState("");
  const [savingName, setSavingName]   = useState(false);
  const [nameStatus, setNameStatus]   = useState<string | null>(null);
  const [subStatus, setSubStatus]   = useState<string | null>(null);
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(false);
  const [peopleCount, setPeopleCount] = useState(0);
  const [sampleNames, setSampleNames] = useState<string[]>([]);
  const siteUrl = publicEnv.siteUrl || "";

  // Name resolution: an explicitly-set profile name wins; otherwise fall back
  // to the self-person's name (set during onboarding); otherwise nothing — we
  // prompt for a name rather than showing the login email as if it were one.
  const resolvedName = profileName.trim() || selfName.trim();

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      setEmail(user.email ?? "");
      const [{ data: profile }, { count }, { data: sample }, { data: self }] = await Promise.all([
        supabase.from("profiles").select("display_name, subscription_status, cancel_at_period_end").eq("id", user.id).maybeSingle(),
        supabase.from("people").select("id", { count: "exact", head: true }).eq("owner_id", user.id),
        supabase.from("people").select("display_name").eq("owner_id", user.id).limit(5),
        supabase.from("people").select("display_name").eq("owner_id", user.id).eq("is_self", true).maybeSingle()
      ]);
      const pName = (profile?.display_name as string | null)?.trim() ?? "";
      const sName = (self?.display_name as string | null)?.trim() ?? "";
      setProfileName(pName);
      setSelfName(sName);
      // Pre-fill the editable field with the best name we have so saving it is
      // one tap — but never pre-fill it with the email.
      setNameDraft(pName || sName);
      setSubStatus((profile?.subscription_status as string | null) ?? null);
      setCancelAtPeriodEnd(Boolean(profile?.cancel_at_period_end));
      setPeopleCount(count ?? 0);
      setSampleNames((sample ?? []).map(r => r.display_name as string));
    };
    void load();
  }, [supabase]);

  const saveName = async () => {
    if (!userId) return;
    const next = nameDraft.trim();
    if (!next || next === profileName.trim()) return;
    setSavingName(true); setNameStatus(null);
    const { error } = await supabase.from("profiles").upsert({ id: userId, display_name: next });
    setSavingName(false);
    if (error) { setNameStatus(error.message); return; }
    setProfileName(next);
    setNameStatus("Saved.");
  };

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      <CosmicBackground />

      {/* Nav header — same as app layout */}
      <header style={{ position: "sticky", top: 0, zIndex: 30, borderBottom: "1px solid rgba(183,154,216,.12)", background: "rgba(10,7,23,.72)", backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)" }}>
        <nav className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 10, paddingBottom: 10, gap: 10, flexWrap: "wrap" }}>
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
          <InitialAvatar name={resolvedName || "?"} size="lg" />
          <div>
            <p className="eyebrow">Account</p>
            {resolvedName ? (
              <h1 className="page-title">{resolvedName}</h1>
            ) : (
              // No name yet — prompt for one instead of showing the raw email as a name.
              <h1 className="page-title" style={{ color: "var(--mist2)", fontStyle: "italic", fontWeight: 400 }}>Add your name</h1>
            )}
            <p className="muted" style={{ margin: 0, fontSize: 14 }}>{email}</p>
          </div>
        </div>

        {/* Your profile — set the name shown across your account */}
        <section className="glass-card fade-in">
          <p className="eyebrow" style={{ marginBottom: 10 }}>Your profile</p>
          <label htmlFor="account-name" className="muted" style={{ display: "block", fontSize: 13, marginBottom: 6 }}>
            First name (or whatever you'd like to be called)
          </label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <input
              id="account-name"
              className="field"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              placeholder="Your name"
              maxLength={80}
              style={{ flex: "1 1 220px", minWidth: 0 }}
            />
            <button
              className="btn-primary"
              onClick={() => void saveName()}
              disabled={savingName || !nameDraft.trim() || nameDraft.trim() === profileName.trim()}
              style={{ gap: 8 }}
            >
              {savingName && <Spinner size={12} color="#1a1206" />}
              {savingName ? "Saving…" : "Save name"}
            </button>
          </div>
          {!profileName && selfName ? (
            <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>
              Using the name from your own chart ({selfName}) until you set one here.
            </p>
          ) : null}
          <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>
            {email} stays your login — it's never shown as your name.
          </p>
          {nameStatus ? (
            <p className={nameStatus === "Saved." ? "success" : "error"} style={{ fontSize: 13, marginTop: 8 }}>{nameStatus}</p>
          ) : null}
        </section>

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
            {(subStatus === "active" || subStatus === "past_due") && !cancelAtPeriodEnd ? (
              <Link className="pill-link" href="/account/cancel">Cancel subscription</Link>
            ) : subStatus === "lifetime" || cancelAtPeriodEnd ? null : (
              <Link className="pill-link" href="/subscribe">Subscribe</Link>
            )}
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

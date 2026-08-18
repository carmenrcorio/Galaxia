"use client";

import { joinFullName, resolveAccountName, splitFullName } from "@galaxia/core";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChangePassword } from "../../components/change-password";
import { CosmicBackground } from "../../components/cosmic-background";
import { GetApp } from "../../components/get-app";
import { InitialAvatar } from "../../components/initial-avatar";
import { SignOutButton } from "../../components/sign-out-button";
import { Spinner } from "../../components/spinner";
import { TrialBanner } from "../../components/trial-banner";
import { createSupabaseBrowserClient } from "../../lib/supabase/client";

export default function AccountPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [userId, setUserId]         = useState<string | null>(null);
  const [email, setEmail]           = useState("");
  // The name the user explicitly set on their profile, and the name on their
  // "self" person record (from onboarding). Kept separate and handed to the
  // shared resolver, which is the only thing that decides which one wins.
  const [profileName, setProfileName] = useState<string>("");
  const [selfName, setSelfName]       = useState<string>("");
  const [firstDraft, setFirstDraft]   = useState("");
  const [lastDraft, setLastDraft]     = useState("");
  // The name fields render before the profile fetch lands, so someone can start
  // typing into them first. Once they have, the fetch must not seed over what
  // they typed.
  const nameEdited = useRef(false);
  const [savingName, setSavingName]   = useState(false);
  const [nameStatus, setNameStatus]   = useState<string | null>(null);
  const [subStatus, setSubStatus]   = useState<string | null>(null);
  const [comped, setComped] = useState(false);
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(false);
  const [peopleCount, setPeopleCount] = useState(0);
  const [sampleNames, setSampleNames] = useState<string[]>([]);

  // One shared decision, identical to every other surface that names the user
  // (see @galaxia/core resolveAccountName). The email is only ever the identity
  // label when no name exists, never the name itself.
  const account = resolveAccountName({ profileDisplayName: profileName, selfPersonName: selfName, email });
  const nameDraft = joinFullName(firstDraft, lastDraft);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      setEmail(user.email ?? "");
      const [{ data: profile }, { count }, { data: sample }, { data: self }] = await Promise.all([
        supabase.from("profiles").select("display_name, subscription_status, cancel_at_period_end, comped").eq("id", user.id).maybeSingle(),
        supabase.from("people").select("id", { count: "exact", head: true }).eq("owner_id", user.id),
        supabase.from("people").select("display_name").eq("owner_id", user.id).limit(5),
        supabase.from("people").select("display_name").eq("owner_id", user.id).eq("is_self", true).maybeSingle()
      ]);
      const pName = (profile?.display_name as string | null)?.trim() ?? "";
      const sName = (self?.display_name as string | null)?.trim() ?? "";
      setProfileName(pName);
      setSelfName(sName);
      // Pre-fill the editable fields with the best name we have so saving it is
      // one tap. `resolveAccountName().name` is never an email, so the fields
      // can never be seeded with one.
      if (!nameEdited.current) {
        const seeded = splitFullName(resolveAccountName({ profileDisplayName: pName, selfPersonName: sName }).name);
        setFirstDraft(seeded.firstName);
        setLastDraft(seeded.lastName);
      }
      setSubStatus((profile?.subscription_status as string | null) ?? null);
      setComped(profile?.comped === true);
      setCancelAtPeriodEnd(Boolean(profile?.cancel_at_period_end));
      setPeopleCount(count ?? 0);
      setSampleNames((sample ?? []).map(r => r.display_name as string));
    };
    void load();
  }, [supabase]);

  const saveName = async () => {
    if (!userId) return;
    // One stored value in profiles.display_name, joined from the two fields, so
    // there is still exactly one field anything reads.
    const next = nameDraft;
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
          <InitialAvatar name={account.name ?? "?"} size="lg" />
          <div>
            <p className="eyebrow">Account</p>
            {/* Name when there is one. Only when a name is genuinely absent does
                the header fall back to the email, which identifies the account
                without pretending to be a name. */}
            <h1 className="page-title">{account.identityLabel ?? ""}</h1>
            {account.hasName ? (
              <p className="muted" style={{ margin: 0, fontSize: 14 }}>{email}</p>
            ) : (
              // FOUNDER-REVIEW: authored prompt shown when no name is stored yet.
              <p className="muted" style={{ margin: 0, fontSize: 14 }}>
                No name saved yet, so your email is standing in. Add your name below.
              </p>
            )}
          </div>
        </div>

        {/* Your profile — set the name shown across your account */}
        <section className="glass-card fade-in">
          <p className="eyebrow" style={{ marginBottom: 10 }}>Your profile</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div style={{ flex: "1 1 160px", minWidth: 0 }}>
              {/* FOUNDER-REVIEW: authored name field labels. */}
              <label htmlFor="account-first-name" className="muted" style={{ display: "block", fontSize: 13, marginBottom: 6 }}>
                First name
              </label>
              <input
                id="account-first-name"
                className="field"
                value={firstDraft}
                onChange={(e) => { nameEdited.current = true; setFirstDraft(e.target.value); }}
                autoComplete="given-name"
                maxLength={80}
                style={{ width: "100%" }}
              />
            </div>
            <div style={{ flex: "1 1 160px", minWidth: 0 }}>
              <label htmlFor="account-last-name" className="muted" style={{ display: "block", fontSize: 13, marginBottom: 6 }}>
                Last name
              </label>
              <input
                id="account-last-name"
                className="field"
                value={lastDraft}
                onChange={(e) => { nameEdited.current = true; setLastDraft(e.target.value); }}
                autoComplete="family-name"
                maxLength={80}
                style={{ width: "100%" }}
              />
            </div>
            <button
              className="btn-primary"
              onClick={() => void saveName()}
              disabled={savingName || !nameDraft || nameDraft === profileName.trim()}
              style={{ gap: 8 }}
            >
              {savingName && <Spinner size={12} color="#1a1206" />}
              {savingName ? "Saving…" : "Save name"}
            </button>
          </div>
          {account.source === "self-person" ? (
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

        <ChangePassword />

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
            {comped ? null : (subStatus === "active" || subStatus === "past_due") && !cancelAtPeriodEnd ? (
              <Link className="pill-link" href="/account/cancel">Cancel subscription</Link>
            ) : subStatus === "lifetime" || cancelAtPeriodEnd ? null : (
              <Link className="pill-link" href="/subscribe">Subscribe</Link>
            )}
            <Link className="pill-link" href="/account/data">Your data</Link>
            {/* No "Open in app" button here. There is no app to open: it linked
                to NEXT_PUBLIC_SITE_URL/account, which is this same web page, and
                the card directly below already says iOS and Android are coming
                and offers the launch notification. A button that implies an
                installed app the user can open right now is a claim the product
                cannot honour, so it is gone until mobile actually ships. */}
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

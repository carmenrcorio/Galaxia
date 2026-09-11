"use client";

import type { HouseSystem } from "@galaxia/astro";
import { Purchases } from "@revenuecat/purchases-js";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Spinner } from "../../../components/spinner";
import { HOUSE_SYSTEM_OPTIONS, isHouseSystem } from "@galaxia/astro";
import { publicEnv } from "../../../lib/env";
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

/** Generations Feature 3 preference — mirrors the `profiles.relational_transit_alerts` check constraint. */
type RelationalTransitAlertsPref = "all" | "major_only" | "off";
const RELATIONAL_TRANSIT_ALERTS_OPTIONS: { value: RelationalTransitAlertsPref; label: string; description: string }[] = [
  // FOUNDER-REVIEW: rewritten (no U+2014).
  { value: "all", label: "All transits", description: "Jupiter, Saturn, Uranus, Neptune, and Pluto: every relational transit we find." },
  { value: "major_only", label: "Major only", description: "Just Saturn, Uranus, and Pluto. Skip the lighter Jupiter and Neptune windows." },
  { value: "off", label: "Off", description: "No relational transit alerts, in the app or by push." },
];
function isRelationalTransitAlertsPref(value: unknown): value is RelationalTransitAlertsPref {
  return value === "all" || value === "major_only" || value === "off";
}

function formatDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

async function fetchManagementUrl(userId: string): Promise<string | null> {
  if (!publicEnv.revenueCatPublicKey) return null;
  try {
    if (!Purchases.isConfigured()) {
      Purchases.configure({ apiKey: publicEnv.revenueCatPublicKey, appUserId: userId });
    }
    const info = await Purchases.getSharedInstance().getCustomerInfo();
    return info.managementURL;
  } catch {
    return null;
  }
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

  const [dailyNudgeEmailsEnabled, setDailyNudgeEmailsEnabled] = useState(true);
  const [savingConsent, setSavingConsent] = useState(false);
  const [consentStatus, setConsentStatus] = useState<string | null>(null);

  const [relationalTransitAlerts, setRelationalTransitAlerts] = useState<RelationalTransitAlertsPref>("all");
  const [savingRelationalPref, setSavingRelationalPref] = useState(false);
  const [relationalPrefStatus, setRelationalPrefStatus] = useState<string | null>(null);

  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [supportSubject, setSupportSubject] = useState("");
  const [supportBody, setSupportBody] = useState("");
  const [submittingSupport, setSubmittingSupport] = useState(false);
  const [supportStatus, setSupportStatus] = useState<string | null>(null);

  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState<string | null>(null);
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(false);
  const [comped, setComped] = useState(false);
  const [managementUrl, setManagementUrl] = useState<string | null>(null);
  const [managementLoaded, setManagementLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      setAccountEmail(user.email ?? null);
      const [{ data: profile }, { data: peopleRows }, { data: groupRows }] = await Promise.all([
        supabase
          .from("profiles")
          .select("house_system, subscription_status, trial_ends_at, current_period_end, cancel_at_period_end, comped, daily_nudge_emails_enabled, relational_transit_alerts")
          .eq("id", user.id)
          .maybeSingle(),
        supabase.from("people").select("id, display_name, relation").eq("owner_id", user.id).order("display_name", { ascending: true }),
        supabase.from("groups").select("id, name, kind").eq("owner_id", user.id).order("created_at", { ascending: false })
      ]);
      if (isHouseSystem(profile?.house_system)) setHouseSystem(profile.house_system);
      // Column default is true (opt-out, default-on); null only precedes the
      // migration landing on a not-yet-refreshed row, so treat null as on too.
      setDailyNudgeEmailsEnabled(profile?.daily_nudge_emails_enabled !== false);
      // Column default is 'all'; treat any unrecognized/missing value as
      // 'all' too rather than fabricating a different preference.
      setRelationalTransitAlerts(isRelationalTransitAlertsPref(profile?.relational_transit_alerts) ? profile.relational_transit_alerts : "all");
      setSubscriptionStatus((profile?.subscription_status as string | null) ?? null);
      setTrialEndsAt((profile?.trial_ends_at as string | null) ?? null);
      setCurrentPeriodEnd((profile?.current_period_end as string | null) ?? null);
      setCancelAtPeriodEnd(Boolean(profile?.cancel_at_period_end));
      setComped(profile?.comped === true);
      setPeople((peopleRows ?? []) as PersonLite[]);
      setGroups((groupRows ?? []) as GroupLite[]);

      const url = await fetchManagementUrl(user.id);
      setManagementUrl(url);
      setManagementLoaded(true);
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

  const changeDailyNudgeEmails = async (next: boolean) => {
    if (!userId || next === dailyNudgeEmailsEnabled) return;
    setSavingConsent(true); setConsentStatus(null);
    const previous = dailyNudgeEmailsEnabled;
    setDailyNudgeEmailsEnabled(next);
    const { error } = await supabase.from("profiles").update({ daily_nudge_emails_enabled: next }).eq("id", userId);
    setSavingConsent(false);
    if (error) { setDailyNudgeEmailsEnabled(previous); setConsentStatus(error.message); return; }
    setConsentStatus(next ? "Saved. Daily sky emails are on." : "Saved. Daily sky emails are off.");
  };

  const changeRelationalTransitAlerts = async (next: RelationalTransitAlertsPref) => {
    if (!userId || next === relationalTransitAlerts) return;
    setSavingRelationalPref(true); setRelationalPrefStatus(null);
    const previous = relationalTransitAlerts;
    setRelationalTransitAlerts(next);
    const { error } = await supabase.from("profiles").update({ relational_transit_alerts: next }).eq("id", userId);
    setSavingRelationalPref(false);
    if (error) { setRelationalTransitAlerts(previous); setRelationalPrefStatus(error.message); return; }
    setRelationalPrefStatus("Saved.");
  };

  const submitSupportRequest = async () => {
    if (!userId) return;
    const subject = supportSubject.trim();
    const body = supportBody.trim();
    if (!subject || !body) {
      setSupportStatus("Please fill in both the subject and message.");
      return;
    }
    setSubmittingSupport(true);
    setSupportStatus(null);
    // Direct insert via the signed-in session client — the owner-insert RLS
    // policy on support_requests (owner_id = auth.uid()) is what allows
    // this to land; there is no select policy, so this never reads the row
    // back (no `.select()` chained — that alone requires a select grant
    // this table intentionally does not have).
    const { error } = await supabase.from("support_requests").insert({
      owner_id: userId,
      email: accountEmail ?? "",
      subject,
      body
    });
    setSubmittingSupport(false);
    if (error) {
      setSupportStatus(error.message);
      return;
    }
    setSupportSubject("");
    setSupportBody("");
    setSupportStatus("Sent. We'll follow up by email.");
  };

  const signOut = async () => {
    setSigningOut(true);
    const { error } = await supabase.auth.signOut();
    if (error) { setStatus(error.message); setSigningOut(false); return; }
    window.location.href = "/login";
  };

  const trialLabel = formatDate(trialEndsAt);
  const periodLabel = formatDate(currentPeriodEnd);
  const canCancel =
    !comped &&
    (subscriptionStatus === "active" || subscriptionStatus === "past_due") &&
    !cancelAtPeriodEnd;
  const showBillingControls =
    !comped &&
    (subscriptionStatus === "active" ||
      subscriptionStatus === "past_due" ||
      (subscriptionStatus === "canceled" && Boolean(managementUrl)));

  // FOUNDER-REVIEW: Settings subscription card copy — refine voice.
  let subscriptionCopy: string;
  if (comped) {
    // FOUNDER-REVIEW: permanent comp access — not a subscription, not a trial.
    subscriptionCopy = "Permanent access. This account is complimentary: you are not billed.";
  } else if (subscriptionStatus === "trialing") {
    subscriptionCopy = trialLabel
      ? `Trial ends ${trialLabel}.`
      : "You're on a trial.";
  } else if (subscriptionStatus === "active" && cancelAtPeriodEnd) {
    subscriptionCopy = periodLabel
      ? `Canceled. Access until ${periodLabel}.`
      : "Canceled. Access continues until the end of your current period.";
  } else if (subscriptionStatus === "active") {
    subscriptionCopy = periodLabel
      ? `Active. Renews ${periodLabel}.`
      : "Active.";
  } else if (subscriptionStatus === "past_due") {
    subscriptionCopy = "Past due. Update your payment method to keep access.";
  } else if (subscriptionStatus === "canceled") {
    subscriptionCopy = periodLabel
      ? `Your subscription ended ${periodLabel}.`
      : "Your subscription has ended.";
  } else if (subscriptionStatus === "lifetime") {
    subscriptionCopy = "Lifetime access.";
  } else if (subscriptionStatus) {
    subscriptionCopy = `Status: ${subscriptionStatus}.`;
  } else {
    subscriptionCopy = "Loading subscription…";
  }

  return (
    <main className="app-content">
      <p className="eyebrow">Account</p>
      <h1 className="page-title">Settings</h1>

      <section className="glass-card">
        <h2 className="card-title">Subscription</h2>
        <p className="muted" style={{ margin: 0, lineHeight: 1.6 }}>{subscriptionCopy}</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 14 }}>
          {canCancel ? (
            <Link className="btn-primary" href="/account/cancel?from=settings">
              Cancel subscription
            </Link>
          ) : null}
          {!comped && (subscriptionStatus === "trialing" || subscriptionStatus === "canceled") ? (
            <Link className="pill-link" href="/subscribe">Subscribe</Link>
          ) : null}
          {showBillingControls && managementLoaded ? (
            managementUrl ? (
              <a className="pill-link" href={managementUrl} target="_blank" rel="noopener noreferrer">
                Manage billing
              </a>
            ) : (
              <a
                className="pill-link"
                href="mailto:support@galaxia.app?subject=Manage%20billing"
              >
                Email support about billing
              </a>
            )
          ) : null}
        </div>
        {subscriptionStatus === "active" && cancelAtPeriodEnd && managementUrl ? (
          <p className="muted" style={{ fontSize: ".78rem", marginTop: 10, marginBottom: 0 }}>
            Changed your mind? You can turn renewal back on in Manage billing.
          </p>
        ) : null}
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
          Placidus is undefined at polar latitudes (above roughly 66°). If a birth place is inside the polar circles, that chart shows Whole Sign instead: and says so.
        </p>
        {houseSystemStatus ? <p className={houseSystemStatus.startsWith("Saved") ? "success" : "error"} style={{ fontSize: ".78rem", marginTop: 8 }}>{houseSystemStatus}</p> : null}
      </section>

      <section className="glass-card">
        <h2 className="card-title">Daily sky email</h2>
        {/* FOUNDER-REVIEW: Daily sky email card copy, voice pass pending. */}
        <p className="muted" style={{ marginBottom: 12 }}>
          A short email with what's moving in your sky today, sent once a day. On by default. Turn it off any time here, no login required (every email also has a one-click unsubscribe link).
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            onClick={() => void changeDailyNudgeEmails(!dailyNudgeEmailsEnabled)}
            disabled={savingConsent}
            aria-pressed={dailyNudgeEmailsEnabled}
            className="pill-link"
            style={{ cursor: "pointer" }}
          >
            {dailyNudgeEmailsEnabled ? "On (turn off)" : "Off (turn on)"}
          </button>
          {savingConsent ? <Spinner size={11} /> : null}
        </div>
        {consentStatus ? <p className={consentStatus.startsWith("Saved") ? "success" : "error"} style={{ fontSize: ".78rem", marginTop: 8 }}>{consentStatus}</p> : null}
      </section>

      <section className="glass-card">
        <h2 className="card-title">Generational transit alerts</h2>
        <p className="muted" style={{ marginBottom: 12 }}>
          "This week" alerts when a slow-moving transit is hitting two or more people in your constellation at once: the sky's dynamic between you, not just what one of you is feeling alone.
        </p>
        <div style={{ display: "grid", gap: 8 }}>
          {RELATIONAL_TRANSIT_ALERTS_OPTIONS.map((option) => {
            const active = relationalTransitAlerts === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => void changeRelationalTransitAlerts(option.value)}
                disabled={savingRelationalPref}
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
                  {active && savingRelationalPref ? <Spinner size={11} /> : null}
                </span>
                <span className="muted" style={{ display: "block", fontSize: ".78rem", marginTop: 2 }}>{option.description}</span>
              </button>
            );
          })}
        </div>
        {relationalPrefStatus ? <p className={relationalPrefStatus.startsWith("Saved") ? "success" : "error"} style={{ fontSize: ".78rem", marginTop: 8 }}>{relationalPrefStatus}</p> : null}
      </section>

      <section className="glass-card">
        <h2 className="card-title">Privacy</h2>
        <p className="muted">Your private notes are visible only to you: never shared with the person they're about and never included in shared-space Vela conversations.</p>
        <p className="muted">Shared spaces require consent from all participants and are blocked when any participant is a minor.</p>
        <p className="muted" style={{ marginTop: 10 }}>
          Export your data or delete your account from{" "}
          <a href="/account/data" style={{ color: "var(--gold)" }}>Your data</a>.
        </p>
        {/* FOUNDER-REVIEW: authored pointer to the password control. It lives on
            Account, next to your name, rather than being duplicated here. */}
        <p className="muted" style={{ marginTop: 10 }}>
          Change your password from{" "}
          <a href="/account" style={{ color: "var(--gold)" }}>Account</a>.
        </p>
      </section>

      <section className="glass-card">
        <h2 className="card-title">Contact support</h2>
        <p className="muted" style={{ marginBottom: 12 }}>
          Send us a note: we'll reply to {accountEmail ?? "the email on this account"}.
        </p>
        <div style={{ display: "grid", gap: 10 }}>
          <input
            type="text"
            className="field field--rect"
            placeholder="Subject"
            value={supportSubject}
            onChange={(e) => setSupportSubject(e.target.value)}
            disabled={submittingSupport}
            maxLength={200}
          />
          <textarea
            className="field field--rect"
            placeholder="What's going on?"
            rows={4}
            value={supportBody}
            onChange={(e) => setSupportBody(e.target.value)}
            disabled={submittingSupport}
            maxLength={4000}
          />
          <button
            type="button"
            className="pill-link"
            style={{ width: "fit-content", cursor: "pointer" }}
            onClick={() => void submitSupportRequest()}
            disabled={submittingSupport || !supportSubject.trim() || !supportBody.trim()}
          >
            {submittingSupport && <Spinner size={11} />}
            {submittingSupport ? "Sending…" : "Send"}
          </button>
        </div>
        {supportStatus ? (
          <p className={supportStatus.startsWith("Sent") ? "success" : "error"} style={{ fontSize: ".78rem", marginTop: 8 }}>
            {supportStatus}
          </p>
        ) : null}
      </section>

      <section className="glass-card">
        <h2 className="card-title">Your people ({people.length})</h2>
        {people.length === 0 ? (
          <p className="muted">No people yet: add yourself and your circle in <a href="/welcome" style={{ color: "var(--gold)" }}>onboarding</a>.</p>
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

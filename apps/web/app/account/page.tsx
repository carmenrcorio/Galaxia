import Link from "next/link";
import { GetApp } from "../../components/get-app";
import { SignOutButton } from "../../components/sign-out-button";
import { SmartAppBanner } from "../../components/smart-app-banner";
import { publicEnv } from "../../lib/env";
import { requireUser } from "../../lib/supabase/require-user";

export default async function AccountPage() {
  const { supabase, user } = await requireUser("/account");
  const [{ data: profile }, { count: peopleCount }, { data: samplePeople }] = await Promise.all([
    supabase.from("profiles").select("display_name, subscription_tier").eq("id", user.id).single(),
    supabase.from("people").select("id", { count: "exact", head: true }).eq("owner_id", user.id),
    supabase.from("people").select("display_name").eq("owner_id", user.id).limit(5)
  ]);

  const displayName = profile?.display_name ?? user.email?.split("@")[0] ?? "Friend";
  const tier = profile?.subscription_tier ?? "free";
  const siteUrl = publicEnv.siteUrl || "";

  return (
    <main className="container" style={{ padding: "56px 0" }}>
      <h1 style={{ fontFamily: "var(--font-fraunces)", fontSize: 46, marginBottom: 8 }}>Your Galaxia hub</h1>
      <p style={{ color: "var(--mist)" }}>
        Signed in as <strong style={{ color: "var(--cream)" }}>{displayName}</strong> ({user.email}). This is your web
        front door; the full relationship experience lives in the app.
      </p>

      <section className="glass-card" style={{ marginTop: 20 }}>
        <h2 style={{ marginTop: 0 }}>Constellation summary</h2>
        <p style={{ color: "var(--mist)" }}>
          {peopleCount ?? 0} people in your galaxy
          {samplePeople && samplePeople.length > 0 ? ` · ${samplePeople.map((person) => person.display_name).join(", ")}` : ""}.
        </p>
        <p style={{ color: "var(--gold-soft)" }}>Entitlement: {tier === "plus" ? "Galaxia+" : "Free"}</p>
      </section>

      <section style={{ marginTop: 18, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link href="/account/subscription" className="pill-link">
          Manage subscription
        </Link>
        <Link href="/account/data" className="pill-link">
          Your data
        </Link>
        <a href={`${siteUrl}/account`} className="pill-link">
          Open the app
        </a>
      </section>

      <GetApp source="account" />

      <section style={{ marginTop: 18 }}>
        <SmartAppBanner deepLink={`${siteUrl}/account`} />
      </section>

      <section style={{ marginTop: 18 }}>
        <SignOutButton />
      </section>
    </main>
  );
}

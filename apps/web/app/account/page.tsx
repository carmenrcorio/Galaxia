import Link from "next/link";
import type { CSSProperties } from "react";
import { SmartAppBanner } from "../../components/smart-app-banner";
import { publicEnv } from "../../lib/env";
import { requireUser } from "../../lib/supabase/require-user";

export default async function AccountPage() {
  const { supabase, user } = await requireUser("/account");
  const [{ data: profile }, { data: people }] = await Promise.all([
    supabase.from("profiles").select("display_name, subscription_tier").eq("id", user.id).single(),
    supabase.from("people").select("display_name").eq("owner_id", user.id).limit(6)
  ]);

  const displayName = profile?.display_name ?? user.email?.split("@")[0] ?? "Friend";
  const tier = profile?.subscription_tier ?? "free";
  const siteUrl = publicEnv.siteUrl || "https://galaxia-three.vercel.app";

  return (
    <main className="container" style={{ padding: "56px 0" }}>
      <h1 style={{ fontFamily: "var(--font-fraunces)", fontSize: 46, marginBottom: 8 }}>Your Galaxia hub</h1>
      <p style={{ color: "var(--mist)" }}>
        Signed in as <strong style={{ color: "var(--cream)" }}>{displayName}</strong>. This is your central web hub;
        the full product experience lives in the mobile app.
      </p>

      <section
        style={{
          marginTop: 20,
          border: "1px solid var(--line)",
          borderRadius: 16,
          background: "var(--ink2)",
          padding: 18
        }}
      >
        <h2 style={{ marginTop: 0 }}>Constellation summary</h2>
        <p style={{ color: "var(--mist)" }}>
          {people?.length ?? 0} people in your galaxy
          {people && people.length > 0 ? ` · ${people.map((person) => person.display_name).join(", ")}` : ""}.
        </p>
        <p style={{ color: "var(--gold-soft)" }}>Plan: {tier === "plus" ? "Galaxia+" : "Free"}</p>
      </section>

      <section style={{ marginTop: 18, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link href="/account/subscription" style={pill}>
          Manage subscription
        </Link>
        <Link href="/account/data" style={pill}>
          Your data
        </Link>
        <a href={`${siteUrl}/r/open-app`} style={pill}>
          Open the app
        </a>
      </section>

      <section style={{ marginTop: 18 }}>
        <SmartAppBanner deepLink={`${siteUrl}/account`} />
      </section>
    </main>
  );
}

const pill: CSSProperties = {
  borderRadius: 999,
  padding: "10px 16px",
  border: "1px solid var(--line)",
  background: "var(--ink3)",
  color: "var(--cream)",
  fontWeight: 600
};

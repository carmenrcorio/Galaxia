import { requireUser } from "../../../lib/supabase/require-user";
import type { CSSProperties } from "react";

export default async function SubscriptionPage() {
  const { supabase, user } = await requireUser("/account/subscription");
  const { data: profile } = await supabase.from("profiles").select("subscription_tier").eq("id", user.id).single();
  const tier = profile?.subscription_tier ?? "free";
  const ios = process.env.NEXT_PUBLIC_IOS_APP_STORE_URL ?? "#";
  const android = process.env.NEXT_PUBLIC_ANDROID_PLAY_URL ?? "#";

  return (
    <main className="container" style={{ padding: "56px 0", maxWidth: 820 }}>
      <h1 style={{ fontFamily: "var(--font-fraunces)", fontSize: 42 }}>Subscription</h1>
      <p style={{ color: "var(--mist)" }}>
        Current plan: <strong style={{ color: "var(--cream)" }}>{tier === "plus" ? "Galaxia+" : "Free"}</strong>
      </p>

      <section style={card}>
        <h2 style={{ marginTop: 0 }}>Manage billing</h2>
        <p style={{ color: "var(--mist)" }}>
          If your subscription was started via mobile stores, billing is managed in the App Store / Play Store.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <a href={ios} style={button}>
            Manage on App Store
          </a>
          <a href={android} style={button}>
            Manage on Google Play
          </a>
        </div>
      </section>
    </main>
  );
}

const card: CSSProperties = {
  marginTop: 16,
  border: "1px solid var(--line)",
  background: "var(--ink2)",
  borderRadius: 16,
  padding: 18
};

const button: CSSProperties = {
  borderRadius: 999,
  border: "1px solid var(--line)",
  background: "var(--ink3)",
  color: "var(--cream)",
  padding: "10px 16px",
  fontWeight: 600
};

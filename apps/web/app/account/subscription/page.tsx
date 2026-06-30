import { requireUser } from "../../../lib/supabase/require-user";
import { publicEnv } from "../../../lib/env";

export default async function SubscriptionPage() {
  const { supabase, user } = await requireUser("/account/subscription");
  const { data: profile } = await supabase.from("profiles").select("subscription_tier").eq("id", user.id).single();
  const tier = profile?.subscription_tier ?? "free";
  const ios = publicEnv.iosAppStoreUrl || publicEnv.testflightUrl;
  const android = publicEnv.androidPlayUrl;

  return (
    <main className="container" style={{ padding: "56px 0", maxWidth: 820 }}>
      <h1 style={{ fontFamily: "var(--font-fraunces)", fontSize: 42 }}>Subscription</h1>
      <p style={{ color: "var(--mist)" }}>
        Current plan: <strong style={{ color: "var(--cream)" }}>{tier === "plus" ? "Galaxia+" : "Free"}</strong>
      </p>

      <section className="glass-card" style={{ marginTop: 16 }}>
        <h2 style={{ marginTop: 0 }}>Manage billing</h2>
        <p style={{ color: "var(--mist)" }}>
          Web reads your entitlement only. If your subscription started in mobile, billing is managed in the App Store
          or Play Store.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {ios ? (
            <a href={ios} className="pill-link">
              Manage on iOS
            </a>
          ) : (
            <span className="pill-link">iOS billing link unavailable</span>
          )}
          {android ? (
            <a href={android} className="pill-link">
              Manage on Google Play
            </a>
          ) : (
            <span className="pill-link">Google Play billing link unavailable</span>
          )}
        </div>
        <p className="muted" style={{ marginTop: 12 }}>
          Signed in as {user.email}
        </p>
      </section>
    </main>
  );
}

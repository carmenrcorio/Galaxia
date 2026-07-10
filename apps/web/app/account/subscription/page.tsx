import { requireUser } from "../../../lib/supabase/require-user";

export default async function SubscriptionPage() {
  const { user } = await requireUser("/account/subscription");

  return (
    <main className="container" style={{ padding: "56px 0", maxWidth: 820 }}>
      <h1 style={{ fontFamily: "var(--font-fraunces)", fontSize: 42 }}>Subscription</h1>

      <section className="glass-card" style={{ marginTop: 16 }}>
        <p style={{ color: "var(--mist)" }}>Nothing here is locked. This is the whole product.</p>
        <p style={{ color: "var(--mist)" }}>14 days, everything included. We'll remind you before the trial ends.</p>
        <p className="muted" style={{ marginTop: 12 }}>
          Signed in as {user.email}
        </p>
      </section>
    </main>
  );
}

import Link from "next/link";
import { AccountDataPanel } from "../../../components/account-data-panel";
import { CosmicBackground } from "../../../components/cosmic-background";
import { requireUser } from "../../../lib/supabase/require-user";

export default async function AccountDataPage() {
  const { supabase, user } = await requireUser("/account/data");
  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_status")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      <CosmicBackground />
      <main
        className="container"
        style={{ position: "relative", zIndex: 2, paddingTop: 56, paddingBottom: 56, maxWidth: 820 }}
      >
        <p className="eyebrow">Account</p>
        <h1 style={{ fontFamily: "var(--font-fraunces)", fontSize: 42, marginTop: 4 }}>Your data</h1>
        <p style={{ color: "var(--mist)", maxWidth: 560 }}>
          We keep your relationship graph private. Notes are owner-only and never included in shared-mode
          conversations.
        </p>
        <p style={{ marginTop: 8 }}>
          <Link href="/app/settings" style={{ color: "var(--gold-soft)", fontSize: 14 }}>
            Back to Settings
          </Link>
        </p>

        <div style={{ marginTop: 20 }}>
          <AccountDataPanel
            email={user.email ?? null}
            subscriptionStatus={(profile?.subscription_status as string | null) ?? null}
          />
        </div>
      </main>
    </div>
  );
}

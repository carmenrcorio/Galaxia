import { CosmicBackground } from "../../components/cosmic-background";
import { Paywall } from "../../components/paywall";
import { requireUser } from "../../lib/supabase/require-user";

/**
 * The paywall route. Reached at trial end (middleware redirect) or from
 * Settings / Account. Looks like the marketing landing, not a billing page.
 * No countdown, no fake scarcity. Copy verbatim from galaxia-pricing-copy.md §1.
 *
 * The RevenueCat customer is identified by the Supabase user.id, so we pass the
 * user's id down to the client SDK. We launch monthly-only.
 */
export default async function SubscribePage() {
  const { supabase, user } = await requireUser("/subscribe");

  // The user's real entitlement state — never assumed, never defaulted to
  // "trial ended". A missing row (new-account trigger still settling) is
  // passed through as null so the Paywall can say nothing rather than assert.
  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_status, trial_ends_at")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      <CosmicBackground />
      <main className="container" style={{ position: "relative", zIndex: 2, paddingTop: 72, paddingBottom: 96 }}>
        <Paywall
          userId={user.id}
          subscriptionStatus={profile?.subscription_status ?? null}
          trialEndsAt={profile?.trial_ends_at ?? null}
        />
      </main>
    </div>
  );
}

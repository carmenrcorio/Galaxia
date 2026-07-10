import { CosmicBackground } from "../../components/cosmic-background";
import { Paywall } from "../../components/paywall";
import { publicEnv } from "../../lib/env";
import { requireUser } from "../../lib/supabase/require-user";

/**
 * The paywall route. Reached at trial end (middleware redirect) or from
 * Settings / Account. Looks like the marketing landing, not a billing page.
 * No countdown, no fake scarcity. Copy verbatim from galaxia-pricing-copy.md §1.
 */
export default async function SubscribePage() {
  const { supabase } = await requireUser("/subscribe");

  // Founding-member remaining count — a REAL number from the DB, capped at 300.
  let foundingRemaining: number | null = null;
  if (publicEnv.foundingEnabled) {
    const { count } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("subscription_status", "lifetime");
    foundingRemaining = count ?? 0;
  }

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      <CosmicBackground />
      <main className="container" style={{ position: "relative", zIndex: 2, padding: "72px 0 96px" }}>
        <Paywall foundingRemaining={foundingRemaining} />
      </main>
    </div>
  );
}

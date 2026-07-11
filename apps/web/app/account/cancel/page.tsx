import { CancelSubscription } from "../../../components/cancel-subscription";
import { CosmicBackground } from "../../../components/cosmic-background";
import { requireUser } from "../../../lib/supabase/require-user";

export default async function CancelPage() {
  const { supabase, user } = await requireUser("/account/cancel");
  const { data: profile } = await supabase
    .from("profiles")
    .select("current_period_end")
    .eq("id", user.id)
    .maybeSingle();

  const periodEnd = profile?.current_period_end ? new Date(profile.current_period_end as string) : null;
  const periodEndLabel = periodEnd && !Number.isNaN(periodEnd.getTime())
    ? periodEnd.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })
    : "the end of your current period";

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      <CosmicBackground />
      <main className="container" style={{ position: "relative", zIndex: 2, paddingTop: 72, paddingBottom: 96 }}>
        <CancelSubscription periodEndLabel={periodEndLabel} />
      </main>
    </div>
  );
}

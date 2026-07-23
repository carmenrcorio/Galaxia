import { NextResponse } from "next/server";
import { missingEnvMessage, revenueCatEnv } from "../../../lib/env";
import { requireUser } from "../../../lib/supabase/require-user";

// Talks to the RevenueCat REST API with the secret key; Node runtime.
export const runtime = "nodejs";

interface RcSubscription {
  id: string;
  status?: string;
  gives_access?: boolean;
  auto_renewal_status?: string;
  store?: string;
}

/**
 * Cancel the active subscription at period end via the RevenueCat REST API.
 *
 * One click, no retention offer. This cancels auto-renewal; RevenueCat then
 * emits CANCELLATION now and EXPIRATION at period end. Access continues until
 * `current_period_end`. This route NEVER writes subscription_status itself —
 * the RevenueCat webhook is the single source of truth and flips the status.
 *
 * The RevenueCat customer id is the Supabase user.id, so we look the customer
 * up by the signed-in user's id.
 */
export async function POST() {
  const secret = revenueCatEnv.secretKey;
  if (!secret) {
    return NextResponse.json({ error: missingEnvMessage("REVENUECAT_SECRET_KEY") }, { status: 503 });
  }
  const projectId = revenueCatEnv.projectId;
  if (!projectId) {
    return NextResponse.json({ error: missingEnvMessage("REVENUECAT_PROJECT_ID") }, { status: 503 });
  }

  const { supabase, user } = await requireUser("/account");
  const customerId = user.id;

  const base = "https://api.revenuecat.com/v2";
  const headers = { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" };

  // 1. Find the customer's cancelable RevenueCat Billing subscription.
  let subscriptions: RcSubscription[] = [];
  try {
    const listRes = await fetch(
      `${base}/projects/${projectId}/customers/${customerId}/subscriptions`,
      { headers }
    );
    if (!listRes.ok) {
      return NextResponse.json(
        { error: "Couldn't reach the billing provider. Please try again." },
        { status: 502 }
      );
    }
    const list = (await listRes.json()) as { items?: RcSubscription[] };
    subscriptions = list.items ?? [];
  } catch {
    return NextResponse.json(
      { error: "Couldn't reach the billing provider. Please try again." },
      { status: 502 }
    );
  }

  const active =
    subscriptions.find(
      (s) =>
        s.gives_access &&
        (s.status === "active" || s.status === "trialing") &&
        s.auto_renewal_status === "will_renew"
    ) ?? subscriptions.find((s) => s.gives_access && s.auto_renewal_status === "will_renew");

  if (!active) {
    return NextResponse.json({ error: "No active subscription to cancel." }, { status: 404 });
  }

  // 2. Cancel at period end. 409 means it's already set to not renew — idempotent success.
  try {
    const cancelRes = await fetch(
      `${base}/projects/${projectId}/subscriptions/${active.id}/actions/cancel`,
      { method: "POST", headers }
    );
    if (!cancelRes.ok && cancelRes.status !== 409) {
      return NextResponse.json(
        { error: "Couldn't cancel your subscription. Please try again." },
        { status: 502 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Couldn't cancel your subscription. Please try again." },
      { status: 502 }
    );
  }

  // Optimistic UI flag so Settings can show "Canceled. Access until …" before
  // the CANCELLATION webhook lands. The webhook remains the source of truth for
  // subscription_status (stays active until EXPIRATION) and will reaffirm this
  // flag. Access is unchanged — hasAccess still reads subscription_status.
  await supabase.from("profiles").update({ cancel_at_period_end: true }).eq("id", customerId);

  return NextResponse.json({ ok: true });
}

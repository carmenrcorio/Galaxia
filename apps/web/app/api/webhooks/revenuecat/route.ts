import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { missingEnvMessage, privateEnv, publicEnv, revenueCatEnv } from "../../../../lib/env";
import {
  mapRevenueCatEvent,
  verifyWebhookAuth,
  type RevenueCatWebhookBody
} from "../../../../lib/revenuecat";

// Uses the service-role Supabase client, so it must run on the Node runtime.
export const runtime = "nodejs";

/**
 * RevenueCat Web Billing webhook — the SINGLE SOURCE OF TRUTH for paid status.
 *
 * SECURITY: this is the only thing that can grant a user paid access, so its
 * auth check is treated as security-critical. It fails closed:
 *   - if REVENUECAT_WEBHOOK_AUTH is not configured, it refuses to process (503);
 *   - it verifies the Authorization header against REVENUECAT_WEBHOOK_AUTH with a
 *     constant-time compare and rejects missing/forged calls loudly (401).
 * No secret value is ever logged or returned.
 *
 * The RevenueCat App User ID is the Supabase user.id (= profiles.id), so web and
 * future mobile purchases map to ONE RevenueCat customer and ONE profile row.
 * Status is written ONLY here via the service-role client — never from the client.
 */
export async function POST(req: Request) {
  const expected = revenueCatEnv.webhookAuth;
  if (!expected) {
    return NextResponse.json(
      { error: missingEnvMessage("REVENUECAT_WEBHOOK_AUTH") },
      { status: 503 }
    );
  }

  if (!verifyWebhookAuth(req.headers.get("authorization"), expected)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: RevenueCatWebhookBody;
  try {
    body = (await req.json()) as RevenueCatWebhookBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const event = body.event;
  const update = mapRevenueCatEvent(event);

  // Acknowledge events we don't act on (BILLING_ISSUE, TRANSFER, TEST, …) so
  // RevenueCat doesn't retry them.
  if (!update) {
    return NextResponse.json({ ok: true, ignored: true, type: event?.type ?? null });
  }

  const appUserId = event?.app_user_id;
  if (!appUserId) {
    return NextResponse.json({ error: "Missing app_user_id." }, { status: 400 });
  }

  if (!publicEnv.supabaseUrl || !privateEnv.serviceRole) {
    return NextResponse.json(
      { error: "Server is missing Supabase service configuration." },
      { status: 500 }
    );
  }

  const supabase = createClient(publicEnv.supabaseUrl, privateEnv.serviceRole, {
    auth: { persistSession: false }
  });

  // app_user_id IS the Supabase user.id, which is profiles.id.
  const { data: profile, error: lookupError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", appUserId)
    .maybeSingle();

  if (lookupError) {
    return NextResponse.json({ error: "Profile lookup failed." }, { status: 500 });
  }
  if (!profile) {
    // Unknown user — ack so RevenueCat stops retrying, but report no match.
    return NextResponse.json({ ok: true, matched: false });
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      subscription_status: update.subscription_status,
      current_period_end: update.current_period_end,
      plan: update.plan
    })
    .eq("id", appUserId);

  if (updateError) {
    return NextResponse.json({ error: "Failed to update subscription status." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, matched: true, status: update.subscription_status });
}

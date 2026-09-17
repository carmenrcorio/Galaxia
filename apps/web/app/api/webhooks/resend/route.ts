import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { missingEnvMessage, publicEnv } from "../../../../lib/env";
import { privateEnv, resendEnv } from "../../../../lib/env.server";
import { recordEmailOpenByResendId } from "../../../../lib/email-tracking";
import { resendEmailIdFromEvent, verifyResendWebhookSignature, type ResendWebhookEvent } from "../../../../lib/resend-webhook";

export const runtime = "nodejs";

/**
 * Resend webhook for constellation-letter engagement (opens and clicks).
 * First-party pixel and click wrapper already record those events; this
 * route is the Resend-native path when `RESEND_WEBHOOK_SECRET` is set.
 *
 * Fails closed: unset secret → 503; bad signature → 401. Unknown event
 * types return 200 so Resend does not retry them.
 */
export async function POST(req: Request) {
  const secret = resendEnv.webhookSecret;
  if (!secret) {
    return NextResponse.json({ error: missingEnvMessage("RESEND_WEBHOOK_SECRET") }, { status: 503 });
  }

  const payload = await req.text();
  const ok = verifyResendWebhookSignature(payload, {
    id: req.headers.get("svix-id"),
    timestamp: req.headers.get("svix-timestamp"),
    signature: req.headers.get("svix-signature")
  }, secret);
  if (!ok) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let event: ResendWebhookEvent;
  try {
    event = JSON.parse(payload) as ResendWebhookEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (event.type !== "email.opened" && event.type !== "email.clicked") {
    return NextResponse.json({ ok: true, ignored: true, type: event.type ?? null });
  }

  const emailId = resendEmailIdFromEvent(event);
  if (!emailId) {
    return NextResponse.json({ ok: true, ignored: true, reason: "missing_email_id" });
  }

  if (!publicEnv.supabaseUrl || !privateEnv.serviceRole) {
    return NextResponse.json({ error: "Server is missing Supabase service configuration." }, { status: 500 });
  }

  const supabase = createClient(publicEnv.supabaseUrl, privateEnv.serviceRole, { auth: { persistSession: false } });

  if (event.type === "email.opened") {
    await recordEmailOpenByResendId(supabase, emailId);
  }

  const { data } = await supabase
    .from("constellation_letters")
    .select("id, opened_at, clicked_at, open_count, click_count")
    .eq("resend_id", emailId)
    .maybeSingle();
  if (!data?.id) {
    return NextResponse.json({ ok: true });
  }

  const now = new Date().toISOString();
  if (event.type === "email.opened") {
    await supabase
      .from("constellation_letters")
      .update({
        opened_at: data.opened_at ?? now,
        open_count: (data.open_count ?? 0) + 1
      })
      .eq("id", data.id);
  } else {
    await supabase
      .from("constellation_letters")
      .update({
        clicked_at: data.clicked_at ?? now,
        click_count: (data.click_count ?? 0) + 1
      })
      .eq("id", data.id);
  }

  return NextResponse.json({ ok: true });
}

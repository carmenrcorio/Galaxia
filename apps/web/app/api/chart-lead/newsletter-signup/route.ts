import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
  CHART_LEAD_INVALID_EMAIL,
  CHART_LEAD_RATE_LIMITED,
  isValidChartLeadEmail,
  normalizeChartLeadEmail,
} from "../../../../lib/chart-lead";
import { submitNewsletterSignup } from "../../../../lib/chart-lead-upsert";
import { missingEnvMessage, publicEnv } from "../../../../lib/env";
import { privateEnv } from "../../../../lib/env.server";
import { getClientKeyFromHeaders, isRateLimited } from "../../../../lib/rate-limit";

export const runtime = "nodejs";

// FOUNDER-REVIEW: blog newsletter signup confirmation.
const NEWSLETTER_CONFIRMATION = "You are on the list for Galaxia Notes. You can unsubscribe anytime.";

/**
 * Public Galaxia Notes opt-in (blog newsletter box and other callers).
 * Writes chart_leads with source blog, consent_marketing true, chart_data null.
 */
export async function POST(req: Request) {
  const clientKey = getClientKeyFromHeaders(req.headers);
  if (isRateLimited(clientKey)) {
    return NextResponse.json({ error: CHART_LEAD_RATE_LIMITED }, { status: 429 });
  }

  let body: { email?: unknown };
  try {
    body = (await req.json()) as { email?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const email = normalizeChartLeadEmail(typeof body.email === "string" ? body.email : "");
  if (!isValidChartLeadEmail(email)) {
    return NextResponse.json({ error: CHART_LEAD_INVALID_EMAIL }, { status: 400 });
  }

  if (!publicEnv.supabaseUrl || !privateEnv.serviceRole) {
    return NextResponse.json({ error: missingEnvMessage("SUPABASE_SERVICE_ROLE_KEY") }, { status: 503 });
  }

  const supabase = createClient(publicEnv.supabaseUrl, privateEnv.serviceRole, {
    auth: { persistSession: false },
  });

  const result = await submitNewsletterSignup(supabase, email);
  if (!result.ok) {
    return NextResponse.json({ error: "Could not save your subscription. Try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, message: NEWSLETTER_CONFIRMATION });
}

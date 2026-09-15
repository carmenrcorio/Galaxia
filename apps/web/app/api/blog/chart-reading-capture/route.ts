import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { buildChartReading, CAPTURE_RATE_LIMIT, CAPTURE_WINDOW_MS, hasCompleteBirthData, isValidCaptureEmail, normalizeCaptureEmail } from "../../../../lib/chart-reading";
import {
  CHART_READING_CONFIRMATION,
  CHART_READING_INVALID_EMAIL,
  CHART_READING_NOT_SENT,
  CHART_READING_RATE_LIMITED
} from "../../../../lib/chart-reading-copy";
import { chartReadingUnsubscribeUrl } from "../../../../lib/chart-reading-unsubscribe";
import { chartReadingEmail, chartReadingEmailHeaders, dispatchEmail } from "../../../../lib/emails";
import { missingEnvMessage, publicEnv, getSiteUrlFromRequestOrigin } from "../../../../lib/env";
import { privateEnv } from "../../../../lib/env.server";
import { addToBlogChartReadingsAudience } from "../../../../lib/resend-blog-audience";

export const runtime = "nodejs";

interface CaptureBody {
  email?: unknown;
  name?: unknown;
  month?: unknown;
  day?: unknown;
  year?: unknown;
  birthPlace?: unknown;
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asOptionalInt(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isInteger(parsed)) return parsed;
  }
  return undefined;
}

export async function POST(req: Request) {
  let body: CaptureBody;
  try {
    body = (await req.json()) as CaptureBody;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const email = normalizeCaptureEmail(asOptionalString(body.email) ?? "");
  if (!email || !isValidCaptureEmail(email)) {
    return NextResponse.json({ error: CHART_READING_INVALID_EMAIL }, { status: 400 });
  }

  const name = asOptionalString(body.name)?.trim() || undefined;
  const month = asOptionalInt(body.month);
  const day = asOptionalInt(body.day);
  const year = asOptionalInt(body.year);
  const birthPlace = asOptionalString(body.birthPlace)?.trim() || undefined;
  const hasBirthData = hasCompleteBirthData({ month, day, year, birthPlace });

  const resendKey = process.env.RESEND_API_KEY ?? privateEnv.resendApiKey;
  if (!resendKey) {
    return NextResponse.json({ error: missingEnvMessage("RESEND_API_KEY") }, { status: 503 });
  }
  if (!publicEnv.supabaseUrl || !privateEnv.serviceRole) {
    return NextResponse.json({ error: missingEnvMessage("SUPABASE_SERVICE_ROLE_KEY") }, { status: 503 });
  }

  const supabase = createClient(publicEnv.supabaseUrl, privateEnv.serviceRole, {
    auth: { persistSession: false }
  });

  const windowStart = new Date(Date.now() - CAPTURE_WINDOW_MS).toISOString();
  const { count, error: countError } = await supabase
    .from("blog_email_captures")
    .select("id", { count: "exact", head: true })
    .eq("email", email)
    .gte("submitted_at", windowStart);

  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 500 });
  }
  if ((count ?? 0) >= CAPTURE_RATE_LIMIT) {
    return NextResponse.json({ error: CHART_READING_RATE_LIMITED }, { status: 429 });
  }

  let reading;
  try {
    reading = buildChartReading({ name, month, day, year, birthPlace });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid birth data." },
      { status: 400 }
    );
  }

  const { error: insertError } = await supabase.from("blog_email_captures").insert({
    email,
    has_birth_data: hasBirthData
  });
  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const origin = new URL(req.url).origin;
  const siteUrl = getSiteUrlFromRequestOrigin(origin) || origin;
  const unsubscribeUrl = chartReadingUnsubscribeUrl(siteUrl, email, resendKey);
  const emailPayload = chartReadingEmail({ reading, unsubscribeUrl });
  const result = await dispatchEmail(email, emailPayload, {
    headers: chartReadingEmailHeaders(unsubscribeUrl),
    idempotencyKey: `blog-chart-reading/${email}/${new Date().toISOString().slice(0, 13)}`
  });

  if (!result.sent) {
    return NextResponse.json({ error: CHART_READING_NOT_SENT }, { status: 503 });
  }

  try {
    await addToBlogChartReadingsAudience(email, name ?? null);
  } catch {
    // Audience write is best-effort; the transactional reading already went out.
  }

  return NextResponse.json({ ok: true, message: CHART_READING_CONFIRMATION });
}

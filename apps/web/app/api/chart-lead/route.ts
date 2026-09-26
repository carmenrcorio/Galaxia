import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
  CHART_LEAD_CONFIRMATION,
  CHART_LEAD_INVALID_EMAIL,
  CHART_LEAD_RATE_LIMITED,
  isValidChartLeadEmail,
  normalizeChartLeadEmail,
  parseChartLeadBirthInput,
} from "../../../lib/chart-lead";
import { missingEnvMessage, publicEnv } from "../../../lib/env";
import { privateEnv } from "../../../lib/env.server";
import { getClientKeyFromHeaders, isRateLimited } from "../../../lib/rate-limit";

export const runtime = "nodejs";

interface ChartLeadBody {
  email?: unknown;
  chartData?: unknown;
}

export async function POST(req: Request) {
  const clientKey = getClientKeyFromHeaders(req.headers);
  if (isRateLimited(clientKey)) {
    return NextResponse.json({ error: CHART_LEAD_RATE_LIMITED }, { status: 429 });
  }

  let body: ChartLeadBody;
  try {
    body = (await req.json()) as ChartLeadBody;
  } catch {
    // FOUNDER-REVIEW: "Invalid request."
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const email = normalizeChartLeadEmail(typeof body.email === "string" ? body.email : "");
  if (!isValidChartLeadEmail(email)) {
    return NextResponse.json({ error: CHART_LEAD_INVALID_EMAIL }, { status: 400 });
  }

  let chartData;
  try {
    chartData = parseChartLeadBirthInput(body.chartData);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid birth data." },
      { status: 400 }
    );
  }

  if (!publicEnv.supabaseUrl || !privateEnv.serviceRole) {
    return NextResponse.json({ error: missingEnvMessage("SUPABASE_SERVICE_ROLE_KEY") }, { status: 503 });
  }

  const supabase = createClient(publicEnv.supabaseUrl, privateEnv.serviceRole, {
    auth: { persistSession: false },
  });
  const { error } = await supabase.from("chart_leads").upsert(
    {
      email,
      chart_data: chartData,
      source: "free_chart",
      subscribed: true,
    },
    { onConflict: "email" }
  );

  if (error) {
    // FOUNDER-REVIEW: "Your alerts could not be saved. Try again."
    return NextResponse.json({ error: "Your alerts could not be saved. Try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, message: CHART_LEAD_CONFIRMATION });
}

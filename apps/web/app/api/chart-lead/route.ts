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
import { type ChartLeadSource, upsertChartLead } from "../../../lib/chart-lead-upsert";
import { missingEnvMessage, publicEnv } from "../../../lib/env";
import { privateEnv } from "../../../lib/env.server";
import { getClientKeyFromHeaders, isRateLimited } from "../../../lib/rate-limit";

export const runtime = "nodejs";

interface ChartLeadBody {
  email?: unknown;
  chartData?: unknown;
  source?: unknown;
  consentMarketing?: unknown;
}

const SOURCES: ChartLeadSource[] = ["homepage", "chart", "blog", "welcome", "free_chart"];

function parseSource(value: unknown): ChartLeadSource {
  if (typeof value === "string" && (SOURCES as string[]).includes(value)) {
    return value as ChartLeadSource;
  }
  return "chart";
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
  if (body.chartData !== undefined && body.chartData !== null) {
    try {
      chartData = parseChartLeadBirthInput(body.chartData);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Invalid birth data." },
        { status: 400 }
      );
    }
  }

  if (!publicEnv.supabaseUrl || !privateEnv.serviceRole) {
    return NextResponse.json({ error: missingEnvMessage("SUPABASE_SERVICE_ROLE_KEY") }, { status: 503 });
  }

  const supabase = createClient(publicEnv.supabaseUrl, privateEnv.serviceRole, {
    auth: { persistSession: false },
  });

  const result = await upsertChartLead(supabase, {
    email,
    source: parseSource(body.source),
    chartData,
    subscribed: true,
    consentMarketing: body.consentMarketing === true,
  });

  if (!result.ok) {
    // FOUNDER-REVIEW: "Your chart could not be saved. Try again."
    return NextResponse.json({ error: "Your chart could not be saved. Try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, message: CHART_LEAD_CONFIRMATION });
}

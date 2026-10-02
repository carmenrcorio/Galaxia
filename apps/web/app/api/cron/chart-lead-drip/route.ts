import {
  buildBirthInput,
  computeNatalChart,
  type BirthFormInput,
} from "@galaxia/astro";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { chartLeadUnsubscribeUrl, parseChartLeadBirthInput } from "../../../../lib/chart-lead";
import {
  chartLeadChartCopy,
  chartLeadDueStep,
  emptyChartLeadDripSkipped,
} from "../../../../lib/chart-lead-drip";
import { cronBearerMatches } from "../../../../lib/cron-auth";
import { cronSummaryResponse, walkCronPages } from "../../../../lib/cron-summary";
import {
  chartLeadDripEmail,
  chartLeadEmailHeaders,
  dispatchEmail,
} from "../../../../lib/emails";
import { publicEnv } from "../../../../lib/env";
import { privateEnv } from "../../../../lib/env.server";

export const maxDuration = 800;

interface ChartLeadRow {
  id: string;
  email: string;
  chart_data: unknown;
  drip_step: number;
  created_at: string;
  unsubscribe_token: string;
}

export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured; refusing to run." }, { status: 503 });
  }
  if (!cronBearerMatches(req.headers.get("authorization"), secret)) {
    return new NextResponse(null, { status: 401 });
  }
  if (!publicEnv.supabaseUrl || !privateEnv.serviceRole) {
    return NextResponse.json({ error: "Server not configured." }, { status: 500 });
  }

  const supabase = createClient(publicEnv.supabaseUrl, privateEnv.serviceRole, {
    auth: { persistSession: false },
  });
  const siteUrl = publicEnv.siteUrl || "https://galaxiamea.com";
  const now = Date.now();

  // Reconcile before selecting. Existing auth accounts are marked converted
  // in one database-side update and therefore cannot enter the send walk.
  const { data: convertedData, error: conversionError } = await supabase.rpc(
    "mark_chart_lead_conversions"
  );
  if (conversionError) {
    return NextResponse.json({ error: "Chart lead conversion reconciliation failed." }, { status: 500 });
  }
  const convertedMarked = typeof convertedData === "number" ? convertedData : 0;

  let sent = 0;
  const skipped = emptyChartLeadDripSkipped();

  const walk = await walkCronPages({
    fetchPage: async (lastId, pageSize) => {
      let query = supabase
        .from("chart_leads")
        .select("id, email, chart_data, drip_step, created_at, unsubscribe_token")
        .eq("subscribed", true)
        .not("chart_data", "is", null)
        .is("converted_at", null)
        .lt("drip_step", 3)
        .order("id", { ascending: true })
        .limit(pageSize);
      if (lastId) query = query.gt("id", lastId);
      const { data, error } = await query;
      if (error) throw new Error(`chart-lead-drip: page fetch failed: ${error.message}`);
      return (data ?? []) as ChartLeadRow[];
    },
    visit: async (lead) => {
      const step = chartLeadDueStep(lead.drip_step, lead.created_at, now);
      if (!step) {
        skipped.notDue += 1;
        return;
      }
      if (!process.env.RESEND_API_KEY) {
        skipped.noResendKey += 1;
        return;
      }

      let chartData: BirthFormInput;
      try {
        chartData = parseChartLeadBirthInput(lead.chart_data);
      } catch {
        skipped.invalidChartData += 1;
        return;
      }

      const chart = computeNatalChart(buildBirthInput(chartData).birth);
      const unsubscribeUrl = chartLeadUnsubscribeUrl(siteUrl, lead.unsubscribe_token);
      const rendered = chartLeadDripEmail({
        step,
        chartCopy: chartLeadChartCopy(chart),
        siteUrl,
        unsubscribeUrl,
      });
      const result = await dispatchEmail(lead.email, rendered, {
        headers: chartLeadEmailHeaders(unsubscribeUrl),
        tags: [{ name: "kind", value: `chart-lead-${step}` }],
        idempotencyKey: `chart-lead/${lead.id}/${step}`,
      });
      if (!result.sent) {
        skipped.sendFailed += 1;
        return;
      }

      const { data: updated, error: updateError } = await supabase
        .from("chart_leads")
        .update({ drip_step: step, last_drip_at: new Date(now).toISOString() })
        .eq("id", lead.id)
        .eq("drip_step", lead.drip_step)
        .select("id");
      if (updateError || updated?.length !== 1) {
        throw new Error(`chart-lead-drip: state update failed: ${updateError?.message ?? "lead changed concurrently"}`);
      }
      sent += 1;
    },
  });

  const { body, status } = cronSummaryResponse({
    evaluated: walk.evaluated,
    sent,
    skipped,
    convertedMarked,
    pages: walk.pages,
    truncated: walk.truncated,
  });
  return NextResponse.json(body, { status });
}

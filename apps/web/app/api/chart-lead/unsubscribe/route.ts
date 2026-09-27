import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { CHART_LEAD_UNSUBSCRIBED } from "../../../../lib/chart-lead";
import { publicEnv } from "../../../../lib/env";
import { privateEnv } from "../../../../lib/env.server";

export const runtime = "nodejs";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// FOUNDER-REVIEW: no-login chart alert unsubscribe confirmation.
const CONFIRMATION_HTML = `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Unsubscribed. Galaxia</title></head>
<body style="margin:0;background:#0a0717;color:#F4ECDB;font-family:-apple-system,Segoe UI,Inter,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh">
  <div style="max-width:420px;padding:32px;text-align:center">
    <div style="font-family:Georgia,serif;font-size:22px;color:#E6AE6C;margin-bottom:16px">Galaxia</div>
    <p style="color:#b9aede;line-height:1.6">${CHART_LEAD_UNSUBSCRIBED}</p>
  </div>
</body></html>`;

async function unsubscribeByToken(token: string | null): Promise<void> {
  if (!token || !UUID_RE.test(token) || !publicEnv.supabaseUrl || !privateEnv.serviceRole) return;
  const supabase = createClient(publicEnv.supabaseUrl, privateEnv.serviceRole, {
    auth: { persistSession: false },
  });
  await supabase
    .from("chart_leads")
    .update({ subscribed: false })
    .eq("unsubscribe_token", token);
}

export async function GET(req: Request) {
  await unsubscribeByToken(new URL(req.url).searchParams.get("token"));
  return new NextResponse(CONFIRMATION_HTML, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

export async function POST(req: Request) {
  await unsubscribeByToken(new URL(req.url).searchParams.get("token"));
  return new NextResponse(null, { status: 200 });
}

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { chartLeadNewsletterUnsubscribeUrl, chartLeadUnsubscribeUrl } from "../../../../lib/chart-lead";
import { publicEnv } from "../../../../lib/env";
import { privateEnv } from "../../../../lib/env.server";

export const runtime = "nodejs";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function preferencesHtml(siteUrl: string, token: string): string {
  const chartUrl = chartLeadUnsubscribeUrl(siteUrl, token);
  const notesUrl = chartLeadNewsletterUnsubscribeUrl(siteUrl, token);
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Email preferences. Galaxia</title></head>
<body style="margin:0;background:#0a0717;color:#F4ECDB;font-family:-apple-system,Segoe UI,Inter,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh">
  <div style="max-width:440px;padding:32px">
    <div style="font-family:Georgia,serif;font-size:22px;color:#E6AE6C;margin-bottom:16px">Galaxia</div>
    <p style="color:#b9aede;line-height:1.6">Choose what to stop receiving. Each link works without signing in.</p>
    <ul style="color:#F4ECDB;line-height:1.8;padding-left:18px">
      <li><a href="${chartUrl}" style="color:#E6AE6C">Unsubscribe from chart and transit emails</a></li>
      <li><a href="${notesUrl}" style="color:#E6AE6C">Unsubscribe from Galaxia Notes</a></li>
    </ul>
    <p style="color:#8076a6;font-size:12px;margin-top:24px">Galaxia Mea LLC · 1 Shadowrock Ct, Simpsonville, SC 29680</p>
  </div>
</body></html>`;
}

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  if (!token || !UUID_RE.test(token) || !publicEnv.supabaseUrl || !privateEnv.serviceRole) {
    return new NextResponse("Not found.", { status: 404 });
  }
  const supabase = createClient(publicEnv.supabaseUrl, privateEnv.serviceRole, {
    auth: { persistSession: false },
  });
  const { data } = await supabase.from("chart_leads").select("id").eq("unsubscribe_token", token).maybeSingle();
  if (!data) {
    return new NextResponse("Not found.", { status: 404 });
  }
  const siteUrl = new URL(req.url).origin;
  return new NextResponse(preferencesHtml(siteUrl, token), {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

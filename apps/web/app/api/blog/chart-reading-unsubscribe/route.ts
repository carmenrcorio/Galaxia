import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { CHART_READING_UNSUBSCRIBED } from "../../../../lib/chart-reading-copy";
import { emailFromChartReadingUnsubscribeToken } from "../../../../lib/chart-reading-unsubscribe";
import { publicEnv } from "../../../../lib/env";
import { privateEnv } from "../../../../lib/env.server";
import { unsubscribeBlogChartReading } from "../../../../lib/resend-blog-audience";

export const runtime = "nodejs";

const CONFIRMATION_HTML = `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Unsubscribed. Galaxia</title></head>
<body style="margin:0;background:#0a0717;color:#F4ECDB;font-family:-apple-system,Segoe UI,Inter,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh">
  <div style="max-width:420px;padding:32px;text-align:center">
    <div style="font-family:Georgia,serif;font-size:22px;color:#E6AE6C;margin-bottom:16px">Galaxia</div>
    <p style="color:#b9aede;line-height:1.6">${CHART_READING_UNSUBSCRIBED}</p>
  </div>
</body></html>`;

async function unsubscribeByToken(token: string | null): Promise<void> {
  const secret = process.env.RESEND_API_KEY ?? privateEnv.resendApiKey;
  if (!token || !secret) return;
  const email = emailFromChartReadingUnsubscribeToken(token, secret);
  if (!email) return;
  if (publicEnv.supabaseUrl && privateEnv.serviceRole) {
    const supabase = createClient(publicEnv.supabaseUrl, privateEnv.serviceRole, {
      auth: { persistSession: false }
    });
    await supabase
      .from("blog_email_captures")
      .update({ unsubscribed_at: new Date().toISOString() })
      .eq("email", email)
      .is("unsubscribed_at", null);
  }
  await unsubscribeBlogChartReading(email);
}

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  await unsubscribeByToken(token);
  return new NextResponse(CONFIRMATION_HTML, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" }
  });
}

export async function POST(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  await unsubscribeByToken(token);
  return new NextResponse(null, { status: 200 });
}

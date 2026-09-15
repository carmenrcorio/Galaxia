import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { publicEnv } from "../../../../lib/env";
import { privateEnv } from "../../../../lib/env.server";

export const runtime = "nodejs";

/**
 * No-login, one-click unsubscribe for the weekly constellation letter.
 * Reuses `profiles.unsubscribe_token` (same unguessable per-user token as
 * the daily sky email) but flips ONLY `weekly_constellation_letter_enabled`.
 * The two emails are independent: unsubscribing here does not turn off the
 * daily sky email, and the nudge route still only flips its own column.
 *
 * GET: confirmation page. POST: RFC 8058 blank 200.
 */

async function unsubscribeByToken(token: string | null): Promise<void> {
  if (!token || !publicEnv.supabaseUrl || !privateEnv.serviceRole) return;
  const supabase = createClient(publicEnv.supabaseUrl, privateEnv.serviceRole, { auth: { persistSession: false } });
  await supabase.from("profiles").update({ weekly_constellation_letter_enabled: false }).eq("unsubscribe_token", token);
}

const CONFIRMATION_HTML = `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Unsubscribed. Galaxia</title></head>
<body style="margin:0;background:#0a0717;color:#F4ECDB;font-family:-apple-system,Segoe UI,Inter,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh">
  <div style="max-width:420px;padding:32px;text-align:center">
    <div style="font-family:Georgia,serif;font-size:22px;color:#E6AE6C;margin-bottom:16px">Galaxia</div>
    <p style="color:#b9aede;line-height:1.6">You're unsubscribed from the weekly constellation letter. You can turn it back on any time from Settings. Your other emails are unchanged.</p>
  </div>
</body></html>`;

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

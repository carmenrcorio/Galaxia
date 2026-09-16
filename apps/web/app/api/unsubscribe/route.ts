import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { publicEnv } from "../../../lib/env";
import { privateEnv } from "../../../lib/env.server";

export const runtime = "nodejs";

/**
 * No-login, one-click unsubscribe for trial lifecycle emails. The legal-
 * critical piece: a recipient must be able to opt out without logging in
 * (CAN-SPAM). This route requires no session — only the unguessable,
 * per-user `profiles.unsubscribe_token` embedded in every trial email
 * (the RFC 8058 `List-Unsubscribe` header AND the visible footer link
 * both point here — see `trialEmailHeaders` / `trialUnsubscribeUrl` in
 * `lib/emails.ts`).
 *
 * Flips ONLY `trial_emails_opted_out`. Independent of the daily sky
 * email (`daily_nudge_emails_enabled`) and the weekly constellation letter
 * (`weekly_constellation_letter_enabled`).
 *
 * GET: a human clicking the visible footer link. Sets
 * `trial_emails_opted_out` to true, then shows a small confirmation page
 * (never a bare JSON response — the person clicking is not a developer).
 *
 * POST: the RFC 8058 one-click machine call a mail client's own
 * "Unsubscribe" button makes. Same effect, blank 200, no redirect.
 *
 * Idempotent and cross-user-safe by construction:
 *   - Flipping an already-true value is a no-op — clicking twice is fine.
 *   - `unsubscribe_token` is a unique column (enforced at the DB level via
 *     `profiles_unsubscribe_token_idx`), so a token resolves to AT MOST ONE
 *     profiles row.
 *   - A token that resolves to NO row is also a no-op, never an error —
 *     this route never reveals to an unauthenticated caller whether a
 *     token was valid.
 */
async function unsubscribeByToken(token: string | null): Promise<void> {
  if (!token || !publicEnv.supabaseUrl || !privateEnv.serviceRole) return;
  const supabase = createClient(publicEnv.supabaseUrl, privateEnv.serviceRole, { auth: { persistSession: false } });
  // .eq("unsubscribe_token", token) with the column's unique index means this
  // affects zero or one row — never a batch update, never another user's row.
  await supabase.from("profiles").update({ trial_emails_opted_out: true }).eq("unsubscribe_token", token);
}

const CONFIRMATION_HTML = `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Unsubscribed. Galaxia</title></head>
<body style="margin:0;background:#0a0717;color:#F4ECDB;font-family:-apple-system,Segoe UI,Inter,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh">
  <div style="max-width:420px;padding:32px;text-align:center">
    <div style="font-family:Georgia,serif;font-size:22px;color:#E6AE6C;margin-bottom:16px">Galaxia</div>
    <p style="color:#b9aede;line-height:1.6">You're unsubscribed from trial emails. Your other emails are unchanged.</p>
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
  // RFC 8058 one-click: blank body, 200, no redirect.
  return new NextResponse(null, { status: 200 });
}

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { publicEnv } from "../../../../lib/env";
import { privateEnv } from "../../../../lib/env.server";

// Uses the service-role Supabase client, so it must run on the Node runtime.
export const runtime = "nodejs";

/**
 * No-login, one-click unsubscribe for the "your sky today" nudge email
 * (nudge delivery Phase B2). The legal-critical piece: a lapsed user who
 * never re-authenticates must still be able to opt out from the email
 * alone. This route requires no session — only the unguessable, per-user
 * `profiles.unsubscribe_token` embedded in every nudge email (the RFC 8058
 * `List-Unsubscribe` header AND the visible footer link both point here —
 * see `nudgeEmailHeaders`/`skyTodayEmail` in `lib/emails.ts`).
 *
 * GET: a human clicking the visible footer link. Flips
 * `daily_nudge_emails_enabled` to false, then shows a small confirmation
 * page (never a bare JSON response — the person clicking is not a developer).
 *
 * POST: the RFC 8058 one-click machine call a mail client's own
 * "Unsubscribe" button makes, driven by the `List-Unsubscribe`/
 * `List-Unsubscribe-Post` headers. Same effect, but returns a BLANK 200
 * with no body and no redirect — required by both RFC 8058 ("the POST MUST
 * NOT... return an HTTPS redirect") and Resend's own guidance (blank
 * 200/202 on POST, the normal page on GET).
 *
 * Idempotent and cross-user-safe by construction:
 *   - Flipping an already-false value is a no-op — clicking twice is fine.
 *   - `unsubscribe_token` is a unique column (enforced at the DB level via
 *     `profiles_unsubscribe_token_idx`), so a token resolves to AT MOST ONE
 *     profiles row — a token minted for user A cannot ever match user B's
 *     row, by construction, not by a check this route has to get right.
 *   - A token that resolves to NO row (garbled, stale, already-rotated) is
 *     ALSO a no-op, never an error — this route never reveals to an
 *     unauthenticated caller whether a token was valid.
 */
async function unsubscribeByToken(token: string | null): Promise<void> {
  if (!token || !publicEnv.supabaseUrl || !privateEnv.serviceRole) return;
  const supabase = createClient(publicEnv.supabaseUrl, privateEnv.serviceRole, { auth: { persistSession: false } });
  // .eq("unsubscribe_token", token) with the column's unique index means this
  // affects zero or one row — never a batch update, never another user's row.
  await supabase.from("profiles").update({ daily_nudge_emails_enabled: false }).eq("unsubscribe_token", token);
}

const CONFIRMATION_HTML = `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Unsubscribed — Galaxia</title></head>
<body style="margin:0;background:#0a0717;color:#F4ECDB;font-family:-apple-system,Segoe UI,Inter,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh">
  <div style="max-width:420px;padding:32px;text-align:center">
    <div style="font-family:Georgia,serif;font-size:22px;color:#E6AE6C;margin-bottom:16px">Galaxia</div>
    <p style="color:#b9aede;line-height:1.6">You're unsubscribed from daily sky emails. You can turn them back on any time from Settings.</p>
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

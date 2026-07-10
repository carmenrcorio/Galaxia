import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { privateEnv, publicEnv } from "../../../../lib/env";
import { renderTrialEmail, sendEmail, type TrialEmailData, type TrialEmailKind } from "../../../../lib/emails";

/**
 * Daily trial-email cron. Evaluates every trialing user and sends whichever
 * email is due, once (idempotent via the trial_emails table). Every number is a
 * real per-user count — nothing fabricated.
 *
 * Scheduling (ops, not committed): either a Vercel cron (which auto-sends
 * `Authorization: Bearer <CRON_SECRET>`) hitting this route daily, or Supabase
 * pg_cron via net.http_post. Requires CRON_SECRET set; no-ops on emails when
 * RESEND_API_KEY is absent (see sendEmail).
 */

const DAY = 86_400_000;

export async function GET(req: Request) {
  return handle(req);
}
export async function POST(req: Request) {
  return handle(req);
}

async function handle(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured; refusing to run." }, { status: 503 });
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!publicEnv.supabaseUrl || !privateEnv.serviceRole) {
    return NextResponse.json({ error: "Server not configured." }, { status: 500 });
  }

  const supabase = createClient(publicEnv.supabaseUrl, privateEnv.serviceRole, { auth: { persistSession: false } });
  const siteUrl = publicEnv.siteUrl || "https://galaxia-three.vercel.app";
  const now = Date.now();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, subscription_status, trial_ends_at, created_at")
    .eq("subscription_status", "trialing")
    .limit(1000);

  const sent: Record<string, number> = {};
  const skipped = { noEmail: 0, notDue: 0, alreadySent: 0 };

  for (const profile of profiles ?? []) {
    const createdAt = profile.created_at ? new Date(profile.created_at as string).getTime() : now;
    const trialEndsAt = profile.trial_ends_at ? new Date(profile.trial_ends_at as string).getTime() : null;
    const ageDays = (now - createdAt) / DAY;
    const daysToEnd = trialEndsAt ? (trialEndsAt - now) / DAY : null;

    // Counts (real, per user)
    const [peopleCount, notesCount, threadsCount, groupsCount] = await Promise.all([
      countRows(supabase, "people", profile.id as string),
      countRows(supabase, "notes", profile.id as string),
      countRows(supabase, "threads", profile.id as string),
      countRows(supabase, "groups", profile.id as string)
    ]);

    // Decide which email is due (priority order; one per run).
    let kind: TrialEmailKind | null = null;
    if (daysToEnd !== null && daysToEnd <= 0) kind = "day14";                         // trial ended, still trialing = not converted
    else if (daysToEnd !== null && daysToEnd >= 2 && daysToEnd <= 4) kind = "day11";   // ~3 days out
    else if (ageDays >= 3 && ageDays < 8) kind = peopleCount === 1 ? "day4_one" : peopleCount >= 2 ? "day4_multi" : null;
    else if (ageDays < 3 && peopleCount >= 1) kind = "day1";
    if (!kind) { skipped.notDue += 1; continue; }

    // Idempotency: day4 has two variants — never send both.
    const alreadyKeys = kind === "day4_one" || kind === "day4_multi" ? ["day4_one", "day4_multi"] : [kind];
    const { data: already } = await supabase.from("trial_emails").select("kind").eq("user_id", profile.id).in("kind", alreadyKeys);
    if ((already?.length ?? 0) > 0) { skipped.alreadySent += 1; continue; }

    // Resolve email + a real person name.
    const { data: authUser } = await supabase.auth.admin.getUserById(profile.id as string);
    const to = authUser?.user?.email;
    if (!to) { skipped.noEmail += 1; continue; }

    const { data: recentPerson } = await supabase
      .from("people").select("display_name").eq("owner_id", profile.id).order("created_at", { ascending: false }).limit(1).maybeSingle();

    const firstName = ((profile.display_name as string | null) ?? to.split("@")[0] ?? "there").split(" ")[0];
    const data: TrialEmailData = {
      firstName,
      personName: (recentPerson?.display_name as string | null) ?? undefined,
      peopleCount, notesCount, threadsCount, groupsCount,
      trialEndDate: trialEndsAt ? new Date(trialEndsAt).toLocaleDateString("en-GB", { day: "numeric", month: "long" }) : "soon",
      siteUrl
    };

    const ok = await sendEmail(to, renderTrialEmail(kind, data));
    // Log even on no-op-without-key? No: only log when actually sent, so once the
    // key is added the email still goes out. sendEmail returns false when no key.
    if (ok) {
      await supabase.from("trial_emails").insert({ user_id: profile.id, kind });
      sent[kind] = (sent[kind] ?? 0) + 1;
    }
  }

  return NextResponse.json({ ok: true, sent, skipped, evaluated: profiles?.length ?? 0 });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function countRows(supabase: any, table: string, ownerId: string): Promise<number> {
  const { count } = await supabase.from(table).select("id", { count: "exact", head: true }).eq("owner_id", ownerId);
  return count ?? 0;
}

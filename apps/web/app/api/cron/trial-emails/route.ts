import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { publicEnv } from "../../../../lib/env";
import { privateEnv } from "../../../../lib/env.server";
import { cronSummaryResponse, walkCronPages } from "../../../../lib/cron-summary";
import { renderTrialEmail, sendEmail, type TrialEmailData } from "../../../../lib/emails";
import {
  emptyTrialEmailSkipped,
  pickTrialEmailKind,
  trialAlreadyEnded,
  trialEmailAlreadyKeys
} from "../../../../lib/trial-emails";

/**
 * Daily trial-email cron. Evaluates every trialing user and sends whichever
 * email is due, once (idempotent via the trial_emails table). Every number is a
 * real per-user count — nothing fabricated. Every row that enters the loop
 * increments exactly one of `sent` or `skipped.*`; the response fails
 * closed (`ok: false`, HTTP 500) if that invariant does not hold.
 *
 * Scheduled from `.github/workflows/trial-emails.yml` (no committed
 * `vercel.json`, see ENGINEERING.md §2/§14) — GitHub Actions' `schedule:`
 * cron trigger calls this route daily over HTTPS with the same
 * `Authorization: Bearer <CRON_SECRET>` header a Vercel Cron Job would
 * send. Requires CRON_SECRET set; no-ops on emails when RESEND_API_KEY is
 * absent (see sendEmail) and counts those rows as `skipped.noResendKey`.
 */

const DAY = 86_400_000;

// Vercel Pro max. Combined with the 700s soft budget in walkCronPages so a
// large trialing set cannot silently stop after the first 1000 rows.
export const maxDuration = 800;

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

  let sent = 0;
  const skipped = emptyTrialEmailSkipped();

  const walk = await walkCronPages({
    fetchPage: async (lastId, pageSize) => {
      let query = supabase
        .from("profiles")
        .select("id, display_name, subscription_status, trial_ends_at, created_at")
        .eq("subscription_status", "trialing")
        .order("id", { ascending: true })
        .limit(pageSize);
      if (lastId) query = query.gt("id", lastId);
      const { data, error } = await query;
      if (error) throw new Error(`trial-emails: profile page fetch failed: ${error.message}`);
      return (data ?? []) as {
        id: string;
        display_name: string | null;
        subscription_status: string;
        trial_ends_at: string | null;
        created_at: string | null;
      }[];
    },
    visit: async (profile) => {
      const createdAt = profile.created_at ? new Date(profile.created_at).getTime() : now;
      const trialEndsAt = profile.trial_ends_at ? new Date(profile.trial_ends_at).getTime() : null;
      const ageDays = (now - createdAt) / DAY;
      const daysToEnd = trialEndsAt ? (trialEndsAt - now) / DAY : null;

      // Permanent rule, before the kind picker: never email a trial that has
      // already ended. Protects against a backlog of day14s if the Resend key
      // is unset for a few days. trial_ends_at < now; day14 therefore never fires.
      if (trialAlreadyEnded(trialEndsAt, now)) { skipped.trialAlreadyEnded += 1; return; }

      // Counts (real, per user)
      const [peopleCount, notesCount, threadsCount, groupsCount] = await Promise.all([
        countRows(supabase, "people", profile.id),
        countRows(supabase, "notes", profile.id),
        countRows(supabase, "threads", profile.id),
        countRows(supabase, "groups", profile.id)
      ]);

      const kind = pickTrialEmailKind(ageDays, daysToEnd, peopleCount);
      if (!kind) { skipped.notDue += 1; return; }

      // Idempotency: day4 has two variants — never send both.
      const alreadyKeys = trialEmailAlreadyKeys(kind);
      const { data: already } = await supabase.from("trial_emails").select("kind").eq("user_id", profile.id).in("kind", alreadyKeys);
      if ((already?.length ?? 0) > 0) { skipped.alreadySent += 1; return; }

      // Resolve email + a real person name.
      const { data: authUser } = await supabase.auth.admin.getUserById(profile.id);
      const to = authUser?.user?.email;
      if (!to) { skipped.noEmail += 1; return; }

      if (!process.env.RESEND_API_KEY) { skipped.noResendKey += 1; return; }

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

      // Claim the unique (user_id, kind) slot BEFORE sending so a crash
      // between Resend and the ledger cannot double-send next run.
      // trial_emails has no status column and sent_at is NOT NULL DEFAULT now(),
      // so the row's existence is pending/sent/failed. A failed send leaves the
      // row in place to prevent a retry storm.
      const { error: claimError } = await supabase.from("trial_emails").insert({ user_id: profile.id, kind });
      if (claimError) {
        if (claimError.code === "23505") {
          skipped.alreadySent += 1;
        } else {
          console.error("trial-emails: ledger claim failed", claimError);
          skipped.sendFailed += 1;
        }
        return;
      }

      const ok = await sendEmail(to, renderTrialEmail(kind, data));
      if (!ok) {
        console.error("trial-emails: send failed; leaving ledger row to prevent retry storm", {
          userId: profile.id,
          kind
        });
        skipped.sendFailed += 1;
        return;
      }

      sent += 1;
    }
  });

  const { body, status } = cronSummaryResponse({
    evaluated: walk.evaluated,
    sent,
    skipped,
    pages: walk.pages,
    truncated: walk.truncated
  });
  return NextResponse.json(body, { status });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function countRows(supabase: any, table: string, ownerId: string): Promise<number> {
  const { count } = await supabase.from(table).select("id", { count: "exact", head: true }).eq("owner_id", ownerId);
  return count ?? 0;
}

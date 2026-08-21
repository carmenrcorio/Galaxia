import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { ownerLocalDate } from "@galaxia/astro";
import { resolveAccountName } from "@galaxia/core";
import { publicEnv } from "../../../../lib/env";
import { privateEnv } from "../../../../lib/env.server";
import {
  eligibleForEmailSend,
  isDueForNudgeSend,
  pickLeadNudgeRow,
  type SendableNudgeRow
} from "../../../../lib/nudge-send";
import { nudgeEmailHeaders, sendEmail, skyTodayEmail } from "../../../../lib/emails";

// Uses the service-role Supabase client, so it must run on the Node runtime.
export const runtime = "nodejs";

/**
 * The server-side "your sky today" send job (nudge delivery Phase B2).
 *
 * SEPARATE from `../nudge-compute/route.ts` (Phase B1) by design (Phase 0
 * diagnosis): B1 computes + writes `person_daily_nudges` rows; this route
 * only ever READS today's already-written rows and sends. It never calls
 * `planDailyNudgeWrites`/`buildPersonDailyNudge` and never writes to
 * `person_daily_nudges` — the selection engine, precision_mode, and
 * copy_resolved are entirely B1's, untouched here.
 *
 * Per-owner gates, IN ORDER (order matters — see the minor-exclusion note
 * below):
 *   1. Consent — `daily_nudge_emails_enabled = true` (query-level filter).
 *   2. Local-hour due check — `isDueForNudgeSend` (lib/nudge-send.ts). A
 *      single daily UTC cron can't hit "9am local" for every timezone at
 *      once, so this route is meant to be triggered HOURLY; each run only
 *      processes owners whose local clock just reached the target hour.
 *   3. Already-sent-today ledger check (`daily_nudge_emails`, one row per
 *      (owner_id, date) — mirrors the `trial_emails` idempotency pattern).
 *   4. Minor-exclusion (`eligibleForEmailSend`) — drops any row whose
 *      subject person is a minor, BEFORE lead selection. This ordering is
 *      the actual safety property: the subject line names whichever
 *      person's row survives to lead, so a minor's row must never reach
 *      that step regardless of how "notable" its transit is. If nothing
 *      survives, the owner is skipped entirely for the day — never a
 *      fallback to a filtered-out row.
 *   5. Lead selection (`pickLeadNudgeRow`) — reuses `orderSkyRowsForHome`
 *      from `@galaxia/astro` UNMODIFIED, the same function `/app` home uses
 *      to decide whose sky leads the constellation, so the emailed lead
 *      always matches what home would show as the lead. ONE nudge leads;
 *      this is deliberately not a digest (Phase 0 diagnosis, approved).
 *
 * The subject line (`skyTodayEmail`/`nudgeEmailSubject` in `lib/emails.ts`)
 * only ever receives the surviving lead row's person name — never
 * `copy_resolved`, never a theme/domain word, and (by the ordering above)
 * never a minor's name.
 */

interface ProfileRow {
  id: string;
  timezone: string | null;
  daily_nudge_emails_enabled: boolean;
  display_name: string | null;
  pinned_sky_person_id: string | null;
  unsubscribe_token: string;
}

interface PersonLite {
  id: string;
  display_name: string;
  is_self: boolean;
  passed_at: string | null;
  created_at: string;
}

interface NudgeSendRow extends SendableNudgeRow {
  copy_resolved: string;
}

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
  const now = new Date();

  // Gate 1 (consent) at the query level. Gate 2 (tz required at all) is the
  // same "never fabricate a day/hour" posture nudge-compute takes for a null
  // timezone — skip, don't guess.
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, timezone, daily_nudge_emails_enabled, display_name, pinned_sky_person_id, unsubscribe_token")
    .eq("daily_nudge_emails_enabled", true)
    .not("timezone", "is", null)
    .limit(1000);

  const skipped = {
    nullTimezone: 0,
    notDueThisHour: 0,
    alreadySentToday: 0,
    noRowsToday: 0,
    noEligibleAfterMinorExclusion: 0,
    noLeadContent: 0,
    noEmail: 0
  };
  let usersProcessed = 0;
  let sent = 0;

  for (const profile of (profiles ?? []) as ProfileRow[]) {
    const timezone = profile.timezone;
    if (!timezone) {
      skipped.nullTimezone += 1;
      continue;
    }

    // Gate 2: hourly-cron local-hour check. Never fabricate "now" in UTC —
    // this is genuinely this owner's local clock, via Intl.
    if (!isDueForNudgeSend(now, timezone)) {
      skipped.notDueThisHour += 1;
      continue;
    }

    const localDate = ownerLocalDate(now, timezone);

    // Gate 3: idempotency ledger — one row per (owner_id, date).
    const { data: alreadySent } = await supabase
      .from("daily_nudge_emails")
      .select("owner_id")
      .eq("owner_id", profile.id)
      .eq("date", localDate)
      .maybeSingle();
    if (alreadySent) {
      skipped.alreadySentToday += 1;
      continue;
    }

    const { data: nudgeRows } = await supabase
      .from("person_daily_nudges")
      .select("person_id, copy_tier, minor_safe, copy_resolved")
      .eq("owner_id", profile.id)
      .eq("date", localDate);
    if (!nudgeRows?.length) {
      skipped.noRowsToday += 1;
      continue;
    }

    const personIds = nudgeRows.map((r) => r.person_id as string);
    const { data: peopleRows } = await supabase
      .from("people")
      .select("id, display_name, is_self, passed_at, created_at")
      .in("id", personIds);
    const peopleById = new Map<string, PersonLite>((peopleRows ?? []).map((p) => [p.id as string, p as PersonLite]));

    // Base order home also starts from: self first, then everyone else in
    // creation order — orderSkyRowsForHome only reorders further for a pin.
    const rows: NudgeSendRow[] = (nudgeRows as NudgeSendRow[])
      .map((row) => ({ ...row, passed: Boolean(peopleById.get(row.person_id)?.passed_at) }))
      .sort((a, b) => {
        const pa = peopleById.get(a.person_id);
        const pb = peopleById.get(b.person_id);
        const selfRank = Number(pb?.is_self ?? false) - Number(pa?.is_self ?? false);
        if (selfRank !== 0) return selfRank;
        return (pa?.created_at ?? "").localeCompare(pb?.created_at ?? "");
      });

    // Gate 4: minor-exclusion — MUST run before lead selection.
    const eligible = eligibleForEmailSend(rows);
    if (!eligible.length) {
      skipped.noEligibleAfterMinorExclusion += 1;
      continue;
    }

    // Gate 5: one lead nudge, never a digest.
    const lead = pickLeadNudgeRow(eligible, profile.pinned_sky_person_id);
    if (!lead) {
      skipped.noLeadContent += 1;
      continue;
    }

    const { data: authUser } = await supabase.auth.admin.getUserById(profile.id);
    const to = authUser?.user?.email;
    if (!to) {
      skipped.noEmail += 1;
      continue;
    }

    const selfPerson = [...peopleById.values()].find((p) => p.is_self);
    const { firstName } = resolveAccountName({
      profileDisplayName: profile.display_name,
      selfPersonName: selfPerson?.display_name ?? null,
      email: to
    });

    const { count: priorSendCount } = await supabase
      .from("daily_nudge_emails")
      .select("owner_id", { count: "exact", head: true })
      .eq("owner_id", profile.id);
    const isFirstEmail = (priorSendCount ?? 0) === 0;

    const unsubscribeUrl = `${siteUrl}/api/nudge-email/unsubscribe?token=${profile.unsubscribe_token}`;
    const subjectPersonName = peopleById.get(lead.person_id)?.display_name ?? "them";

    const rendered = skyTodayEmail({
      ownerFirstName: firstName,
      subjectPersonName,
      copyResolved: lead.copy_resolved,
      siteUrl,
      unsubscribeUrl,
      isFirstEmail
    });

    const ok = await sendEmail(to, rendered, nudgeEmailHeaders(unsubscribeUrl));
    if (ok) {
      await supabase
        .from("daily_nudge_emails")
        .upsert(
          { owner_id: profile.id, date: localDate, person_id: lead.person_id },
          { onConflict: "owner_id,date", ignoreDuplicates: true }
        );
      sent += 1;
    }
    usersProcessed += 1;
  }

  return NextResponse.json({
    ok: true,
    sent,
    usersProcessed,
    skipped,
    evaluated: profiles?.length ?? 0
  });
}

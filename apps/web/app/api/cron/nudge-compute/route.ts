import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
  coerceDailyNudgeRow,
  ownerLocalDate,
  planDailyNudgeWrites,
  whenUTCForOwnerLocalDate,
  type NatalChart,
} from "@galaxia/astro";
import { isMinorForSafety, peopleForTodaySky } from "@galaxia/core";
import { publicEnv } from "../../../../lib/env";
import { privateEnv } from "../../../../lib/env.server";
import { cronSummaryResponse, walkCronPages } from "../../../../lib/cron-summary";

// Vercel Pro max. Combined with the 700s soft budget in walkCronPages so a
// large profiles table cannot silently stop after the first 1000 rows.
export const maxDuration = 800;

/**
 * Server-side daily nudge compute job (nudge delivery Phase B1).
 *
 * `person_daily_nudges` rows are otherwise only written client-side, on app
 * open (web home, web person page, mobile home) — so a lapsed user who
 * never opens the app never gets a row for that day. This route closes that
 * gap by computing + upserting rows independent of app opens.
 *
 * NO EMAIL. NO consent. NO sending of any kind — compute-and-write only.
 * Mirrors `../trial-emails/route.ts`'s auth/service-role/Node-runtime shape
 * exactly; it does not touch email sending, templates, or the
 * `trial_emails` table. Consent, templates, and unsubscribe are Phase B2.
 *
 * Reuses `peopleForTodaySky` (@galaxia/core), `isMinorForSafety`
 * (@galaxia/core), `buildPersonDailyNudge` and `planDailyNudgeWrites`
 * (@galaxia/astro, via `planDailyNudgeWrites`) UNMODIFIED, imported — not
 * re-derived inline — so this call site can never drift from the client
 * path's safety/selection behavior. The only new input is `profiles.timezone`
 * (Phase A), threaded through the optional `timezone` param on
 * `ownerLocalDate` / `whenUTCForOwnerLocalDate` added in this phase.
 *
 * Users with a null `profiles.timezone` (haven't loaded the app since Phase
 * A shipped) are SKIPPED entirely — never given a fabricated UTC day. They
 * get their row the normal way next time they open the app, same as today.
 *
 * Scheduled from `.github/workflows/nudge-delivery.yml` (no committed
 * `vercel.json` in this repo, see ENGINEERING.md §2/§14) — runs hourly,
 * before `nudge-send` in the same workflow run (`needs: compute`), so that
 * every IANA timezone's local-9am send pass always finds today's row
 * already written. GitHub Actions' `schedule:` cron trigger calls this
 * route over HTTPS with the same `Authorization: Bearer <CRON_SECRET>`
 * header a Vercel Cron Job would send.
 */

const DAY_MS = 86_400_000;

interface NudgePersonRow {
  id: string;
  relation: string | null;
  birth_precision: "exact" | "date" | "year" | "none";
  birth_date: string | null;
  is_self: boolean;
  is_minor: boolean;
  passed_at: string | null;
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

  const skipped = { nullTimezone: 0, noPeople: 0 };
  let usersProcessed = 0;
  let rowsWritten = 0;

  const walk = await walkCronPages({
    fetchPage: async (lastId, pageSize) => {
      // Only users with a stored, non-null tz — Phase A's one prerequisite
      // input. Never fabricate one for anyone else (skip, don't guess UTC).
      let query = supabase
        .from("profiles")
        .select("id, timezone")
        .not("timezone", "is", null)
        .order("id", { ascending: true })
        .limit(pageSize);
      if (lastId) query = query.gt("id", lastId);
      const { data, error } = await query;
      if (error) throw new Error(`nudge-compute: profile page fetch failed: ${error.message}`);
      return (data ?? []) as { id: string; timezone: string | null }[];
    },
    visit: async (profile) => {
    const ownerId = profile.id;
    const timezone = profile.timezone ?? null;
    // Belt-and-suspenders — the query already filters non-null server-side,
    // but never proceed to compute a day for a falsy tz under any path.
    if (!timezone) {
      skipped.nullTimezone += 1;
      return;
    }

    const { data: idRows } = await supabase.from("people").select("id").eq("owner_id", ownerId);
    const personIds = (idRows ?? []).map((r) => r.id as string);
    if (!personIds.length) {
      skipped.noPeople += 1;
      return;
    }

    // The one new input this phase adds: the owner's real calendar day,
    // from their stored tz — not the server runtime's tz (Vercel's Node
    // functions run in UTC, which is wrong for almost every real user).
    const localDate = ownerLocalDate(new Date(), timezone);

    const [{ data: peopleRows }, { data: chartRows }, { data: nudgeRows }, { data: recentNudgeRows }] =
      await Promise.all([
        supabase
          .from("people")
          .select("id, relation, birth_precision, birth_date, is_self, is_minor, passed_at")
          .in("id", personIds),
        supabase.from("charts").select("person_id, data").in("person_id", personIds),
        supabase
          .from("person_daily_nudges")
          .select("*")
          .eq("owner_id", ownerId)
          .eq("date", localDate)
          .in("person_id", personIds),
        supabase
          .from("person_daily_nudges")
          .select("person_id, pass_id")
          .eq("owner_id", ownerId)
          .in("person_id", personIds)
          .not("pass_id", "is", null)
          .gte("date", new Date(Date.now() - 45 * DAY_MS).toISOString().slice(0, 10))
          .neq("date", localDate),
      ]);

    const chartById = new Map<string, NatalChart>((chartRows ?? []).map((r) => [r.person_id as string, r.data as NatalChart]));

    // Same care gate the client uses for "Today in your sky" — passed
    // people excluded. Imported unmodified from @galaxia/core, never
    // re-derived inline, so this call site cannot drift from the client.
    const living = peopleForTodaySky((peopleRows ?? []) as NudgePersonRow[]);

    const recentPassIdsByPerson = new Map<string, Set<string>>();
    for (const r of recentNudgeRows ?? []) {
      const pid = r.person_id as string;
      const pass = r.pass_id as string | null;
      if (!pass) continue;
      if (!recentPassIdsByPerson.has(pid)) recentPassIdsByPerson.set(pid, new Set());
      recentPassIdsByPerson.get(pid)!.add(pass);
    }

    const existing = (nudgeRows ?? []).map((r) => coerceDailyNudgeRow(r as Record<string, unknown>));

    const { rowsToUpsert } = planDailyNudgeWrites({
      ownerId,
      date: localDate,
      whenUTC: whenUTCForOwnerLocalDate(localDate, new Date(), timezone),
      people: living.map((p) => ({
        id: p.id,
        relation: p.relation,
        is_self: p.is_self,
        birth_precision: p.birth_precision,
        birth_date: p.birth_date,
        // Same safety filter the client uses. Imported unmodified from
        // @galaxia/core, never re-derived inline.
        minorSafe: isMinorForSafety({
          isMinor: p.is_minor,
          birthDate: p.birth_date,
          birthPrecision: p.birth_precision,
        }),
      })),
      chartsById: chartById,
      existingRows: existing,
      recentPassIdsByPerson,
    });

    if (rowsToUpsert.length) {
      const { error } = await supabase
        .from("person_daily_nudges")
        .upsert(rowsToUpsert, { onConflict: "person_id,date", ignoreDuplicates: true });
      if (!error) rowsWritten += rowsToUpsert.length;
    }
    usersProcessed += 1;
    }
  });

  const { body, status } = cronSummaryResponse({
    evaluated: walk.evaluated,
    sent: usersProcessed,
    skipped,
    usersProcessed,
    rowsWritten,
    pages: walk.pages,
    truncated: walk.truncated
  });
  return NextResponse.json(body, { status });
}

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
 * Scheduling is deliberately out-of-band: there is no committed
 * `vercel.json` in this repo (see ENGINEERING.md §2). Point a Vercel
 * dashboard cron job or Supabase `pg_cron` (`net.http_post`) at this route;
 * both send/require the same `Authorization: Bearer <CRON_SECRET>` header
 * this route checks.
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

  // Only users with a stored, non-null tz — Phase A's one prerequisite
  // input. Never fabricate one for anyone else (skip, don't guess UTC).
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, timezone")
    .not("timezone", "is", null)
    .limit(1000);

  const skipped = { nullTimezone: 0, noPeople: 0 };
  let usersProcessed = 0;
  let rowsWritten = 0;

  for (const profile of profiles ?? []) {
    const ownerId = profile.id as string;
    const timezone = (profile.timezone as string | null) ?? null;
    // Belt-and-suspenders — the query already filters non-null server-side,
    // but never proceed to compute a day for a falsy tz under any path.
    if (!timezone) {
      skipped.nullTimezone += 1;
      continue;
    }

    const { data: idRows } = await supabase.from("people").select("id").eq("owner_id", ownerId);
    const personIds = (idRows ?? []).map((r) => r.id as string);
    if (!personIds.length) {
      skipped.noPeople += 1;
      continue;
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

  return NextResponse.json({ ok: true, usersProcessed, rowsWritten, skipped, evaluated: profiles?.length ?? 0 });
}

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
  buildSharedWeekFeed,
  isSlowWeeklyBody,
  sharedTransitActiveWindow,
  sharedTransitSign,
  sharedTransitStorageKey,
  type NatalChart,
  type Precision,
  type SharedTransitPersonInput,
} from "@galaxia/astro";
import { isMinorForSafety, peopleForThisWeek } from "@galaxia/core";
import { publicEnv } from "../../../../lib/env";
import { privateEnv } from "../../../../lib/env.server";
import { cronBearerMatches } from "../../../../lib/cron-auth";
import { cronSummaryResponse, walkCronPages } from "../../../../lib/cron-summary";

/**
 * Server-side daily relational-transit scan job (Generations Feature 3).
 *
 * For every owner's constellation, builds pairwise shared-transit events
 * (`@galaxia/astro` `buildSharedWeekFeed`: synastry-gated, canonical id,
 * salience-ranked). Only relational pairs are stored. Incidental
 * co-transits are not written. Upserts on `sharedTransitStorageKey`.
 *
 * Living people only. Reuses `peopleForThisWeek` (@galaxia/core) — the
 * same care hole as Today in your sky. A passed (memorial) person is
 * never "what's pulling on two people in your circle at once." Minors
 * stay in the scan and can appear on the in-app card. `isMinor` is set
 * from `isMinorForSafety` so a stored "partner" label cannot select the
 * partner copy frame. That frame is forced to family or person in
 * `sharedTransitRole`. Push suppression lives in the push route.
 *
 * `profiles.relational_transit_alerts` ('all' | 'major_only' | 'off') gates
 * the in-app feed and any future push send, NOT this compute step — the
 * scan always runs and stores the full history so flipping the preference
 * back to 'all' immediately has data to show, same rationale as
 * `daily_nudge_emails_enabled` never gating nudge compute.
 *
 * Same auth/service-role/Node-runtime shape as `../nudge-compute/route.ts`.
 * Scheduled from `.github/workflows/relational-transits.yml` (no committed
 * `vercel.json`, see ENGINEERING.md §2/§14) — GitHub Actions' `schedule:`
 * cron trigger calls this route over HTTPS with the same `Authorization:
 * Bearer <CRON_SECRET>` header a Vercel Cron Job would send.
 */

interface ScanPersonRow {
  id: string;
  display_name: string | null;
  relation: string | null;
  birth_precision: "exact" | "date" | "year" | "none";
  birth_date: string | null;
  is_self: boolean;
  is_minor: boolean | null;
  passed_at: string | null;
}

export async function GET(req: Request) {
  return handle(req);
}
export async function POST(req: Request) {
  return handle(req);
}

export const maxDuration = 800;

async function handle(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured; refusing to run." }, { status: 503 });
  }
  if (!cronBearerMatches(req.headers.get("authorization"), secret)) {
    return new NextResponse(null, { status: 401 });
  }
  if (!publicEnv.supabaseUrl || !privateEnv.serviceRole) {
    return NextResponse.json({ error: "Server not configured." }, { status: 500 });
  }

  const supabase = createClient(publicEnv.supabaseUrl, privateEnv.serviceRole, { auth: { persistSession: false } });

  const whenUTC = new Date().toISOString();
  const skipped = { noPeople: 0, singlePerson: 0 };
  let ownersScanned = 0;
  let eventsUpserted = 0;

  const walk = await walkCronPages({
    fetchPage: async (lastId, pageSize) => {
      let query = supabase.from("profiles").select("id").order("id", { ascending: true }).limit(pageSize);
      if (lastId) query = query.gt("id", lastId);
      const { data, error } = await query;
      if (error) throw new Error(`relational-transit-scan: profile page fetch failed: ${error.message}`);
      return (data ?? []) as { id: string }[];
    },
    visit: async (profile) => {
    const ownerId = profile.id;

    const { data: peopleRows } = await supabase
      .from("people")
      .select("id, display_name, relation, birth_precision, birth_date, is_self, is_minor, passed_at")
      .eq("owner_id", ownerId);

    const people = peopleForThisWeek((peopleRows ?? []) as ScanPersonRow[]);
    if (people.length < 2) {
      skipped.noPeople += people.length === 0 ? 1 : 0;
      skipped.singlePerson += people.length === 1 ? 1 : 0;
      return;
    }

    const personIds = people.map((p) => p.id);
    const { data: chartRows } = await supabase.from("charts").select("person_id, data").in("person_id", personIds);
    const chartById = new Map<string, NatalChart>((chartRows ?? []).map((r) => [r.person_id as string, r.data as NatalChart]));

    const inputs: SharedTransitPersonInput[] = [];
    for (const p of people) {
      const chart = chartById.get(p.id);
      if (!chart) continue;
      inputs.push({
        id: p.id,
        name: p.display_name ?? (p.is_self ? "You" : p.relation ?? "Someone"),
        chart,
        birthDate: p.birth_date,
        birthPrecision: p.birth_precision as Precision | "none",
        relation: p.relation,
        isSelf: p.is_self,
        isMinor: isMinorForSafety({
          isMinor: p.is_minor,
          birthDate: p.birth_date,
          birthPrecision: p.birth_precision,
        }),
      });
    }
    if (inputs.length < 2) {
      skipped.singlePerson += 1;
      return;
    }

    // `relational_transits.transit_body` only allows the five slow bodies.
    // Faster shared links are computed at read time for the weekly feed.
    const events = buildSharedWeekFeed(inputs, whenUTC).relational.filter((event) => isSlowWeeklyBody(event.transiting));
    ownersScanned += 1;
    if (!events.length) return;

    const rows = events.map((event) => {
      const window = sharedTransitActiveWindow(event);
      return {
        owner_id: ownerId,
        transit_body: event.transiting,
        transit_sign: sharedTransitSign(event, whenUTC),
        aspect_type: event.aspect,
        affected_profiles: event.members.map((member) => ({
          profile_id: member.personId,
          profile_name: member.personName,
          natal_body: member.natalPoint,
          natal_sign: member.natalSign ?? "",
          orb_deg: member.orb,
          exact_at: member.exactAt,
        })),
        active_from: window.activeFromUTC,
        active_to: window.activeToUTC,
        dedup_key: sharedTransitStorageKey(event),
      };
    });

    const { error, data } = await supabase
      .from("relational_transits")
      .upsert(rows, { onConflict: "owner_id,dedup_key" })
      .select("id");
    if (!error) eventsUpserted += data?.length ?? rows.length;
    }
  });

  const { body, status } = cronSummaryResponse({
    evaluated: walk.evaluated,
    sent: ownersScanned,
    skipped,
    ownersScanned,
    eventsUpserted,
    pages: walk.pages,
    truncated: walk.truncated
  });
  return NextResponse.json(body, { status });
}

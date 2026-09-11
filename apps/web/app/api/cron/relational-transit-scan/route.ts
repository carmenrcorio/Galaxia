import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
  relationalTransitDedupKey,
  scanRelationalTransits,
  type NatalChart,
  type Precision,
  type RelationalTransitPersonInput,
} from "@galaxia/astro";
import { publicEnv } from "../../../../lib/env";
import { privateEnv } from "../../../../lib/env.server";
import { cronSummaryResponse } from "../../../../lib/cron-summary";

/**
 * Server-side daily relational-transit scan job (Generations Feature 3).
 *
 * For every owner's constellation, scans all REAL natal charts for the 5
 * slow-moving outer bodies forming the SAME aspect to 2+ people at once
 * (`@galaxia/astro` `scanRelationalTransits`, unmodified/imported — never
 * re-derived inline) and upserts the results into `relational_transits` on
 * the engine's own `relationalTransitDedupKey`, so re-running this job on
 * consecutive days re-affirms the same row instead of duplicating it.
 *
 * Deliberately includes PASSED (memorial) people and minors: relational
 * transits are generic astrological/family information, not romantic
 * content — "Saturn is crossing where your grandfather's Sun was" is
 * exactly the spec's example, and minors' charts already surface elsewhere
 * in the app (compare, groups, home).
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

  const { data: profiles } = await supabase.from("profiles").select("id").limit(1000);

  const whenUTC = new Date().toISOString();
  const skipped = { noPeople: 0, singlePerson: 0 };
  let ownersScanned = 0;
  let eventsUpserted = 0;

  for (const profile of profiles ?? []) {
    const ownerId = profile.id as string;

    const { data: peopleRows } = await supabase
      .from("people")
      .select("id, display_name, relation, birth_precision, birth_date, is_self")
      .eq("owner_id", ownerId);

    const people = (peopleRows ?? []) as ScanPersonRow[];
    if (people.length < 2) {
      skipped.noPeople += people.length === 0 ? 1 : 0;
      skipped.singlePerson += people.length === 1 ? 1 : 0;
      continue;
    }

    const personIds = people.map((p) => p.id);
    const { data: chartRows } = await supabase.from("charts").select("person_id, data").in("person_id", personIds);
    const chartById = new Map<string, NatalChart>((chartRows ?? []).map((r) => [r.person_id as string, r.data as NatalChart]));

    const inputs: RelationalTransitPersonInput[] = [];
    for (const p of people) {
      const chart = chartById.get(p.id);
      if (!chart) continue;
      inputs.push({
        id: p.id,
        name: p.display_name ?? (p.is_self ? "You" : p.relation ?? "Someone"),
        chart,
        birthDate: p.birth_date,
        birthPrecision: p.birth_precision as Precision | "none",
      });
    }
    if (inputs.length < 2) {
      skipped.singlePerson += 1;
      continue;
    }

    const events = scanRelationalTransits(inputs, whenUTC);
    ownersScanned += 1;
    if (!events.length) continue;

    const rows = events.map((event) => ({
      owner_id: ownerId,
      transit_body: event.transitBody,
      transit_sign: event.transitSign,
      aspect_type: event.aspectType,
      affected_profiles: event.affected.map((a) => ({
        profile_id: a.personId,
        profile_name: a.personName,
        natal_body: a.natalBody,
        natal_sign: a.natalSign,
        orb_deg: a.orbDeg,
        exact_at: a.exactAtUTC,
      })),
      active_from: event.activeFromUTC,
      active_to: event.activeToUTC,
      dedup_key: relationalTransitDedupKey(event),
    }));

    const { error, data } = await supabase
      .from("relational_transits")
      .upsert(rows, { onConflict: "owner_id,dedup_key" })
      .select("id");
    if (!error) eventsUpserted += data?.length ?? rows.length;
  }

  const { body, status } = cronSummaryResponse({
    evaluated: profiles?.length ?? 0,
    sent: ownersScanned,
    skipped,
    ownersScanned,
    eventsUpserted
  });
  return NextResponse.json(body, { status });
}

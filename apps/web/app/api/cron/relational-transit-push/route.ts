import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { MAJOR_RELATIONAL_TRANSIT_BODIES, renderSharedTransitCopy, scannerNatalLongitude, sharedTransitEventFromStoredPair, type AspectType, type BodyName, type NatalChart, type Sign } from "@galaxia/astro";
import { livingAffectedForThisWeek, passedPersonIds } from "@galaxia/core";
import { publicEnv } from "../../../../lib/env";
import { privateEnv } from "../../../../lib/env.server";
import { cronBearerMatches } from "../../../../lib/cron-auth";
import { cronSummaryResponse, walkCronPages } from "../../../../lib/cron-summary";
import { relationalPushSafetySkip } from "../../../../lib/relational-transit-push-safety";

/**
 * Push-send job for Generational Transit Alerts (Feature 3, part 2).
 *
 * Separate from `../relational-transit-scan` on purpose: the scan route
 * computes + stores every relational transit unconditionally (so history
 * exists the moment a user flips their preference back to 'all'); THIS
 * route is the only place that preference (`profiles.relational_transit_alerts`)
 * and `push_sent_at` are consulted, and the only place an actual push goes
 * out. Run it after the scan route on the same cron schedule.
 *
 * "Newly active" = active_from fell within the last `LOOKBACK_MS` window —
 * never the literal instant a boundary is crossed (this is a periodic
 * cron, not a live trigger), and never a transit whose window has been
 * open for a while (a backfill/late-onboarding scan should not blast a
 * push for a transit that started weeks ago). `push_sent_at` makes the
 * whole route idempotent across reruns: once set, a row is never pushed
 * again, and a run that dies partway through never double-sends because
 * it re-queries `push_sent_at is null` from scratch.
 *
 * IMPORTANT (untested on-device): this route talks to Expo's push
 * endpoint over HTTP and is server-only, so it is exercised here via
 * typecheck + direct fetch of the send payload shape — the actual device
 * delivery and deep link have not been verified against a real device or
 * simulator (none available in this environment; see AGENTS.md's Expo
 * mobile caveat). Best-effort, following Expo's documented HTTP/2 push API.
 */

const LOOKBACK_MS = 48 * 60 * 60 * 1000;
const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

interface RelationalTransitRow {
  id: string;
  owner_id: string;
  transit_body: BodyName;
  aspect_type: AspectType;
  affected_profiles: Array<{
    profile_id: string;
    profile_name: string;
    natal_body: string;
    natal_sign: string;
    orb_deg: number;
    exact_at: string;
  }>;
}

interface PushPersonRow {
  id: string;
  passed_at: string | null;
  is_minor: boolean | null;
  birth_date: string | null;
  birth_precision: "none" | "exact" | "date" | "year" | null;
}

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
  if (!cronBearerMatches(req.headers.get("authorization"), secret)) {
    return new NextResponse(null, { status: 401 });
  }
  if (!publicEnv.supabaseUrl || !privateEnv.serviceRole) {
    return NextResponse.json({ error: "Server not configured." }, { status: 500 });
  }

  const supabase = createClient(publicEnv.supabaseUrl, privateEnv.serviceRole, { auth: { persistSession: false } });

  const now = Date.now();
  const skipped = { noTokens: 0, preferenceOff: 0, majorOnlyFiltered: 0, memorialFiltered: 0, minorFiltered: 0, stalePair: 0, pushFailed: 0 };
  let pushed = 0;

  const walk = await walkCronPages({
    fetchPage: async (lastId, pageSize) => {
      let query = supabase
        .from("relational_transits")
        .select("id, owner_id, transit_body, aspect_type, affected_profiles")
        .is("push_sent_at", null)
        .gte("active_from", new Date(now - LOOKBACK_MS).toISOString())
        .lte("active_from", new Date(now).toISOString())
        .order("id", { ascending: true })
        .limit(pageSize);
      if (lastId) query = query.gt("id", lastId);
      const { data, error } = await query;
      if (error) throw new Error(`relational-transit-push: event page fetch failed: ${error.message}`);
      return (data ?? []) as RelationalTransitRow[];
    },
    visit: async (event) => {
    const { data: profileRow } = await supabase
      .from("profiles")
      .select("relational_transit_alerts")
      .eq("id", event.owner_id)
      .maybeSingle();
    const preference = (profileRow?.relational_transit_alerts as "all" | "major_only" | "off" | null) ?? "all";
    if (preference === "off") {
      skipped.preferenceOff += 1;
      return;
    }
    const majorBodies: readonly string[] = MAJOR_RELATIONAL_TRANSIT_BODIES;
    if (preference === "major_only" && !majorBodies.includes(event.transit_body)) {
      skipped.majorOnlyFiltered += 1;
      // Still mark sent — this event will never qualify under this
      // preference; re-checking it every run forever would be pointless.
      await supabase.from("relational_transits").update({ push_sent_at: new Date().toISOString() }).eq("id", event.id);
      return;
    }

    const { data: peopleRows } = await supabase
      .from("people")
      .select("id, passed_at, is_minor, birth_date, birth_precision")
      .eq("owner_id", event.owner_id);
    const peopleList = (peopleRows ?? []) as PushPersonRow[];
    const livingProfiles = livingAffectedForThisWeek(
      event.affected_profiles,
      passedPersonIds(peopleList)
    );
    if (!livingProfiles) {
      skipped.memorialFiltered += 1;
      // Same as major_only: this stored row will never qualify while the
      // memorial people stay marked. Mark sent so we do not re-check it
      // every run. Reversing passed_at creates a new living-only scan row.
      await supabase.from("relational_transits").update({ push_sent_at: new Date().toISOString() }).eq("id", event.id);
      return;
    }

    // Same two people `sharedTransitEventFromStoredPair` will name.
    const ranked = [...livingProfiles]
      .sort((a, b) => a.orb_deg - b.orb_deg || a.profile_id.localeCompare(b.profile_id))
      .slice(0, 2);
    const peopleById = new Map(peopleList.map((person) => [person.id, person]));
    const { data: chartRows } = await supabase
      .from("charts")
      .select("person_id, data")
      .in("person_id", ranked.map((member) => member.profile_id));
    const chartById = new Map<string, NatalChart>(
      (chartRows ?? []).map((row) => [row.person_id as string, row.data as NatalChart])
    );
    const longitudes = ranked.map((member) => {
      const person = peopleById.get(member.profile_id);
      return scannerNatalLongitude(chartById.get(member.profile_id), member.natal_body, person?.birth_precision);
    });
    const safetySkip = relationalPushSafetySkip({
      people: ranked.map((member) => {
        const person = peopleById.get(member.profile_id);
        if (!person) return null;
        return {
          isMinor: person.is_minor,
          birthDate: person.birth_date,
          birthPrecision: person.birth_precision,
        };
      }),
      longitudes: [longitudes[0] ?? null, longitudes[1] ?? null],
    });
    if (safetySkip === "minor") {
      skipped.minorFiltered += 1;
      // Do not mark the row. A later run inside the lookback can
      // send once neither person is a minor. The row stays in the table.
      return;
    }
    if (safetySkip === "stale") {
      skipped.stalePair += 1;
      // Old multi-person rows can name a pair today's synastry gate would
      // drop. Do not push, and do not delete the row.
      return;
    }

    const { data: tokenRows } = await supabase.from("push_tokens").select("expo_push_token").eq("owner_id", event.owner_id);
    const tokens = (tokenRows ?? []).map((r) => r.expo_push_token as string);
    if (!tokens.length) {
      skipped.noTokens += 1;
      return;
    }

    const nowISO = new Date().toISOString();
    const pair = sharedTransitEventFromStoredPair({
      transiting: event.transit_body,
      aspect: event.aspect_type,
      whenUTC: nowISO,
      members: livingProfiles.map((a) => ({
        personId: a.profile_id,
        personName: a.profile_name,
        natalPoint: a.natal_body as BodyName,
        natalSign: a.natal_sign as Sign,
        orb: a.orb_deg,
        exactAt: a.exact_at,
      })),
    });
    if (!pair) {
      await supabase.from("relational_transits").update({ push_sent_at: new Date().toISOString() }).eq("id", event.id);
      return;
    }
    const headline = renderSharedTransitCopy(pair, nowISO).pushHeadline;

    const messages = tokens.map((to) => ({
      to,
      title: "This week",
      body: headline,
      data: { type: "relational_transit", relationalTransitId: event.id },
    }));

    try {
      const response = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(messages),
      });
      if (!response.ok) {
        const body = await response.text().catch(() => "");
        console.error("relational-transit-push: Expo push rejected", {
          status: response.status,
          body,
          eventId: event.id
        });
        skipped.pushFailed += 1;
        return;
      }
    } catch (err) {
      // Leave push_sent_at unset so a transient network failure retries next run.
      console.error("relational-transit-push: Expo fetch threw", err);
      skipped.pushFailed += 1;
      return;
    }
    await supabase.from("relational_transits").update({ push_sent_at: new Date().toISOString() }).eq("id", event.id);
    pushed += 1;
    }
  });

  const { body, status } = cronSummaryResponse({
    evaluated: walk.evaluated,
    sent: pushed,
    skipped,
    pushed,
    pages: walk.pages,
    truncated: walk.truncated
  });
  return NextResponse.json(body, { status });
}

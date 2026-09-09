import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { interpretRelationalTransitHeadline, MAJOR_RELATIONAL_TRANSIT_BODIES, type AffectedProfileHit, type AspectType, type RelationalTransitBody } from "@galaxia/astro";
import { publicEnv } from "../../../../lib/env";
import { privateEnv } from "../../../../lib/env.server";

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
  transit_body: RelationalTransitBody;
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

  const now = Date.now();
  const { data: rows } = await supabase
    .from("relational_transits")
    .select("id, owner_id, transit_body, aspect_type, affected_profiles")
    .is("push_sent_at", null)
    .gte("active_from", new Date(now - LOOKBACK_MS).toISOString())
    .lte("active_from", new Date(now).toISOString())
    .limit(500);

  const events = (rows ?? []) as RelationalTransitRow[];
  const skipped = { noTokens: 0, preferenceOff: 0, majorOnlyFiltered: 0 };
  let pushed = 0;

  for (const event of events) {
    const { data: profileRow } = await supabase
      .from("profiles")
      .select("relational_transit_alerts")
      .eq("id", event.owner_id)
      .maybeSingle();
    const preference = (profileRow?.relational_transit_alerts as "all" | "major_only" | "off" | null) ?? "all";
    if (preference === "off") {
      skipped.preferenceOff += 1;
      continue;
    }
    if (preference === "major_only" && !MAJOR_RELATIONAL_TRANSIT_BODIES.includes(event.transit_body)) {
      skipped.majorOnlyFiltered += 1;
      // Still mark sent — this event will never qualify under this
      // preference; re-checking it every run forever would be pointless.
      await supabase.from("relational_transits").update({ push_sent_at: new Date().toISOString() }).eq("id", event.id);
      continue;
    }

    const { data: tokenRows } = await supabase.from("push_tokens").select("expo_push_token").eq("owner_id", event.owner_id);
    const tokens = (tokenRows ?? []).map((r) => r.expo_push_token as string);
    if (!tokens.length) {
      skipped.noTokens += 1;
      continue;
    }

    const affected: AffectedProfileHit[] = event.affected_profiles.map((a) => ({
      personId: a.profile_id,
      personName: a.profile_name,
      natalBody: a.natal_body as AffectedProfileHit["natalBody"],
      natalSign: a.natal_sign as AffectedProfileHit["natalSign"],
      aspectType: event.aspect_type,
      orbDeg: a.orb_deg,
      exactAtUTC: a.exact_at,
    }));
    const headline = interpretRelationalTransitHeadline({ transitBody: event.transit_body, aspectType: event.aspect_type, affected });

    const messages = tokens.map((to) => ({
      to,
      title: "This week",
      body: headline,
      data: { type: "relational_transit", relationalTransitId: event.id },
    }));

    try {
      await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(messages),
      });
      pushed += 1;
    } catch {
      // Leave push_sent_at unset so a transient network failure retries next run.
      continue;
    }
    await supabase.from("relational_transits").update({ push_sent_at: new Date().toISOString() }).eq("id", event.id);
  }

  return NextResponse.json({ ok: true, evaluated: events.length, pushed, skipped });
}

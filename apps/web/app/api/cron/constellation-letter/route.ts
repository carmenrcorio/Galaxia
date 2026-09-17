import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import {
  composeConstellationLetter,
  ownerLocalDate,
  scanRelationalTransitsForWeek,
  type LetterPerson,
  type NatalChart,
  type Precision,
  type RelationalTransitPersonInput,
} from "@galaxia/astro";
import { isMinorForSafety, resolveAccountName } from "@galaxia/core";
import { publicEnv } from "../../../../lib/env";
import { privateEnv } from "../../../../lib/env.server";
import { cronBearerMatches } from "../../../../lib/cron-auth";
import { cronSummaryResponse, walkCronPages } from "../../../../lib/cron-summary";
import { isDueForConstellationLetter } from "../../../../lib/constellation-letter-send";
import {
  constellationLetterEmail,
  constellationLetterHeaders,
  dispatchEmail
} from "../../../../lib/emails";
import { chromeFromCopy, loadAutomationCopy } from "../../../../lib/email-templates";
import { recordEmailSend } from "../../../../lib/email-tracking";

export const runtime = "nodejs";
export const maxDuration = 800;

/**
 * Weekly constellation letter send job.
 *
 * Scheduled from `.github/workflows/relational-transits.yml` as the `letter`
 * job (`needs: scan`). There is deliberately no `vercel.json`. The workflow
 * runs daily; this route only sends when the owner's local weekday is Sunday,
 * so Americas still receive it on their local Sunday (the UTC Sunday
 * morning run is Saturday evening there; Monday UTC morning is Sunday
 * evening there).
 *
 * Gates, in order:
 *   1. Consent: `weekly_constellation_letter_enabled = true` (independent of
 *      daily sky email and of `relational_transit_alerts`).
 *   2. Stored timezone required (never fabricate a Sunday).
 *   3. Local Sunday check.
 *   4. Compose from a real week-ahead scan of the constellation. Quiet
 *      week, one person, or no eligible adults after minor exclusion: skip
 *      (a quiet week is not a reason to write an empty letter).
 *   5. Ledger claim on (owner_id, week_of) before send.
 *
 * Copy is composed in `@galaxia/astro` `composeConstellationLetter`: every
 * sentence traces to a scanned transit against a real chart.
 */

interface ProfileRow {
  id: string;
  timezone: string | null;
  weekly_constellation_letter_enabled: boolean;
  display_name: string | null;
  unsubscribe_token: string;
}

interface ScanPersonRow {
  id: string;
  display_name: string | null;
  relation: string | null;
  birth_precision: "exact" | "date" | "year" | "none";
  birth_date: string | null;
  is_self: boolean;
  is_minor: boolean | null;
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
  if (!cronBearerMatches(req.headers.get("authorization"), secret)) {
    return new NextResponse(null, { status: 401 });
  }
  if (!publicEnv.supabaseUrl || !privateEnv.serviceRole) {
    return NextResponse.json({ error: "Server not configured." }, { status: 500 });
  }

  const supabase = createClient(publicEnv.supabaseUrl, privateEnv.serviceRole, { auth: { persistSession: false } });
  const siteUrl = publicEnv.siteUrl || "https://galaxia-three.vercel.app";
  const now = new Date();

  const skipped = {
    nullTimezone: 0,
    notSundayLocal: 0,
    noPeople: 0,
    singlePerson: 0,
    quietWeek: 0,
    alreadySentThisWeek: 0,
    noEmail: 0,
    noResendKey: 0,
    sendFailed: 0,
    paused: 0
  };
  let sent = 0;

  const { enabled: letterEnabled, copy: letterCopy } = await loadAutomationCopy(supabase, "letter.weekly");
  if (!letterEnabled) {
    skipped.paused = 1;
    const { body, status } = cronSummaryResponse({
      evaluated: 1,
      sent: 0,
      skipped,
      pages: 0,
      truncated: false
    });
    return NextResponse.json(body, { status });
  }

  const walk = await walkCronPages({
    fetchPage: async (lastId, pageSize) => {
      let query = supabase
        .from("profiles")
        .select("id, timezone, weekly_constellation_letter_enabled, display_name, unsubscribe_token")
        .eq("weekly_constellation_letter_enabled", true)
        .not("timezone", "is", null)
        .order("id", { ascending: true })
        .limit(pageSize);
      if (lastId) query = query.gt("id", lastId);
      const { data, error } = await query;
      if (error) throw new Error(`constellation-letter: profile page fetch failed: ${error.message}`);
      return (data ?? []) as ProfileRow[];
    },
    visit: async (profile) => {
      const timezone = profile.timezone;
      if (!timezone) {
        skipped.nullTimezone += 1;
        return;
      }

      if (!isDueForConstellationLetter(now, timezone)) {
        skipped.notSundayLocal += 1;
        return;
      }

      const weekOf = ownerLocalDate(now, timezone);

      const { data: peopleRows } = await supabase
        .from("people")
        .select("id, display_name, relation, birth_precision, birth_date, is_self, is_minor")
        .eq("owner_id", profile.id);

      const people = (peopleRows ?? []) as ScanPersonRow[];
      if (people.length < 2) {
        skipped.noPeople += people.length === 0 ? 1 : 0;
        skipped.singlePerson += people.length === 1 ? 1 : 0;
        return;
      }

      const personIds = people.map((p) => p.id);
      const { data: chartRows } = await supabase.from("charts").select("person_id, data").in("person_id", personIds);
      const chartById = new Map<string, NatalChart>((chartRows ?? []).map((r) => [r.person_id as string, r.data as NatalChart]));

      const inputs: RelationalTransitPersonInput[] = [];
      const letterPeople: LetterPerson[] = [];
      for (const p of people) {
        const chart = chartById.get(p.id);
        const personName = p.display_name ?? (p.is_self ? "You" : p.relation ?? "Someone");
        letterPeople.push({
          personId: p.id,
          personName,
          isMinor: isMinorForSafety({ isMinor: p.is_minor, birthDate: p.birth_date, birthPrecision: p.birth_precision }),
          isSelf: p.is_self
        });
        if (!chart) continue;
        inputs.push({
          id: p.id,
          name: personName,
          chart,
          birthDate: p.birth_date,
          birthPrecision: p.birth_precision as Precision | "none"
        });
      }

      if (inputs.length < 2) {
        skipped.singlePerson += 1;
        return;
      }

      const events = scanRelationalTransitsForWeek(inputs, weekOf, timezone);
      const draft = composeConstellationLetter(events, letterPeople);
      if (!draft) {
        skipped.quietWeek += 1;
        return;
      }

      const { data: authUser } = await supabase.auth.admin.getUserById(profile.id);
      const to = authUser?.user?.email;
      if (!to) {
        skipped.noEmail += 1;
        return;
      }

      if (!process.env.RESEND_API_KEY) {
        skipped.noResendKey += 1;
        return;
      }

      const letterId = randomUUID();
      const { data: claimed, error: claimError } = await supabase
        .from("constellation_letters")
        .upsert(
          {
            id: letterId,
            owner_id: profile.id,
            week_of: weekOf,
            person_ids: draft.portraits.map((p) => p.personId),
            transit_fingerprint: draft.eventDedupKeys.join("|")
          },
          { onConflict: "owner_id,week_of", ignoreDuplicates: true }
        )
        .select("id")
        .maybeSingle();
      if (claimError) {
        console.error("constellation-letter: ledger claim failed", claimError);
        skipped.sendFailed += 1;
        return;
      }
      if (!claimed) {
        skipped.alreadySentThisWeek += 1;
        return;
      }

      const selfPerson = letterPeople.find((p) => p.isSelf);
      const { firstName } = resolveAccountName({
        profileDisplayName: profile.display_name,
        selfPersonName: selfPerson?.personName ?? null,
        email: to
      });

      const unsubscribeUrl = `${siteUrl}/api/constellation-letter/unsubscribe?token=${profile.unsubscribe_token}`;
      const openPixelUrl = `${siteUrl}/api/constellation-letter/open?id=${letterId}`;
      const clickUrl = `${siteUrl}/api/constellation-letter/go?id=${letterId}`;

      const rendered = constellationLetterEmail({
        ownerFirstName: firstName,
        opening: draft.opening,
        portraits: draft.portraits.map((p) => ({
          dynamicSentence: p.dynamicSentence,
          intentionSentence: p.intentionSentence
        })),
        personNames: draft.portraits.map((p) => (p.isSelf ? "you" : p.personName)),
        siteUrl,
        unsubscribeUrl,
        openPixelUrl,
        clickUrl,
        chrome: chromeFromCopy(letterCopy)
      });

      const result = await dispatchEmail(to, rendered, {
        headers: constellationLetterHeaders(unsubscribeUrl),
        tags: [
          { name: "kind", value: "letter.weekly" },
          { name: "letter_id", value: letterId }
        ],
        idempotencyKey: `constellation-letter/${profile.id}/${weekOf}`
      });
      if (!result.sent) {
        console.error("constellation-letter: send failed; leaving ledger row to prevent retry storm", {
          date: weekOf
        });
        skipped.sendFailed += 1;
        return;
      }

      if (result.id) {
        await supabase.from("constellation_letters").update({ resend_id: result.id }).eq("id", letterId);
      }

      await recordEmailSend(supabase, {
        id: letterId,
        kind: "letter.weekly",
        ownerId: profile.id,
        recipientEmail: to,
        resendId: result.id,
        subject: rendered.subject,
        isTest: false
      });

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

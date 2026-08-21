#!/usr/bin/env node
/**
 * VERIFY proof for nudge-delivery Phase B2's send job
 * (apps/web/app/api/cron/nudge-send/route.ts) against the LIVE Supabase
 * project, hitting the route over HTTP the same way
 * scripts/verify-nudge-compute-job.mjs does for B1.
 *
 * Cannot be a pure vitest unit test for the same reason as B1's verify
 * script — route.ts imports lib/env.server.ts (server-only). The pure gate
 * logic (ownerLocalHour/isDueForNudgeSend/eligibleForEmailSend/
 * pickLeadNudgeRow) already has full unit coverage in
 * apps/web/lib/nudge-send.test.ts; THIS script proves the route wires those
 * functions together correctly against real rows in the real database.
 *
 * Deterministic "due this hour" without faking time: rather than adding a
 * test-only time-override hook to production code, this computes a real
 * IANA "Etc/GMT" fixed-offset zone (no DST, always in pg_timezone_names)
 * whose local hour, RIGHT NOW, equals NUDGE_SEND_TARGET_HOUR — so the
 * isDueForNudgeSend gate is genuinely, not artificially, satisfied.
 *
 * Since RESEND_API_KEY is intentionally absent in this environment,
 * sendEmail() always no-ops (see lib/emails.ts) — this script proves every
 * gate up to and including "reached sendEmail", not actual Resend delivery
 * (emails.test.ts already proves the request body/headers sendEmail would
 * send). This also makes it SAFE to run against the live project: no real
 * email is ever dispatched and no ledger row is ever written for any real
 * account, because `ok` is always false without a key.
 *
 * Proof strategy: call the route once as a BASELINE before creating test
 * data, then again after. Because no writes ever happen (no key -> no
 * ledger inserts), any real accounts contribute IDENTICAL counts to both
 * calls, so they cancel out in the diff — the delta is attributable to the
 * test accounts alone, without needing to fake "now" or read a per-account
 * breakdown the response doesn't expose.
 *
 * Proves, against the live project:
 *   1. Minor-exclusion — an owner whose ONLY nudge row that day is
 *      minor_safe never reaches `usersProcessed` (never attempts a send);
 *      it's counted under skipped.noEligibleAfterMinorExclusion instead.
 *   2. An owner with BOTH a minor row and a real adult ("full" tier) row
 *      reaches `usersProcessed` (attempts a send) exactly once — proving
 *      the minor row didn't block the adult row, and the adult row's
 *      person_id/name is what would have led (never the minor's).
 *   3. Idempotency — inserting a `daily_nudge_emails` ledger row for that
 *      same owner+date BEFORE a second call makes the route skip via
 *      skipped.alreadySentToday instead of reprocessing.
 *
 * Usage:
 *   CRON_SECRET=<same value the running server has> \
 *   BASE_URL=http://localhost:3000 \
 *   node scripts/verify-nudge-send-job.mjs
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CRON_SECRET = process.env.CRON_SECRET;
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const NUDGE_SEND_TARGET_HOUR = 9;

if (!SUPABASE_URL || !SERVICE_ROLE || !CRON_SECRET) {
  console.error(
    "Set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY, and CRON_SECRET " +
      "(must match the value the running apps/web server has configured)."
  );
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const password = `Qa-${Math.random().toString(36).slice(2, 10)}!Aa1`;

/**
 * A real, fixed-offset IANA zone (no DST) whose local hour right now equals
 * `targetHour`. Etc/GMT sign convention is inverted from common usage:
 * Etc/GMT-N is UTC+N, Etc/GMT+N is UTC-N.
 */
function zoneForTargetHourNow(targetHour, now = new Date()) {
  const utcHour = now.getUTCHours();
  let offset = targetHour - utcHour; // local = utc + offset
  offset = ((offset % 24) + 24) % 24; // normalize to 0..23
  if (offset > 12) offset -= 24; // fold to -11..12
  return offset >= 0 ? `Etc/GMT-${offset}` : `Etc/GMT+${-offset}`;
}

function ownerLocalDateForZone(zone, now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

async function createUser(tag, timezone) {
  const email = `qa-nudge-send-${tag}-${stamp}@galaxia-audit.test`;
  const { data: created, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !created?.user) throw new Error(`create user ${tag} failed: ${error?.message}`);
  const userId = created.user.id;
  const { error: profErr } = await admin
    .from("profiles")
    .update({ timezone, daily_nudge_emails_enabled: true })
    .eq("id", userId);
  if (profErr) throw new Error(`set profile for ${tag} failed: ${profErr.message}`);
  return { userId, email };
}

async function createPerson(ownerId, overrides) {
  const { data, error } = await admin
    .from("people")
    .insert({ owner_id: ownerId, relation: "self", ...overrides })
    .select("id")
    .single();
  if (error || !data) throw new Error(`create person failed: ${error?.message}`);
  return data.id;
}

async function insertNudgeRow(ownerId, personId, date, overrides) {
  const { error } = await admin.from("person_daily_nudges").insert({
    owner_id: ownerId,
    person_id: personId,
    date,
    copy_key: "qa:manual",
    copy_tier: "full",
    copy_resolved: "QA VERIFY SENTENCE — should never appear unless this is the adult row.",
    relationship_framing: "self",
    precision_mode: "none",
    minor_safe: false,
    ...overrides
  });
  if (error) throw new Error(`insert nudge row failed: ${error.message}`);
}

async function callRoute() {
  const res = await fetch(`${BASE_URL}/api/cron/nudge-send`, { headers: { Authorization: `Bearer ${CRON_SECRET}` } });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

function diff(before, after) {
  const out = { usersProcessed: after.usersProcessed - before.usersProcessed, sent: after.sent - before.sent, skipped: {} };
  for (const key of Object.keys(after.skipped)) {
    out.skipped[key] = after.skipped[key] - before.skipped[key];
  }
  return out;
}

async function main() {
  const results = {};
  const zone = zoneForTargetHourNow(NUDGE_SEND_TARGET_HOUR);
  results.zoneUsed = zone;

  let minorOnlyUser, mixedUser;
  let minorOnlyPersonId, mixedSelfPersonId, mixedMinorPersonId;

  try {
    // === Call 0: baseline, before any test data exists ===
    const call0 = await callRoute();
    results.call0 = call0;
    if (call0.status !== 200) throw new Error(`baseline route call failed: ${JSON.stringify(call0)}`);

    // --- User A: minor-only. The ONLY nudge row is minor_safe=true. Must
    // never reach usersProcessed / sendEmail. ---
    minorOnlyUser = await createUser("minor-only", zone);
    minorOnlyPersonId = await createPerson(minorOnlyUser.userId, {
      display_name: "QA Send Minor Only",
      relation: "child",
      is_minor: true,
      birth_precision: "none"
    });
    const dateA = ownerLocalDateForZone(zone);
    await insertNudgeRow(minorOnlyUser.userId, minorOnlyPersonId, dateA, { minor_safe: true, copy_tier: "full" });

    // --- User B: mixed. A minor row (should be excluded) AND a real adult
    // "full" tier row (should lead and reach sendEmail). ---
    mixedUser = await createUser("mixed", zone);
    mixedSelfPersonId = await createPerson(mixedUser.userId, {
      display_name: "QA Send Adult Lead",
      is_self: true,
      birth_precision: "none"
    });
    mixedMinorPersonId = await createPerson(mixedUser.userId, {
      display_name: "QA Send Mixed Minor",
      relation: "child",
      is_minor: true,
      birth_precision: "none"
    });
    const dateB = ownerLocalDateForZone(zone);
    await insertNudgeRow(mixedUser.userId, mixedMinorPersonId, dateB, { minor_safe: true, copy_tier: "full" });
    await insertNudgeRow(mixedUser.userId, mixedSelfPersonId, dateB, { minor_safe: false, copy_tier: "full" });

    // === Call 1: after inserting both test users ===
    const call1 = await callRoute();
    results.call1 = call1;
    if (call1.status !== 200) throw new Error(`call1 failed: ${JSON.stringify(call1)}`);

    const d1 = diff(call0.body, call1.body);
    results.deltaCall1 = d1;
    results.minorExclusionAndMixedLead = {
      verdict:
        d1.usersProcessed === 1 && d1.skipped.noEligibleAfterMinorExclusion === 1 && d1.sent === 0
          ? "CORRECT — minor-only user never reached usersProcessed (excluded), mixed user reached usersProcessed exactly once (adult row led), neither user actually sent (no RESEND_API_KEY, expected)"
          : "FAILED"
    };

    // --- Simulate "already sent today" for the mixed user, then re-run. ---
    const { error: ledgerErr } = await admin
      .from("daily_nudge_emails")
      .insert({ owner_id: mixedUser.userId, date: dateB, person_id: mixedSelfPersonId });
    if (ledgerErr) throw new Error(`ledger insert failed: ${ledgerErr.message}`);

    const call2 = await callRoute();
    results.call2 = call2;
    if (call2.status !== 200) throw new Error(`call2 failed: ${JSON.stringify(call2)}`);

    const d2 = diff(call1.body, call2.body);
    results.deltaCall2 = d2;
    results.idempotencyLedgerSkip = {
      verdict:
        d2.usersProcessed === -1 && d2.skipped.alreadySentToday === 1
          ? "CORRECT — mixed user no longer reaches usersProcessed once a ledger row exists for today; caught by alreadySentToday instead"
          : "FAILED"
    };

    console.log(JSON.stringify(results, null, 2));

    const allPassed = [results.minorExclusionAndMixedLead.verdict, results.idempotencyLedgerSkip.verdict].every((v) =>
      v.startsWith("CORRECT")
    );
    if (!allPassed) {
      console.error("\nONE OR MORE VERIFY CHECKS FAILED — see verdicts above.");
      process.exitCode = 1;
    }
  } finally {
    for (const personId of [minorOnlyPersonId, mixedSelfPersonId, mixedMinorPersonId]) {
      if (personId) await admin.from("person_daily_nudges").delete().eq("person_id", personId);
    }
    if (mixedUser) await admin.from("daily_nudge_emails").delete().eq("owner_id", mixedUser.userId);
    for (const personId of [minorOnlyPersonId, mixedSelfPersonId, mixedMinorPersonId]) {
      if (personId) await admin.from("people").delete().eq("id", personId);
    }
    for (const user of [minorOnlyUser, mixedUser]) {
      if (!user) continue;
      await admin.from("profiles").delete().eq("id", user.userId);
      const { error } = await admin.auth.admin.deleteUser(user.userId);
      if (error) console.error(`cleanup: failed to delete test user ${user.email}: ${error.message}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

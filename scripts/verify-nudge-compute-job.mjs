#!/usr/bin/env node
/**
 * VERIFY proof for nudge-delivery Phase B1's server compute job
 * (apps/web/app/api/cron/nudge-compute/route.ts) — the real end-to-end run
 * against the LIVE Supabase project, hitting the route over HTTP the same
 * way a Vercel dashboard cron / Supabase pg_cron would (Authorization:
 * Bearer <CRON_SECRET>), exactly like `scripts/verify-person-daily-nudges-rls.mjs`
 * does for RLS. This can't be a pure vitest unit test — `route.ts` imports
 * `lib/env.server.ts`, which imports the `server-only` package that throws
 * unconditionally outside a real Next.js server bundle (see
 * `apps/web/lib/nudge-compute-route-wiring.test.ts` for the source-level
 * guards that ARE runnable in vitest).
 *
 * Requires a running `apps/web` dev/prod server with the SAME CRON_SECRET
 * this script uses, and live Supabase credentials. Creates real throwaway
 * accounts + people, runs the real route, asserts on the real written rows,
 * then deletes everything it created (success or failure).
 *
 * Proves, against the live project:
 *   1. Tz-correctness — a user with profiles.timezone = "America/Los_Angeles"
 *      gets a person_daily_nudges row dated the correct LA-local day, not
 *      the server runtime's (UTC) day.
 *   2. Safety reproduction — a passed person in that user's people gets NO
 *      row (peopleForTodaySky); a minor (by computed age, not just the
 *      manual flag) gets a row with minor_safe = true (isMinorForSafety).
 *   3. Null-tz skip — a second user with no stored timezone gets no rows
 *      written at all, never a fabricated UTC day.
 *   4. Idempotency both orders — server-then-"client" and "client"-then-
 *      server for the same (person_id, date) each leave exactly one row,
 *      first write frozen.
 *
 * Usage:
 *   CRON_SECRET=<same value the running server has> \
 *   BASE_URL=http://localhost:3000 \
 *   node scripts/verify-nudge-compute-job.mjs
 * Env: SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY,
 *      CRON_SECRET, BASE_URL (defaults to http://localhost:3000).
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CRON_SECRET = process.env.CRON_SECRET;
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

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
const LA_TZ = "America/Los_Angeles";

/** Reference LA-local date, computed independently of the code under test. */
function expectedLaDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: LA_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function tenYearsAgoISODate() {
  const d = new Date();
  d.setUTCFullYear(d.getUTCFullYear() - 10);
  return d.toISOString().slice(0, 10);
}

async function createUser(tag, timezone) {
  const email = `qa-nudge-job-${tag}-${stamp}@galaxia-audit.test`;
  const { data: created, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !created?.user) throw new Error(`create user ${tag} failed: ${error?.message}`);
  const userId = created.user.id;
  if (timezone) {
    const { error: tzErr } = await admin.from("profiles").update({ timezone }).eq("id", userId);
    if (tzErr) throw new Error(`set timezone for ${tag} failed: ${tzErr.message}`);
  }
  return { userId, email };
}

async function createPerson(ownerId, overrides) {
  const { data, error } = await admin
    .from("people")
    .insert({ owner_id: ownerId, display_name: overrides.display_name, relation: "self", ...overrides })
    .select("id")
    .single();
  if (error || !data) throw new Error(`create person failed: ${error?.message}`);
  return data.id;
}

async function callRoute() {
  const res = await fetch(`${BASE_URL}/api/cron/nudge-compute`, {
    headers: { Authorization: `Bearer ${CRON_SECRET}` },
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function fetchRow(personId, date) {
  const { data, error } = await admin
    .from("person_daily_nudges")
    .select("*")
    .eq("person_id", personId)
    .eq("date", date)
    .maybeSingle();
  if (error) throw new Error(`fetch row failed: ${error.message}`);
  return data;
}

async function main() {
  const results = {};
  let userA, userB;
  let selfPersonId, passedPersonId, minorPersonId;
  let bPersonId;

  try {
    // --- setup: user A (LA tz) with a living adult, a passed person, and a minor ---
    userA = await createUser("a", LA_TZ);
    selfPersonId = await createPerson(userA.userId, {
      display_name: "QA Nudge Self",
      is_self: true,
      birth_precision: "none",
    });
    passedPersonId = await createPerson(userA.userId, {
      display_name: "QA Nudge Passed",
      relation: "friend",
      is_self: false,
      birth_precision: "none",
      passed_at: "2020-01-01",
    });
    minorPersonId = await createPerson(userA.userId, {
      display_name: "QA Nudge Minor",
      relation: "child",
      is_self: false,
      is_minor: false, // deliberately false — proves isMinorForSafety's AGE computation runs, not just the raw flag
      birth_precision: "date",
      birth_date: tenYearsAgoISODate(),
    });

    // --- setup: user B, null timezone — must be skipped entirely ---
    userB = await createUser("b", null);
    bPersonId = await createPerson(userB.userId, {
      display_name: "QA Nudge NullTz",
      is_self: true,
      birth_precision: "none",
    });

    const laDate = expectedLaDate();

    // === 1. Run the real route against the live project ===
    const call1 = await callRoute();
    results.firstCall = { status: call1.status, body: call1.body };
    if (call1.status !== 200) throw new Error(`route call failed: ${JSON.stringify(call1)}`);

    // === 2. Tz-correctness ===
    const selfRow = await fetchRow(selfPersonId, laDate);
    results.tzCorrectness = {
      expectedLaDate: laDate,
      selfRowWritten: Boolean(selfRow),
      selfRowDate: selfRow?.date ?? null,
      verdict: selfRow?.date === laDate ? "CORRECT — row dated the real LA-local day" : "FAILED",
    };

    // === 3. Safety reproduction ===
    const passedRow = await fetchRow(passedPersonId, laDate);
    const minorRow = await fetchRow(minorPersonId, laDate);
    results.safetyReproduction = {
      passedPersonExcluded: passedRow === null,
      minorRowWritten: Boolean(minorRow),
      minorSafeFlag: minorRow?.minor_safe ?? null,
      verdict:
        passedRow === null && minorRow?.minor_safe === true
          ? "CORRECT — passed person excluded, minor_safe true via computed age"
          : "FAILED",
    };

    // === 4. Null-tz skip ===
    const bRow = await fetchRow(bPersonId, laDate);
    const bRowAnyDate = await admin.from("person_daily_nudges").select("*").eq("person_id", bPersonId);
    results.nullTimezoneSkip = {
      rowWrittenForLaDate: Boolean(bRow),
      rowsWrittenAnyDate: bRowAnyDate.data?.length ?? 0,
      verdict: (bRowAnyDate.data?.length ?? 0) === 0 ? "CORRECT — skipped, no fabricated-tz row" : "FAILED",
    };

    // === 5. Idempotency, order A: server already wrote selfRow above; now
    // simulate a client on-open write for the SAME (person_id, date) with a
    // distinguishable tag — must not overwrite the server's row. ===
    const clientTagRow = {
      owner_id: userA.userId,
      person_id: selfPersonId,
      date: laDate,
      copy_key: "hedge:none",
      copy_tier: "empty_hedge",
      copy_resolved: "CLIENT-SIMULATED — should never land, server already wrote first.",
      relationship_framing: "self",
      precision_mode: "none",
      minor_safe: false,
    };
    await admin.from("person_daily_nudges").upsert(clientTagRow, { onConflict: "person_id,date", ignoreDuplicates: true });
    const afterClientWrite = await fetchRow(selfPersonId, laDate);
    const rowsForSelf = await admin
      .from("person_daily_nudges")
      .select("*")
      .eq("person_id", selfPersonId)
      .eq("date", laDate);
    results.idempotencyServerThenClient = {
      rowCount: rowsForSelf.data?.length ?? 0,
      copyResolvedIsServerVersion: afterClientWrite?.copy_resolved === selfRow?.copy_resolved,
      verdict:
        (rowsForSelf.data?.length ?? 0) === 1 && afterClientWrite?.copy_resolved !== clientTagRow.copy_resolved
          ? "CORRECT — exactly one row, server's first write frozen"
          : "FAILED",
    };

    // === 6. Idempotency, order B: simulate a client write for the minor
    // person's date FIRST, then re-run the server job — the server must not
    // overwrite the client's row for a date that already has one. ===
    const clientFirstTagRow = {
      owner_id: userA.userId,
      person_id: minorPersonId,
      date: laDate,
      copy_key: "hedge:none",
      copy_tier: "empty_hedge",
      copy_resolved: "CLIENT-FIRST — this write should survive the server's later run.",
      relationship_framing: "self",
      precision_mode: "none",
      minor_safe: true,
    };
    await admin.from("person_daily_nudges").delete().eq("person_id", minorPersonId).eq("date", laDate);
    await admin
      .from("person_daily_nudges")
      .upsert(clientFirstTagRow, { onConflict: "person_id,date", ignoreDuplicates: true });
    const call2 = await callRoute();
    results.secondCall = { status: call2.status, body: call2.body };
    const minorRowAfterServerRerun = await fetchRow(minorPersonId, laDate);
    const rowsForMinor = await admin
      .from("person_daily_nudges")
      .select("*")
      .eq("person_id", minorPersonId)
      .eq("date", laDate);
    results.idempotencyClientThenServer = {
      rowCount: rowsForMinor.data?.length ?? 0,
      copyResolvedIsClientVersion: minorRowAfterServerRerun?.copy_resolved === clientFirstTagRow.copy_resolved,
      verdict:
        (rowsForMinor.data?.length ?? 0) === 1 && minorRowAfterServerRerun?.copy_resolved === clientFirstTagRow.copy_resolved
          ? "CORRECT — exactly one row, client's first write frozen"
          : "FAILED",
    };

    console.log(JSON.stringify(results, null, 2));

    const allPassed = [
      results.tzCorrectness.verdict,
      results.safetyReproduction.verdict,
      results.nullTimezoneSkip.verdict,
      results.idempotencyServerThenClient.verdict,
      results.idempotencyClientThenServer.verdict,
    ].every((v) => v.startsWith("CORRECT"));
    if (!allPassed) {
      console.error("\nONE OR MORE VERIFY CHECKS FAILED — see verdicts above.");
      process.exitCode = 1;
    }
  } finally {
    // Cleanup — always, success or failure.
    for (const personId of [selfPersonId, passedPersonId, minorPersonId, bPersonId]) {
      if (personId) await admin.from("person_daily_nudges").delete().eq("person_id", personId);
    }
    for (const personId of [selfPersonId, passedPersonId, minorPersonId, bPersonId]) {
      if (personId) await admin.from("people").delete().eq("id", personId);
    }
    for (const user of [userA, userB]) {
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

#!/usr/bin/env node
/**
 * VERIFY proof for nudge-delivery Phase B2's no-login unsubscribe route
 * (apps/web/app/api/nudge-email/unsubscribe/route.ts) against the LIVE
 * Supabase project + a running apps/web server — the legal-critical piece.
 *
 * Proves, against the live project:
 *   1. GET with a real token flips daily_nudge_emails_enabled to false for
 *      that exact user, with NO session/auth header.
 *   2. A token minted for user A never affects user B (cross-user safety),
 *      even when both tokens are used against the SAME endpoint.
 *   3. Clicking twice (same token, two POSTs) is idempotent — still false,
 *      no error, same 200 response shape on both calls.
 *   4. POST (the RFC 8058 one-click path) returns a blank 200 body; GET
 *      returns an HTML confirmation page.
 *   5. A garbled/nonexistent token is a safe no-op (200, no crash), and
 *      does not affect any real account.
 *
 * Usage:
 *   BASE_URL=http://localhost:3000 \
 *   node scripts/verify-nudge-unsubscribe.mjs
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("Set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const password = `Qa-${Math.random().toString(36).slice(2, 10)}!Aa1`;

async function createUser(tag) {
  const email = `qa-unsub-${tag}-${stamp}@galaxia-audit.test`;
  const { data: created, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !created?.user) throw new Error(`create user ${tag} failed: ${error?.message}`);
  return created.user.id;
}

async function getProfile(userId) {
  const { data, error } = await admin
    .from("profiles")
    .select("daily_nudge_emails_enabled, unsubscribe_token")
    .eq("id", userId)
    .single();
  if (error) throw new Error(`fetch profile failed: ${error.message}`);
  return data;
}

async function hit(method, token) {
  const url = `${BASE_URL}/api/nudge-email/unsubscribe${token !== undefined ? `?token=${token}` : ""}`;
  const res = await fetch(url, { method });
  const text = await res.text();
  return { status: res.status, contentType: res.headers.get("content-type"), bodyLength: text.length, text };
}

async function main() {
  const results = {};
  let userA, userB;

  try {
    userA = await createUser("a");
    userB = await createUser("b");

    const profileABefore = await getProfile(userA);
    const profileBBefore = await getProfile(userB);
    results.startingState = {
      aEnabled: profileABefore.daily_nudge_emails_enabled,
      bEnabled: profileBBefore.daily_nudge_emails_enabled
    };

    // === 1. GET with user A's real token flips A, leaves B untouched ===
    const getResp = await hit("GET", profileABefore.unsubscribe_token);
    results.getResponse = { status: getResp.status, contentType: getResp.contentType, isHtml: getResp.text.includes("<html>") };

    const profileAAfterGet = await getProfile(userA);
    const profileBAfterGet = await getProfile(userB);
    results.crossUserSafety = {
      aFlippedFalse: profileAAfterGet.daily_nudge_emails_enabled === false,
      bStillEnabled: profileBAfterGet.daily_nudge_emails_enabled === true,
      verdict:
        profileAAfterGet.daily_nudge_emails_enabled === false && profileBAfterGet.daily_nudge_emails_enabled === true
          ? "CORRECT — A's token unsubscribed only A, B untouched"
          : "FAILED"
    };

    // === 2. Re-enable A (simulating them turning it back on from Settings),
    // then use B's token — must flip ONLY B, not re-affect A. ===
    await admin.from("profiles").update({ daily_nudge_emails_enabled: true }).eq("id", userA);
    const postRespB = await hit("POST", profileBBefore.unsubscribe_token);
    const profileAAfterBPost = await getProfile(userA);
    const profileBAfterBPost = await getProfile(userB);
    results.postResponseB = { status: postRespB.status, bodyLength: postRespB.bodyLength };
    results.crossUserSafetyReverse = {
      verdict:
        profileAAfterBPost.daily_nudge_emails_enabled === true && profileBAfterBPost.daily_nudge_emails_enabled === false
          ? "CORRECT — B's token unsubscribed only B; A (re-enabled moments earlier) is untouched by B's token"
          : "FAILED"
    };

    // === 3. Idempotency — POST twice with the same (already-used) token B ===
    const secondPostB = await hit("POST", profileBBefore.unsubscribe_token);
    const profileBAfterSecondPost = await getProfile(userB);
    results.idempotentDoubleClick = {
      firstStatus: postRespB.status,
      secondStatus: secondPostB.status,
      verdict:
        secondPostB.status === 200 && profileBAfterSecondPost.daily_nudge_emails_enabled === false
          ? "CORRECT — clicking twice is a no-op, still 200, still unsubscribed"
          : "FAILED"
    };

    // === 4. POST is blank (RFC 8058 one-click, no HTML/redirect); GET shows a page ===
    results.postVsGetShape = {
      postBodyLength: postRespB.bodyLength,
      getIsHtml: results.getResponse.isHtml,
      verdict:
        postRespB.bodyLength === 0 && results.getResponse.isHtml
          ? "CORRECT — POST returns a blank body, GET returns an HTML confirmation page"
          : "FAILED"
    };

    // === 5. Garbled/nonexistent token — safe no-op, no crash, no real account affected ===
    const garbledResp = await hit("GET", "00000000-0000-0000-0000-000000000000");
    const profileAAfterGarbled = await getProfile(userA);
    const profileBAfterGarbled = await getProfile(userB);
    results.garbledToken = {
      status: garbledResp.status,
      verdict:
        garbledResp.status === 200 &&
        profileAAfterGarbled.daily_nudge_emails_enabled === true &&
        profileBAfterGarbled.daily_nudge_emails_enabled === false
          ? "CORRECT — a token matching no row is a safe no-op; neither test account's state changed"
          : "FAILED"
    };

    // === 6. Missing token entirely — no crash ===
    const noTokenResp = await hit("GET", undefined);
    results.missingToken = { status: noTokenResp.status, verdict: noTokenResp.status === 200 ? "CORRECT — no crash on a missing token" : "FAILED" };

    console.log(JSON.stringify(results, null, 2));

    const allPassed = [
      results.crossUserSafety.verdict,
      results.crossUserSafetyReverse.verdict,
      results.idempotentDoubleClick.verdict,
      results.postVsGetShape.verdict,
      results.garbledToken.verdict,
      results.missingToken.verdict
    ].every((v) => v.startsWith("CORRECT"));
    if (!allPassed) {
      console.error("\nONE OR MORE VERIFY CHECKS FAILED — see verdicts above.");
      process.exitCode = 1;
    }
  } finally {
    for (const userId of [userA, userB]) {
      if (!userId) continue;
      await admin.from("profiles").delete().eq("id", userId);
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) console.error(`cleanup: failed to delete test user ${userId}: ${error.message}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

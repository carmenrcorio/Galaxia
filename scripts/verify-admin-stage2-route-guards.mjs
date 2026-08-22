#!/usr/bin/env node
/**
 * VERIFY proof (Stage 2 task's own requirement): each new /api/admin/**
 * route independently returns 403 to (a) an anonymous request and (b) a
 * signed-in NON-admin session — not just Stage 1's /api/admin/users route.
 *
 * Needs a running Next.js server (dev or `next start`) at BASE_URL, plus
 * live Supabase credentials (already present in this environment). It
 * creates one throwaway non-admin auth user, signs in with the anon key to
 * get a real session, hand-builds the exact `sb-<ref>-auth-token` cookie
 * `@supabase/ssr`'s browser client would set (base64url-encoded JSON
 * session, chunked past ~3180 chars per createChunks()) using that
 * package's own (DOM-free, pure) encoding helpers, then:
 *
 *   1. Hits GET /app/settings with that cookie and confirms it's NOT
 *      redirected to /login — proving the cookie is genuinely recognized
 *      as a valid signed-in session by this exact app, not garbage that
 *      merely happens to also read as "no session" (which would make the
 *      403 proof below meaningless).
 *   2. Hits every new /api/admin/** route with NO cookie (anonymous) and
 *      with that cookie (signed-in, non-admin) and asserts 403 + the exact
 *      `{ error: "Forbidden" }` body both times.
 *
 * Cleans up the throwaway user in all cases (success or failure).
 *
 * Usage: node scripts/verify-admin-stage2-route-guards.mjs [baseUrl]
 * Env: SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY,
 *      SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY).
 */
import { createClient } from "@supabase/supabase-js";
import { stringToBase64URL } from "@supabase/ssr/dist/main/utils/base64url.js";
import { createChunks } from "@supabase/ssr/dist/main/utils/chunker.js";

const BASE_URL = process.argv[2] ?? "http://localhost:3000";
const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE || !ANON_KEY) {
  console.error(
    "Set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY, and " +
      "SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)."
  );
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
const projectRef = new URL(SUPABASE_URL).hostname.split(".")[0];
const storageCookieName = `sb-${projectRef}-auth-token`;

function buildAuthCookieHeader(session) {
  const json = JSON.stringify(session);
  const encoded = "base64-" + stringToBase64URL(json);
  const chunks = createChunks(storageCookieName, encoded);
  return chunks.map(({ name, value }) => `${name}=${encodeURIComponent(value)}`).join("; ");
}

async function main() {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `qa-stage2-guard-${stamp}@galaxia-audit.test`;
  const password = `Qa-${Math.random().toString(36).slice(2, 10)}!Aa1`;
  let userId = "";
  const results = {};

  try {
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });
    if (createErr || !created?.user) throw new Error(`create user failed: ${createErr?.message}`);
    userId = created.user.id;

    const anonSession = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
    const { data: signedIn, error: signInErr } = await anonSession.auth.signInWithPassword({ email, password });
    if (signInErr || !signedIn.session) throw new Error(`sign-in failed: ${signInErr?.message}`);

    const cookieHeader = buildAuthCookieHeader(signedIn.session);

    // Sanity check: the cookie must be recognized as a real signed-in
    // session by this exact app (not merely "looks like no session"),
    // proven by GET /app/settings NOT redirecting to /login.
    const settingsRes = await fetch(`${BASE_URL}/app/settings`, {
      headers: { cookie: cookieHeader },
      redirect: "manual"
    });
    results.cookieRecognizedAsSignedIn = {
      status: settingsRes.status,
      verdict: settingsRes.status === 200 ? "OK — cookie recognized as a real signed-in session" : "UNEXPECTED — cookie not recognized (see status)"
    };
    if (settingsRes.status !== 200) {
      throw new Error(`Sanity check failed: GET /app/settings with the constructed cookie returned ${settingsRes.status}, expected 200. Aborting route-guard checks — they would be meaningless against an unrecognized cookie.`);
    }

    const routes = [
      { method: "POST", path: `/api/admin/users/${userId}/resend-email` },
      { method: "POST", path: `/api/admin/support/${"00000000-0000-0000-0000-000000000000"}/close` },
      { method: "POST", path: `/api/admin/support/${"00000000-0000-0000-0000-000000000000"}/reopen` }
    ];

    for (const route of routes) {
      const anonRes = await fetch(`${BASE_URL}${route.path}`, { method: route.method });
      const anonBody = await anonRes.json().catch(() => null);

      const nonAdminRes = await fetch(`${BASE_URL}${route.path}`, {
        method: route.method,
        headers: { cookie: cookieHeader }
      });
      const nonAdminBody = await nonAdminRes.json().catch(() => null);

      results[route.path] = {
        anonymous: { status: anonRes.status, body: anonBody },
        signedInNonAdmin: { status: nonAdminRes.status, body: nonAdminBody },
        verdict:
          anonRes.status === 403 &&
          nonAdminRes.status === 403 &&
          anonBody?.error === "Forbidden" &&
          nonAdminBody?.error === "Forbidden"
            ? "CLOSED — both denied with the exact 403 Forbidden body"
            : "OPEN — did not deny as expected (see status/body above)"
      };
    }

    console.log(JSON.stringify(results, null, 2));

    const anyOpen = Object.values(results).some((r) => typeof r?.verdict === "string" && r.verdict.startsWith("OPEN"));
    if (anyOpen) process.exitCode = 1;
  } finally {
    if (userId) {
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

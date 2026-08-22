#!/usr/bin/env node
/**
 * VERIFY proof (Stage 2, positive path): the counterpart to
 * verify-admin-stage2-route-guards.mjs (which proves the new routes deny
 * non-admin/anonymous callers) — this proves a REAL admin can actually use
 * them end to end, against a running Next.js server (dev or `next start`)
 * at BASE_URL, not just the guard denying everyone.
 *
 * Creates a throwaway admin (a real auth user + a throwaway admin_users
 * row — never the founder's account), a throwaway unconfirmed target user,
 * and a throwaway support request, signs in as the throwaway admin with a
 * hand-built session cookie (same @supabase/ssr encoding as the sibling
 * script), then hits all three new routes for real over HTTP:
 *   1. POST /api/admin/users/[id]/resend-email against the unconfirmed
 *      target -> expects 200 + emailType "confirmation".
 *   2. POST /api/admin/support/[id]/close -> expects 200, status "closed",
 *      handled_by = the admin, handled_at set.
 *   3. POST /api/admin/support/[id]/reopen -> expects 200, status "open",
 *      a fresh handled_at.
 * Then reads admin_audit_log directly (service-role) and prints the three
 * rows this should have produced, one per action, actor = the admin,
 * target = the affected user.
 *
 * Cleans up every row/user it creates, on success or failure.
 *
 * Usage: node scripts/verify-admin-stage2-positive-path.mjs [baseUrl]
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
  const password = `Qa-${Math.random().toString(36).slice(2, 10)}!Aa1`;
  let adminUserId = "";
  let targetUnconfirmedId = "";
  let requestOwnerId = "";
  let requestId = "";

  try {
    // Throwaway admin
    const { data: adminCreated, error: adminCreateErr } = await admin.auth.admin.createUser({
      email: `qa-positive-admin-${stamp}@galaxia-audit.test`,
      password,
      email_confirm: true
    });
    if (adminCreateErr || !adminCreated?.user) throw new Error(`create admin failed: ${adminCreateErr?.message}`);
    adminUserId = adminCreated.user.id;
    const { error: grantErr } = await admin.from("admin_users").insert({ owner_id: adminUserId, role: "admin" });
    if (grantErr) throw new Error(`grant admin failed: ${grantErr.message}`);

    // Throwaway resend-email target (unconfirmed)
    const { data: targetCreated, error: targetCreateErr } = await admin.auth.admin.createUser({
      email: `qa-positive-target-${stamp}@galaxia-audit.test`,
      password,
      email_confirm: false
    });
    if (targetCreateErr || !targetCreated?.user) throw new Error(`create target failed: ${targetCreateErr?.message}`);
    targetUnconfirmedId = targetCreated.user.id;

    // Throwaway support request owner + row
    const { data: ownerCreated, error: ownerCreateErr } = await admin.auth.admin.createUser({
      email: `qa-positive-owner-${stamp}@galaxia-audit.test`,
      password,
      email_confirm: true
    });
    if (ownerCreateErr || !ownerCreated?.user) throw new Error(`create owner failed: ${ownerCreateErr?.message}`);
    requestOwnerId = ownerCreated.user.id;
    const ownerAnon = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
    const { error: ownerSignInErr } = await ownerAnon.auth.signInWithPassword({
      email: `qa-positive-owner-${stamp}@galaxia-audit.test`,
      password
    });
    if (ownerSignInErr) throw new Error(`owner sign-in failed: ${ownerSignInErr.message}`);
    const { error: insertErr } = await ownerAnon.from("support_requests").insert({
      owner_id: requestOwnerId,
      email: `qa-positive-owner-${stamp}@galaxia-audit.test`,
      subject: "QA positive-path probe",
      body: "Ignore — throwaway test row."
    });
    if (insertErr) throw new Error(`seed support request failed: ${insertErr.message}`);
    const { data: seeded, error: seedFetchErr } = await admin
      .from("support_requests")
      .select("id")
      .eq("owner_id", requestOwnerId)
      .single();
    if (seedFetchErr || !seeded) throw new Error(`seed fetch failed: ${seedFetchErr?.message}`);
    requestId = seeded.id;

    // Sign in as the throwaway admin
    const adminAnon = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
    const { data: signedIn, error: signInErr } = await adminAnon.auth.signInWithPassword({
      email: `qa-positive-admin-${stamp}@galaxia-audit.test`,
      password
    });
    if (signInErr || !signedIn.session) throw new Error(`admin sign-in failed: ${signInErr?.message}`);
    const cookieHeader = buildAuthCookieHeader(signedIn.session);

    const results = {};

    // 1) resend-email as real admin against the unconfirmed target
    const resendRes = await fetch(`${BASE_URL}/api/admin/users/${targetUnconfirmedId}/resend-email`, {
      method: "POST",
      headers: { cookie: cookieHeader }
    });
    results.resendEmail = { status: resendRes.status, body: await resendRes.json().catch(() => null) };

    // 2) close the support request as real admin
    const closeRes = await fetch(`${BASE_URL}/api/admin/support/${requestId}/close`, {
      method: "POST",
      headers: { cookie: cookieHeader }
    });
    results.close = { status: closeRes.status, body: await closeRes.json().catch(() => null) };

    // 3) reopen it
    const reopenRes = await fetch(`${BASE_URL}/api/admin/support/${requestId}/reopen`, {
      method: "POST",
      headers: { cookie: cookieHeader }
    });
    results.reopen = { status: reopenRes.status, body: await reopenRes.json().catch(() => null) };

    // 4) audit rows
    const { data: auditRows } = await admin
      .from("admin_audit_log")
      .select("actor_id, action, target_user_id, metadata")
      .eq("actor_id", adminUserId)
      .order("created_at", { ascending: true });
    results.auditRows = auditRows;

    console.log(JSON.stringify(results, null, 2));
  } finally {
    await admin.from("admin_audit_log").delete().eq("actor_id", adminUserId);
    if (requestOwnerId) await admin.from("support_requests").delete().eq("owner_id", requestOwnerId);
    if (adminUserId) await admin.from("admin_users").delete().eq("owner_id", adminUserId);
    for (const id of [adminUserId, targetUnconfirmedId, requestOwnerId]) {
      if (!id) continue;
      await admin.from("profiles").delete().eq("id", id);
      const { error } = await admin.auth.admin.deleteUser(id);
      if (error) console.error(`cleanup: failed to delete test user ${id}: ${error.message}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

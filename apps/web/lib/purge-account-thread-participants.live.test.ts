/**
 * VERIFY proof: purge_own_account_data must clear thread_participants rows
 * on threads the caller does not own, and must null admin_audit_log
 * actor_id / target_user_id, so auth.users can be deleted afterwards with
 * no NO ACTION FK leftover. This is the regression that silently returned
 * when a later CREATE OR REPLACE of the function dropped the
 * thread_participants delete.
 *
 * Hits a LIVE, disposable Supabase project (no local Postgres/Supabase
 * stack is wired up in this monorepo). Quarantined out of the default suite
 * (`*.live.test.ts`) and gated by `assertDisposableDbTarget`. Run via
 * `pnpm --filter web test:live` with
 * `ALLOW_LIVE_DB_TESTS_AGAINST=<disposable-ref>` set; aborts loudly against
 * prod or with no opt-in.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { assertDisposableDbTarget } from "./test-utils/assert-not-prod";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? "";

assertDisposableDbTarget(SUPABASE_URL);
if (!SERVICE_ROLE_KEY || !ANON_KEY) {
  throw new Error("[live-db test] ABORT: SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY are not both set.");
}

describe("VERIFY (live DB): purge_own_account_data clears thread_participants and nulls audit FKs", () => {
  let admin: SupabaseClient;
  let owner: SupabaseClient;
  let departing: SupabaseClient;
  let ownerId = "";
  let departingId = "";
  let threadId = "";
  let actorRowId = "";
  let targetRowId = "";
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const password = `Qa-${Math.random().toString(36).slice(2, 10)}!Aa1`;

  async function createSignedIn(tag: string): Promise<{ id: string; client: SupabaseClient }> {
    const email = `qa-purge-${tag}-${stamp}@galaxia-audit.test`;
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });
    if (createErr || !created?.user) throw new Error(`create user ${tag} failed: ${createErr?.message}`);
    const client = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
    const { error: signInErr } = await client.auth.signInWithPassword({ email, password });
    if (signInErr) throw new Error(`sign-in ${tag} failed: ${signInErr.message}`);
    return { id: created.user.id, client };
  }

  beforeAll(async () => {
    admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const ownerCreated = await createSignedIn("owner");
    const departingCreated = await createSignedIn("departing");
    ownerId = ownerCreated.id;
    departingId = departingCreated.id;
    owner = ownerCreated.client;
    departing = departingCreated.client;

    const { data: thread, error: threadErr } = await admin
      .from("threads")
      .insert({ owner_id: ownerId, mode: "ask" })
      .select("id")
      .single();
    if (threadErr || !thread) throw new Error(`thread create failed: ${threadErr?.message}`);
    threadId = thread.id as string;

    const { error: partErr } = await admin.from("thread_participants").insert({
      thread_id: threadId,
      user_id: departingId,
      consented_at: new Date().toISOString()
    });
    if (partErr) throw new Error(`thread_participants insert failed: ${partErr.message}`);

    const { data: actorRow, error: actorErr } = await admin
      .from("admin_audit_log")
      .insert({ actor_id: departingId, action: "grant_comp", target_user_id: ownerId })
      .select("id")
      .single();
    if (actorErr || !actorRow) throw new Error(`audit actor row insert failed: ${actorErr?.message}`);
    actorRowId = actorRow.id as string;

    const { data: targetRow, error: targetErr } = await admin
      .from("admin_audit_log")
      .insert({ actor_id: ownerId, action: "revoke_comp", target_user_id: departingId })
      .select("id")
      .single();
    if (targetErr || !targetRow) throw new Error(`audit target row insert failed: ${targetErr?.message}`);
    targetRowId = targetRow.id as string;
  }, 30_000);

  afterAll(async () => {
    if (actorRowId) await admin.from("admin_audit_log").delete().eq("id", actorRowId);
    if (targetRowId) await admin.from("admin_audit_log").delete().eq("id", targetRowId);
    if (threadId) await admin.from("thread_participants").delete().eq("thread_id", threadId);
    if (threadId) await admin.from("threads").delete().eq("id", threadId);
    if (departingId) await admin.from("profiles").delete().eq("id", departingId);
    if (ownerId) await admin.from("profiles").delete().eq("id", ownerId);
    if (departingId) await admin.auth.admin.deleteUser(departingId);
    if (ownerId) await admin.auth.admin.deleteUser(ownerId);
  }, 30_000);

  it("clears participation, keeps audit rows with nulled FKs, then auth.users delete succeeds", async () => {
    const { error: purgeError } = await departing.rpc("purge_own_account_data");
    expect(purgeError).toBeNull();

    const { data: leftover, error: leftoverErr } = await admin
      .from("thread_participants")
      .select("user_id")
      .eq("user_id", departingId);
    expect(leftoverErr).toBeNull();
    expect(leftover).toEqual([]);

    const { data: actorRow, error: actorReadErr } = await admin
      .from("admin_audit_log")
      .select("id, actor_id, target_user_id")
      .eq("id", actorRowId)
      .single();
    expect(actorReadErr).toBeNull();
    expect(actorRow).toEqual({
      id: actorRowId,
      actor_id: null,
      target_user_id: ownerId
    });

    const { data: targetRow, error: targetReadErr } = await admin
      .from("admin_audit_log")
      .select("id, actor_id, target_user_id")
      .eq("id", targetRowId)
      .single();
    expect(targetReadErr).toBeNull();
    expect(targetRow).toEqual({
      id: targetRowId,
      actor_id: ownerId,
      target_user_id: null
    });

    const { error: deleteErr } = await admin.auth.admin.deleteUser(departingId);
    expect(deleteErr).toBeNull();
    departingId = "";
  });
});

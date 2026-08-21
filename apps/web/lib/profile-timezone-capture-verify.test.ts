/**
 * VERIFY proof (nudge-delivery Phase A — `profiles.timezone` capture):
 *
 *   1. A user CAN write their own `profiles.timezone` (own-row session
 *      client, no service role) with a valid IANA value — proves the new
 *      column grant (`grant insert/update (..., timezone) ... to
 *      authenticated`) actually works end to end via PostgREST, not just in
 *      `information_schema`.
 *   2. A user CANNOT write another user's `profiles.timezone` — proves the
 *      pre-existing owner-scoped RLS policy (`id = auth.uid()`) covers this
 *      new column exactly like every other owner-writable column.
 *   3. A deliberately malformed timezone value is rejected — proves the
 *      `profiles_validate_timezone` trigger (backed by `pg_timezone_names`)
 *      is a real server-side backstop, not just a client-side guard.
 *
 * This hits the LIVE Supabase project (no local Postgres/Supabase stack is
 * wired up in this monorepo — see AGENTS.md), the same way
 * `person-daily-nudges-concurrency.test.ts` already does. It creates two
 * throwaway auth users, writes/attempts writes against real `profiles`
 * rows, and cleans up everything it created (success or failure) in an
 * `afterAll`.
 *
 * Skips (with a clear reason, not silently) when Supabase credentials are
 * not present in the environment.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? "";
const hasLiveCreds =
  Boolean(SUPABASE_URL) &&
  Boolean(SERVICE_ROLE_KEY) &&
  Boolean(ANON_KEY) &&
  !SUPABASE_URL.includes("placeholder");

if (!hasLiveCreds) {
  // eslint-disable-next-line no-console
  console.warn(
    "[verify] profile-timezone-capture: SKIPPED — no live Supabase credentials " +
      "(NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY) " +
      "in this environment. This is a live-DB proof, not a pure-logic test; it needs the real " +
      "project. Run with those env vars set to exercise it."
  );
}

describe.skipIf(!hasLiveCreds)("VERIFY (live DB): profiles.timezone capture", () => {
  let admin: SupabaseClient;
  let ownerA: SupabaseClient;
  let ownerB: SupabaseClient;
  let userIdA = "";
  let userIdB = "";
  const emailA = `qa-tz-a-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@galaxia-audit.test`;
  const emailB = `qa-tz-b-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@galaxia-audit.test`;
  const password = `Qa-${Math.random().toString(36).slice(2, 10)}!Aa1`;

  beforeAll(async () => {
    admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

    const { data: createdA, error: createErrA } = await admin.auth.admin.createUser({
      email: emailA,
      password,
      email_confirm: true,
    });
    if (createErrA || !createdA?.user) throw new Error(`test user A create failed: ${createErrA?.message}`);
    userIdA = createdA.user.id;

    const { data: createdB, error: createErrB } = await admin.auth.admin.createUser({
      email: emailB,
      password,
      email_confirm: true,
    });
    if (createErrB || !createdB?.user) throw new Error(`test user B create failed: ${createErrB?.message}`);
    userIdB = createdB.user.id;

    ownerA = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
    const { error: signInErrA } = await ownerA.auth.signInWithPassword({ email: emailA, password });
    if (signInErrA) throw new Error(`test sign-in A failed: ${signInErrA.message}`);

    ownerB = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
    const { error: signInErrB } = await ownerB.auth.signInWithPassword({ email: emailB, password });
    if (signInErrB) throw new Error(`test sign-in B failed: ${signInErrB.message}`);
  }, 30_000);

  afterAll(async () => {
    if (userIdA) await admin.from("profiles").delete().eq("id", userIdA);
    if (userIdA) await admin.auth.admin.deleteUser(userIdA);
    if (userIdB) await admin.from("profiles").delete().eq("id", userIdB);
    if (userIdB) await admin.auth.admin.deleteUser(userIdB);
  }, 30_000);

  it("a user can write a valid IANA timezone to their own row", async () => {
    const { error } = await ownerA.from("profiles").update({ timezone: "America/New_York" }).eq("id", userIdA);
    expect(error).toBeNull();

    const { data, error: readErr } = await admin.from("profiles").select("timezone").eq("id", userIdA).single();
    expect(readErr).toBeNull();
    expect(data?.timezone).toBe("America/New_York");
  }, 30_000);

  it("a user cannot write another user's timezone (RLS, own row only)", async () => {
    // Same session client as the "own row" case above, but targeting B's id
    // — RLS's `with check (id = auth.uid())` filters this update to zero
    // rows rather than erroring, exactly like every other owner-scoped
    // profiles write (display_name, house_system).
    const { data, error } = await ownerA
      .from("profiles")
      .update({ timezone: "Europe/London" })
      .eq("id", userIdB)
      .select("id");
    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);

    const { data: bRow, error: readErr } = await admin.from("profiles").select("timezone").eq("id", userIdB).single();
    expect(readErr).toBeNull();
    expect(bRow?.timezone).not.toBe("Europe/London");
  }, 30_000);

  it("the server-side trigger rejects a malformed timezone value", async () => {
    const { error } = await ownerB.from("profiles").update({ timezone: "Not/A/Real/Zone" }).eq("id", userIdB);
    expect(error).not.toBeNull();
    expect(error?.message ?? "").toMatch(/invalid timezone/i);

    const { data, error: readErr } = await admin.from("profiles").select("timezone").eq("id", userIdB).single();
    expect(readErr).toBeNull();
    // The rejected write never landed — still whatever it was before (null,
    // since this account never had a valid write succeed).
    expect(data?.timezone).toBeNull();
  }, 30_000);

  it("a null timezone remains a valid, un-rejected value (existing users start null)", async () => {
    const { error } = await ownerB.from("profiles").update({ timezone: null }).eq("id", userIdB);
    expect(error).toBeNull();
  }, 30_000);
});

/**
 * VERIFY proof (audit item 3, "concurrent write"): two racing
 * buildPersonDailyNudge + upsert calls for the same (person_id, date) must
 * leave exactly one row, and the first writer's content must never be
 * overwritten by a later racer — the "first write wins, frozen forever"
 * guarantee that switching the three call sites to
 * `{ onConflict: "person_id,date", ignoreDuplicates: true }` (audit item 2)
 * is supposed to buy us.
 *
 * This hits a LIVE, disposable Supabase project (no local Postgres/Supabase
 * stack is wired up in this monorepo — see AGENTS.md), the same way
 * `@galaxia/astro`'s geocoding tests already make live network calls. It
 * creates a throwaway auth user + person, writes to real
 * `person_daily_nudges` rows, and cleans up everything it created (success
 * or failure) in an `afterAll`.
 *
 * Quarantined out of the default suite (`*.live.test.ts`, its own vitest
 * project) and gated by `assertDisposableDbTarget` — see
 * `apps/web/lib/test-utils/assert-not-prod.ts` and `test:live` in
 * `package.json`. Run via `pnpm --filter web test:live` with
 * `ALLOW_LIVE_DB_TESTS_AGAINST=<disposable-ref>` set; aborts loudly against
 * prod or with no opt-in.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { buildPersonDailyNudge, whenUTCForOwnerLocalDate, type PersonDailyNudgeRecord } from "@galaxia/astro";
import { assertDisposableDbTarget } from "./test-utils/assert-not-prod";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? "";

// Structural backstop: throws and aborts this whole file before any client
// is constructed unless SUPABASE_URL is an explicitly allow-listed
// disposable project — never prod. See assert-not-prod.ts.
assertDisposableDbTarget(SUPABASE_URL);
if (!SERVICE_ROLE_KEY || !ANON_KEY) {
  throw new Error("[live-db test] ABORT: SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY are not both set.");
}

describe("VERIFY (live DB): person_daily_nudges concurrent write", () => {
  let admin: SupabaseClient;
  let owner: SupabaseClient;
  let userId = "";
  let personId = "";
  const email = `qa-nudge-race-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@galaxia-audit.test`;
  const password = `Qa-${Math.random().toString(36).slice(2, 10)}!Aa1`;
  const date = "2031-01-15"; // far-future date — never collides with a real user's real day.

  beforeAll(async () => {
    admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createErr || !created?.user) throw new Error(`test user create failed: ${createErr?.message}`);
    userId = created.user.id;

    const { data: person, error: personErr } = await admin
      .from("people")
      .insert({ owner_id: userId, display_name: "QA Race Person", relation: "self", is_self: true })
      .select("id")
      .single();
    if (personErr || !person) throw new Error(`test person create failed: ${personErr?.message}`);
    personId = person.id as string;

    owner = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
    const { error: signInErr } = await owner.auth.signInWithPassword({ email, password });
    if (signInErr) throw new Error(`test sign-in failed: ${signInErr.message}`);
  }, 30_000);

  afterAll(async () => {
    if (personId) await admin.from("person_daily_nudges").delete().eq("person_id", personId);
    if (personId) await admin.from("people").delete().eq("id", personId);
    // `profiles.id` has no ON DELETE CASCADE from auth.users, so the profile
    // row (created by the handle_new_user trigger) must go first or
    // deleteUser fails on the FK and leaves the test account behind.
    if (userId) await admin.from("profiles").delete().eq("id", userId);
    if (userId) await admin.auth.admin.deleteUser(userId);
  }, 30_000);

  function baseRow(tag: string): PersonDailyNudgeRecord {
    const row = buildPersonDailyNudge({
      ownerId: userId,
      personId,
      date,
      whenUTC: whenUTCForOwnerLocalDate(date),
      chart: null,
      birthPrecision: "none",
      relation: "self",
      isSelf: true,
      minorSafe: false,
    });
    // Tag the frozen copy so we can tell which writer's row survived without
    // depending on non-deterministic astrology output (chart is null here on
    // purpose — this test is about the upsert conflict semantics, not the
    // selection engine, which already has its own VERIFY coverage).
    return { ...row, copy_resolved: `${tag}:${row.copy_resolved}`, owner_id: userId, person_id: personId, date };
  }

  it("sequential: a second upsert for an already-written row never overwrites it (frozen forever)", async () => {
    const first = baseRow("WRITER-1");
    const second = baseRow("WRITER-2");

    const { error: e1 } = await owner
      .from("person_daily_nudges")
      .upsert(first, { onConflict: "person_id,date", ignoreDuplicates: true });
    expect(e1).toBeNull();

    const { error: e2 } = await owner
      .from("person_daily_nudges")
      .upsert(second, { onConflict: "person_id,date", ignoreDuplicates: true });
    expect(e2).toBeNull();

    const { data: rows, error: readErr } = await owner
      .from("person_daily_nudges")
      .select("*")
      .eq("person_id", personId)
      .eq("date", date);
    expect(readErr).toBeNull();
    expect(rows).toHaveLength(1);
    expect(rows![0]!.copy_resolved).toBe(first.copy_resolved);
    expect(rows![0]!.copy_resolved).not.toBe(second.copy_resolved);

    await admin.from("person_daily_nudges").delete().eq("person_id", personId).eq("date", date);
  }, 30_000);

  it("genuinely concurrent: two simultaneous upserts for the same (person_id, date) leave exactly one, uncorrupted row", async () => {
    const a = baseRow("WRITER-A");
    const b = baseRow("WRITER-B");

    // Fired back-to-back with no await between them — both requests are in
    // flight at once, a real race for the same primary key.
    const pa = owner.from("person_daily_nudges").upsert(a, { onConflict: "person_id,date", ignoreDuplicates: true });
    const pb = owner.from("person_daily_nudges").upsert(b, { onConflict: "person_id,date", ignoreDuplicates: true });
    const [ra, rb] = await Promise.all([pa, pb]);
    expect(ra.error).toBeNull();
    expect(rb.error).toBeNull();

    const { data: rows, error: readErr } = await owner
      .from("person_daily_nudges")
      .select("*")
      .eq("person_id", personId)
      .eq("date", date);
    expect(readErr).toBeNull();
    // Exactly one row survives the race — the DEFAULT upsert (update-on-
    // conflict) this replaced would have let the loser silently rewrite the
    // winner's fields; ignoreDuplicates: true makes the second racer's
    // INSERT a no-op instead.
    expect(rows).toHaveLength(1);
    // No partial merge: the surviving row is exactly one writer's content,
    // never a blend of both.
    expect([a.copy_resolved, b.copy_resolved]).toContain(rows![0]!.copy_resolved);

    await admin.from("person_daily_nudges").delete().eq("person_id", personId).eq("date", date);
  }, 30_000);
});

/**
 * VERIFY proof for 20260913160000_constellation_connect_schema.sql:
 * purge_own_account_data must end every constellation-connect relationship in
 * BOTH directions. For a departing user who is the subject of one grant and
 * the viewer of another, it must strip the mirrored chart and shared birth
 * columns out of the other user's galaxy, clear chart_source and
 * linked_user_id in the same statement (a CHECK is evaluated per statement),
 * delete connection_grants rows as subject and as viewer, leave no orphaned
 * mirrored chart, and leave auth.users deletable afterwards with no NO ACTION
 * FK leftover. Same shape and the same reason as
 * purge-account-thread-participants.live.test.ts.
 *
 * Hits a LIVE, disposable Supabase project (no local Supabase stack is wired
 * up in this monorepo). Quarantined out of the default suite
 * (`*.live.test.ts`) and gated by `assertDisposableDbTarget`. Run via
 * `pnpm --filter web test:live` with
 * `ALLOW_LIVE_DB_TESTS_AGAINST=<disposable-ref>` set; aborts loudly against
 * prod or with no opt-in.
 *
 * The same scenario was executed against a local PostgreSQL 16 replay of the
 * full committed migration history while this migration was written, because
 * no disposable Supabase project exists yet. This file is the reproducible
 * version of that proof for whoever applies the migration.
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

const CHART = { placements: [{ body: "sun", sign: "aries", lon: 11.2 }] };

describe("VERIFY (live DB): purge_own_account_data ends connect grants in both directions", () => {
  let admin: SupabaseClient;
  let departing: SupabaseClient;
  /** The sender: holds a mirror of the departing user. Departing user is the SUBJECT. */
  let senderId = "";
  /** The departing user, who is purging. */
  let departingId = "";
  /** A third party whose chart the departing user mirrors. Departing user is the VIEWER. */
  let thirdId = "";
  let departingSelfPersonId = "";
  let thirdSelfPersonId = "";
  /** In the sender's galaxy: the mirror of the departing user. */
  let senderMirrorPersonId = "";
  /** In the departing user's galaxy: the mirror of the third party. */
  let departingMirrorPersonId = "";
  let inviteId = "";
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const password = `Qa-${Math.random().toString(36).slice(2, 10)}!Aa1`;

  async function createSignedIn(tag: string): Promise<{ id: string; client: SupabaseClient }> {
    const email = `qa-grants-${tag}-${stamp}@galaxia-audit.test`;
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

  async function insertPerson(row: Record<string, unknown>): Promise<string> {
    const { data, error } = await admin.from("people").insert(row).select("id").single();
    if (error || !data) throw new Error(`people insert failed: ${error?.message}`);
    return data.id as string;
  }

  async function insertChart(personId: string): Promise<void> {
    const { error } = await admin.from("charts").insert({
      person_id: personId,
      data: CHART,
      house_system: "placidus",
      engine_version: 1
    });
    if (error) throw new Error(`charts insert failed: ${error.message}`);
  }

  beforeAll(async () => {
    admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const senderCreated = await createSignedIn("sender");
    const departingCreated = await createSignedIn("departing");
    const thirdCreated = await createSignedIn("third");
    senderId = senderCreated.id;
    departingId = departingCreated.id;
    thirdId = thirdCreated.id;
    departing = departingCreated.client;

    await insertPerson({ owner_id: senderId, is_self: true, display_name: "Sender" });

    departingSelfPersonId = await insertPerson({
      owner_id: departingId,
      is_self: true,
      display_name: "Departing",
      birth_date: "1990-04-01",
      birth_time: "07:30",
      birth_place: "Lisbon, Portugal",
      birth_lat: 38.72,
      birth_lng: -9.14,
      tz_offset_min: 60,
      birth_precision: "exact"
    });
    await insertChart(departingSelfPersonId);

    thirdSelfPersonId = await insertPerson({
      owner_id: thirdId,
      is_self: true,
      display_name: "Third",
      birth_date: "1985-11-02",
      birth_precision: "date"
    });
    await insertChart(thirdSelfPersonId);

    // Outgoing: the departing user's chart mirrored into the sender's galaxy,
    // at 'details' level so the birth columns are populated and we can prove
    // they are stripped rather than merely unreferenced.
    senderMirrorPersonId = await insertPerson({
      owner_id: senderId,
      display_name: "Maya",
      relation: "partner",
      birth_precision: "exact",
      linked_user_id: departingId,
      chart_source: "linked",
      birth_date: "1990-04-01",
      birth_time: "07:30",
      birth_place: "Lisbon, Portugal",
      birth_lat: 38.72,
      birth_lng: -9.14,
      tz_offset_min: 60
    });
    await insertChart(senderMirrorPersonId);

    // Incoming: the third party's chart mirrored into the departing user's galaxy.
    departingMirrorPersonId = await insertPerson({
      owner_id: departingId,
      display_name: "Third",
      relation: "friend",
      birth_precision: "date",
      linked_user_id: thirdId,
      chart_source: "linked"
    });
    await insertChart(departingMirrorPersonId);

    const { error: outgoingErr } = await admin.from("connection_grants").insert({
      subject_user: departingId,
      viewer_user: senderId,
      viewer_person_id: senderMirrorPersonId,
      share_level: "details",
      status: "active"
    });
    if (outgoingErr) throw new Error(`outgoing grant insert failed: ${outgoingErr.message}`);

    const { error: incomingErr } = await admin.from("connection_grants").insert({
      subject_user: thirdId,
      viewer_user: departingId,
      viewer_person_id: departingMirrorPersonId,
      share_level: "chart",
      status: "active"
    });
    if (incomingErr) throw new Error(`incoming grant insert failed: ${incomingErr.message}`);

    // The sender's invite, accepted by the departing user. Must survive the
    // purge anonymized, not be cascaded away.
    const { data: invite, error: inviteErr } = await admin
      .from("invites")
      .insert({
        token: `qa-connect-${stamp}`,
        from_user: senderId,
        kind: "constellation_connect",
        relationship_type: "partner",
        expires_at: new Date(Date.now() + 14 * 86_400_000).toISOString(),
        status: "accepted",
        person_id: senderMirrorPersonId,
        accepted_by: departingId,
        accepted_at: new Date().toISOString()
      })
      .select("id")
      .single();
    if (inviteErr || !invite) throw new Error(`invite insert failed: ${inviteErr?.message}`);
    inviteId = invite.id as string;
  }, 60_000);

  afterAll(async () => {
    if (inviteId) await admin.from("invites").delete().eq("id", inviteId);
    for (const uid of [senderId, departingId, thirdId].filter(Boolean)) {
      await admin.from("connection_grants").delete().or(`subject_user.eq.${uid},viewer_user.eq.${uid}`);
    }
    for (const uid of [senderId, departingId, thirdId].filter(Boolean)) {
      await admin.from("people").update({ chart_source: "local", linked_user_id: null }).eq("linked_user_id", uid);
    }
    for (const uid of [senderId, departingId, thirdId].filter(Boolean)) {
      await admin.from("people").delete().eq("owner_id", uid);
      await admin.from("profiles").delete().eq("id", uid);
      await admin.auth.admin.deleteUser(uid);
    }
  }, 60_000);

  it("strips both mirrors, clears grants both ways, and leaves auth.users deletable", async () => {
    const { error: purgeError } = await departing.rpc("purge_own_account_data");
    expect(purgeError).toBeNull();

    // ── Outgoing side: the sender keeps the bare star they named ──────────
    const { data: senderMirror, error: senderMirrorErr } = await admin
      .from("people")
      .select(
        "id, owner_id, display_name, relation, chart_source, linked_user_id, birth_precision, " +
          "birth_date, birth_time, birth_place, birth_lat, birth_lng, tz_offset_min"
      )
      .eq("id", senderMirrorPersonId)
      .single();
    expect(senderMirrorErr).toBeNull();
    expect(senderMirror).toEqual({
      id: senderMirrorPersonId,
      owner_id: senderId,
      // Their own label and their own chosen relation survive.
      display_name: "Maya",
      relation: "partner",
      // Everything that was only ever on loan is gone.
      chart_source: "local",
      linked_user_id: null,
      birth_precision: "none",
      birth_date: null,
      birth_time: null,
      birth_place: null,
      birth_lat: null,
      birth_lng: null,
      tz_offset_min: null
    });

    const { data: strippedChart, error: strippedChartErr } = await admin
      .from("charts")
      .select("person_id")
      .eq("person_id", senderMirrorPersonId);
    expect(strippedChartErr).toBeNull();
    expect(strippedChart).toEqual([]);

    // ── Incoming side: the departing user's galaxy is gone, nothing orphaned ──
    const { data: departingPeople, error: departingPeopleErr } = await admin
      .from("people")
      .select("id")
      .eq("owner_id", departingId);
    expect(departingPeopleErr).toBeNull();
    expect(departingPeople).toEqual([]);

    const { data: departingCharts, error: departingChartsErr } = await admin
      .from("charts")
      .select("person_id")
      .in("person_id", [departingSelfPersonId, departingMirrorPersonId]);
    expect(departingChartsErr).toBeNull();
    expect(departingCharts).toEqual([]);

    // The subject of the incoming grant is untouched: purging a viewer must
    // not reach back into the subject's own galaxy.
    const { data: thirdChart, error: thirdChartErr } = await admin
      .from("charts")
      .select("person_id")
      .eq("person_id", thirdSelfPersonId)
      .single();
    expect(thirdChartErr).toBeNull();
    expect(thirdChart).toEqual({ person_id: thirdSelfPersonId });

    // ── Grants cleared in both directions ────────────────────────────────
    const { data: grants, error: grantsErr } = await admin
      .from("connection_grants")
      .select("id")
      .or(`subject_user.eq.${departingId},viewer_user.eq.${departingId}`);
    expect(grantsErr).toBeNull();
    expect(grants).toEqual([]);

    // ── No people row anywhere still points at the departing account ─────
    const { data: danglingLinks, error: danglingErr } = await admin
      .from("people")
      .select("id")
      .eq("linked_user_id", departingId);
    expect(danglingErr).toBeNull();
    expect(danglingLinks).toEqual([]);

    // ── The sender's invite history survives, anonymized ─────────────────
    const { data: invite, error: inviteReadErr } = await admin
      .from("invites")
      .select("id, from_user, status, accepted_by, accepted_at")
      .eq("id", inviteId)
      .single();
    expect(inviteReadErr).toBeNull();
    expect(invite?.from_user).toEqual(senderId);
    expect(invite?.status).toEqual("accepted");
    expect(invite?.accepted_by).toBeNull();
    expect(invite?.accepted_at).not.toBeNull();

    // ── Login row is already gone (purge deletes auth.users) ────────────
    const { error: deleteErr } = await admin.auth.admin.deleteUser(departingId);
    expect(
      deleteErr === null || /not found/i.test(deleteErr.message ?? "")
    ).toBe(true);
    departingId = "";

    const { data: inviteAfter, error: inviteAfterErr } = await admin
      .from("invites")
      .select("id, accepted_by, accepted_at")
      .eq("id", inviteId)
      .single();
    expect(inviteAfterErr).toBeNull();
    expect(inviteAfter?.accepted_by).toBeNull();
    expect(inviteAfter?.accepted_at).not.toBeNull();
  }, 60_000);
});

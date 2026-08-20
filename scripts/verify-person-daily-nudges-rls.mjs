#!/usr/bin/env node
/**
 * VERIFY proof (audit item 3, "RLS isolation") for `person_daily_nudges`,
 * and the DEPLOY+VERIFY live before/after proof for item 1.
 *
 * A genuine two-JWT test isn't feasible inside the `vitest` suite here — it
 * needs two real signed-in Supabase sessions against the live project, and
 * this monorepo has no local Supabase stack (see AGENTS.md). Per the audit's
 * own allowance ("if a two-JWT automated test isn't feasible in the suite,
 * write it as a runnable script and say so"), this is that script.
 *
 * It creates two throwaway accounts (A, B), each with one throwaway person,
 * signs in as each with the anon key (real RLS-enforced sessions, not
 * service role), and checks three things:
 *
 *   1. READ isolation (already correct pre-fix — proves item 1 is an
 *      integrity fix, not a read-leak fix): A writes a nudge row for A's own
 *      person; B cannot read it.
 *   2. WRITE integrity (the actual hole item 1 closes): can A write a
 *      person_daily_nudges row whose person_id belongs to B? Before the
 *      20260726000000_person_daily_nudges_rls_hardening.sql migration this
 *      succeeds (the hole); after, it must fail.
 *   3. Legit-owner sanity: A can still write/read a nudge row for A's own
 *      person (the tightened policy must not break the real path).
 *
 * Cleans up every row/user it creates, on success or failure.
 *
 * Usage (needs live creds — already present in this environment):
 *   node scripts/verify-person-daily-nudges-rls.mjs
 * Env: SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY,
 *      SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY).
 */

import { createClient } from "@supabase/supabase-js";

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
const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const password = `Qa-${Math.random().toString(36).slice(2, 10)}!Aa1`;

async function createAccountWithPerson(tag) {
  const email = `qa-rls-${tag}-${stamp}@galaxia-audit.test`;
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createErr || !created?.user) throw new Error(`create user ${tag} failed: ${createErr?.message}`);
  const userId = created.user.id;

  const { data: person, error: personErr } = await admin
    .from("people")
    .insert({ owner_id: userId, display_name: `QA RLS ${tag}`, relation: "self", is_self: true })
    .select("id")
    .single();
  if (personErr || !person) throw new Error(`create person ${tag} failed: ${personErr?.message}`);

  const client = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  const { error: signInErr } = await client.auth.signInWithPassword({ email, password });
  if (signInErr) throw new Error(`sign-in ${tag} failed: ${signInErr.message}`);

  return { userId, personId: person.id, client, email };
}

function nudgeRow(ownerId, personId, date) {
  return {
    owner_id: ownerId,
    person_id: personId,
    date,
    copy_key: "hedge:none",
    copy_tier: "empty_hedge",
    copy_resolved: "QA audit probe row — safe to ignore.",
    relationship_framing: "self",
    precision_mode: "none",
    minor_safe: false,
  };
}

async function main() {
  const results = { readIsolation: null, writeIntegrity: null, legitOwnerStillWorks: null };
  let a, b;
  const probeDate = "2032-02-02";
  try {
    a = await createAccountWithPerson("a");
    b = await createAccountWithPerson("b");

    // 1) A writes a nudge for A's own person.
    const { error: aWriteOwnErr } = await a.client
      .from("person_daily_nudges")
      .upsert(nudgeRow(a.userId, a.personId, probeDate), { onConflict: "person_id,date", ignoreDuplicates: true });
    results.legitOwnerStillWorks = { write: aWriteOwnErr ? `FAILED: ${aWriteOwnErr.message}` : "ok" };

    const { data: aOwnRow, error: aReadOwnErr } = await a.client
      .from("person_daily_nudges")
      .select("*")
      .eq("person_id", a.personId)
      .eq("date", probeDate)
      .maybeSingle();
    results.legitOwnerStillWorks.readBack = aReadOwnErr
      ? `FAILED: ${aReadOwnErr.message}`
      : aOwnRow
        ? "ok"
        : "FAILED: row not found after write";

    // 2) B tries to read A's row directly by (person_id, date) — must be empty.
    const { data: bReadsA, error: bReadErr } = await b.client
      .from("person_daily_nudges")
      .select("*")
      .eq("person_id", a.personId)
      .eq("date", probeDate);
    results.readIsolation = {
      error: bReadErr ? bReadErr.message : null,
      rowsVisibleToB: bReadsA?.length ?? 0,
      verdict: (bReadsA?.length ?? 0) === 0 ? "BLOCKED (correct — always was)" : "LEAK (unexpected!)",
    };

    // 3) A tries to write a person_daily_nudges row with owner_id = A but
    // person_id = B's person. This is the integrity hole item 1 closes.
    const crossRow = nudgeRow(a.userId, b.personId, probeDate);
    const { error: crossWriteErr, data: crossWriteData } = await a.client
      .from("person_daily_nudges")
      .upsert(crossRow, { onConflict: "person_id,date", ignoreDuplicates: true })
      .select("*");
    const { data: crossCheck } = await admin
      .from("person_daily_nudges")
      .select("*")
      .eq("person_id", b.personId)
      .eq("date", probeDate);
    const wroteCrossRow = (crossCheck?.length ?? 0) > 0;
    results.writeIntegrity = {
      supabaseError: crossWriteErr ? crossWriteErr.message : null,
      rowActuallyLanded: wroteCrossRow,
      verdict: wroteCrossRow
        ? "OPEN — A wrote a row referencing B's person (integrity hole present)"
        : "CLOSED — cross-owner person_id write was rejected",
    };

    console.log(JSON.stringify(results, null, 2));
  } finally {
    // Cleanup — always, success or failure. `profiles.id` has no ON DELETE
    // CASCADE from auth.users, so the profile row (created by the
    // handle_new_user trigger) must be deleted before the auth user, or
    // deleteUser fails on the FK and leaves the test account behind.
    for (const acc of [a, b]) {
      if (!acc) continue;
      await admin.from("person_daily_nudges").delete().eq("owner_id", acc.userId);
      await admin.from("person_daily_nudges").delete().eq("person_id", acc.personId);
      await admin.from("people").delete().eq("id", acc.personId);
      await admin.from("profiles").delete().eq("id", acc.userId);
      const { error: delUserErr } = await admin.auth.admin.deleteUser(acc.userId);
      if (delUserErr) console.error(`cleanup: failed to delete test user ${acc.email}: ${delUserErr.message}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * One-time (re-runnable) detection pass for stored Vela fabrications.
 *
 * Scans `messages` (sender='vela') and `notes` for asserted Sun/Moon/Rising
 * zodiac placements, then cross-checks each assertion against the relevant
 * person's computed chart. Flags:
 *   - a concrete sign asserted for a body whose placement is NOT `confident`
 *     (year/date-precision people — the true sign is unknowable), or
 *   - a concrete sign asserted that does not match the computed, confident
 *     sign for that body.
 *
 * For pair-scoped threads/notes, an assertion is only flagged if it matches
 * NEITHER person in the pair (a same-thread mention of the OTHER person's
 * correct placement is not a fabrication).
 *
 * This script only REPORTS. It never writes to the database. See
 * `scripts/mark-vela-fabrications-withdrawn.mjs` for the (separate,
 * explicit) marking step, which takes this script's output as input.
 *
 * Usage (run from apps/web, or any workspace with @supabase/supabase-js installed):
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node ../../scripts/detect-vela-fabrications.mjs
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

const SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
const SIGN_RE = SIGNS.join("|");
const BODY_WORDS = { Sun: "sun", Moon: "moon", Rising: "asc", Ascendant: "asc" };
const BODY_RE = Object.keys(BODY_WORDS).join("|");

// "Cancer Sun", "Scorpio Moon", "Pisces Rising" ...
const RE_SIGN_FIRST = new RegExp(`\\b(${SIGN_RE})\\s+(${BODY_RE})\\b`, "gi");
// "Sun in Capricorn", "Moon in Taurus", "Rising in Virgo" ...
const RE_BODY_FIRST = new RegExp(`\\b(${BODY_RE})(?:\\s+is)?\\s+in\\s+(${SIGN_RE})\\b`, "gi");

/** Extract [{ body: 'sun'|'moon'|'asc', sign: 'Capricorn' }, ...] from free text. */
function extractAssertions(text) {
  const out = [];
  for (const m of text.matchAll(RE_SIGN_FIRST)) out.push({ sign: cap(m[1]), body: BODY_WORDS[cap(m[2])] });
  for (const m of text.matchAll(RE_BODY_FIRST)) out.push({ sign: cap(m[2]), body: BODY_WORDS[cap(m[1])] });
  return out;
}
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase(); }

/** { sign, confident } for a body ('sun'|'moon') from a computed chart, or asc directly. */
function computedPlacement(chart, body) {
  if (!chart) return null;
  if (body === "asc") return chart.asc ? { sign: chart.asc, confident: true } : null;
  const p = (chart.placements ?? []).find((pl) => pl.body === body);
  if (!p) return null;
  return { sign: p.sign, confident: p.confident !== false };
}

async function main() {
  const { data: messages } = await supabase
    .from("messages")
    .select("id, thread_id, sender, body, created_at, threads(id, owner_id, subject_person, pair_low, pair_high)")
    .eq("sender", "vela");

  const { data: notes } = await supabase
    .from("notes")
    .select("id, owner_id, about_person, pair_low, pair_high, kind, body, created_at");

  // Preload every person + chart referenced, to avoid N+1 queries.
  const personIds = new Set();
  for (const m of messages ?? []) {
    const t = m.threads;
    if (t?.subject_person) personIds.add(t.subject_person);
    if (t?.pair_low) personIds.add(t.pair_low);
    if (t?.pair_high) personIds.add(t.pair_high);
  }
  for (const n of notes ?? []) {
    if (n.about_person) personIds.add(n.about_person);
    if (n.pair_low) personIds.add(n.pair_low);
    if (n.pair_high) personIds.add(n.pair_high);
  }

  const { data: people } = await supabase.from("people").select("id, display_name, is_minor").in("id", [...personIds]);
  const { data: charts } = await supabase.from("charts").select("person_id, data").in("person_id", [...personIds]);
  const personById = new Map((people ?? []).map((p) => [p.id, p]));
  const chartById = new Map((charts ?? []).map((c) => [c.person_id, c.data]));

  const flagged = [];

  function evaluate(source, id, createdAt, scopePersonIds, body) {
    const assertions = extractAssertions(body);
    if (assertions.length === 0) return;
    const scopedPeople = scopePersonIds.filter(Boolean).map((pid) => ({ id: pid, chart: chartById.get(pid), person: personById.get(pid) }));
    if (scopedPeople.length === 0) return;

    for (const { sign, body: assertedBody } of assertions) {
      // Match against ANY scoped person; flag only if it matches NONE.
      let matchedAny = false;
      let bestMismatch = null;
      for (const sp of scopedPeople) {
        const computed = computedPlacement(sp.chart, assertedBody);
        if (!computed) continue;
        if (computed.confident && computed.sign === sign) { matchedAny = true; break; }
        if (!bestMismatch) bestMismatch = { person: sp.person, computed };
      }
      if (!matchedAny && bestMismatch) {
        flagged.push({
          source, id, created_at: createdAt,
          person_id: bestMismatch.person?.id, person_name: bestMismatch.person?.display_name,
          is_minor: bestMismatch.person?.is_minor ?? false,
          asserted: `${assertedBody} = ${sign}`,
          computed: bestMismatch.computed.confident
            ? `${assertedBody} = ${bestMismatch.computed.sign}`
            : `${assertedBody} unconfident (precision cannot support a concrete sign)`,
        });
      }
    }
  }

  for (const m of messages ?? []) {
    const t = m.threads;
    if (!t) continue;
    evaluate("messages", m.id, m.created_at, [t.subject_person, t.pair_low, t.pair_high], m.body);
  }
  for (const n of notes ?? []) {
    evaluate("notes", n.id, n.created_at, [n.about_person, n.pair_low, n.pair_high], n.body);
  }

  console.log(JSON.stringify({ scanned: { messages: messages?.length ?? 0, notes: notes?.length ?? 0 }, flagged }, null, 2));
}

main().catch((err) => { console.error(err); process.exit(1); });

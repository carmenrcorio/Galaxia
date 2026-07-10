#!/usr/bin/env node
/**
 * Marks specific messages/notes withdrawn. Reversible, not destructive —
 * only sets `withdrawn_at` + `withdrawn_reason`; the original body is kept
 * (the audit trail matters).
 *
 * Deliberately separate from detect-vela-fabrications.mjs: detection only
 * reports, this only acts, and it acts ONLY on ids you pass in — it never
 * decides on its own which rows are fabrications. Review the detector's
 * output before calling this.
 *
 * Usage (run from apps/web, or any workspace with @supabase/supabase-js installed):
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node ../../scripts/mark-vela-fabrications-withdrawn.mjs entries.json
 *
 * entries.json:
 *   [
 *     { "table": "messages", "id": "...", "reason": "Asserted X; computed chart shows Y (confident)." },
 *     { "table": "notes",    "id": "...", "reason": "..." }
 *   ]
 */

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const file = process.argv[2];

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
if (!file) {
  console.error("Usage: node scripts/mark-vela-fabrications-withdrawn.mjs entries.json");
  process.exit(1);
}

const entries = JSON.parse(readFileSync(file, "utf8"));
if (!Array.isArray(entries) || entries.length === 0) {
  console.error("entries.json must be a non-empty array of { table, id, reason }.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

async function main() {
  for (const entry of entries) {
    if (entry.table !== "messages" && entry.table !== "notes") {
      console.error(`Skipping ${entry.id}: table must be "messages" or "notes", got "${entry.table}".`);
      continue;
    }
    const { error } = await supabase
      .from(entry.table)
      .update({ withdrawn_at: new Date().toISOString(), withdrawn_reason: entry.reason })
      .eq("id", entry.id);
    if (error) console.error(`Failed to withdraw ${entry.table}.${entry.id}: ${error.message}`);
    else console.log(`Withdrawn: ${entry.table}.${entry.id}`);
  }
}

main().catch((err) => { console.error(err); process.exit(1); });

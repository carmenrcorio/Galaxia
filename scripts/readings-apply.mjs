#!/usr/bin/env node
/**
 * Apply approved rows from docs/readings-review/batch-NN.md into interpretation tables.
 * Usage: node scripts/readings-apply.mjs <batch.md> [--dry-run]
 */
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import {
  applyChironSynastryReadings,
  isApproved,
  parseBatch,
} from "./readings-apply-lib.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const batchPath = args.find((a) => !a.startsWith("--"));

if (!batchPath) {
  console.error("Usage: pnpm readings:apply <docs/readings-review/batch-NN.md> [--dry-run]");
  process.exit(1);
}

const absBatch = resolve(REPO_ROOT, batchPath);
const raw = readFileSync(absBatch, "utf8");

const allRows = parseBatch(raw);
const approved = allRows.filter((r) => isApproved(r.approve));

console.log(`Parsed ${allRows.length} entries; ${approved.length} approved.`);

if (approved.length === 0) {
  console.log("Nothing to apply. Set **Approve:** yes on rows to ship.");
  process.exit(0);
}

for (const row of approved) {
  if (!row.cell.includes("chiron")) {
    console.error(`${row.id}: only chiron synastry cells are supported in this script path (${row.cell})`);
    process.exit(1);
  }
}

const { added, updated, unchanged, totalMerged } = applyChironSynastryReadings(REPO_ROOT, approved, {
  dryRun,
});

console.log(
  dryRun
    ? `Dry run: would add ${added} cell(s), update ${updated} cell(s), leave ${unchanged} unchanged (${totalMerged} total Chiron cells after merge).`
    : `Applied: added ${added} cell(s), updated ${updated} cell(s), left ${unchanged} unchanged (${totalMerged} total Chiron cells).`
);

if (dryRun) {
  process.exit(0);
}

const test = spawnSync("pnpm", ["--filter", "@galaxia/astro", "test"], {
  cwd: REPO_ROOT,
  stdio: "inherit",
});
if (test.status !== 0) process.exit(test.status ?? 1);
console.log("Applied and @galaxia/astro tests passed.");

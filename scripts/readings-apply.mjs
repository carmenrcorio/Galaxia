#!/usr/bin/env node
/**
 * Apply approved rows from docs/readings-review/batch-NN.md into interpretation tables.
 * Usage: node scripts/readings-apply.mjs <batch.md> [--dry-run]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

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

/** @typedef {{ id: string, cell: string, short: string, long: string, approve: string }} Row */

/** @returns {Row[]} */
function parseBatch(md) {
  const rows = [];
  const chunks = md.split(/^### /m).slice(1);
  for (const chunk of chunks) {
    const headerLine = chunk.split("\n")[0] ?? "";
    const idMatch = headerLine.match(/^([A-Z]+-\d+)/);
    const cellMatch = headerLine.match(/·\s*`([^`]+)`/);
    if (!idMatch || !cellMatch) continue;
    const id = idMatch[1];
    const cell = cellMatch[1];
    const short = extractField(chunk, "Short");
    const long = extractField(chunk, "Long");
    const approve = extractField(chunk, "Approve").trim().toLowerCase();
    if (!short || !long) {
      console.warn(`Skip ${id}: missing short or long`);
      continue;
    }
    rows.push({ id, cell, short, long, approve });
  }
  return rows;
}

function extractField(chunk, name) {
  const re = new RegExp(`\\*\\*${name}:\\*\\*\\s*(.+?)(?=\\n-\\s\\*\\*|\\n### |$)`, "s");
  const m = chunk.match(re);
  return m ? m[1].trim() : "";
}

function escapeTsString(s) {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/** @param {Row[]} approved */
function buildSynastryBlock(approved) {
  const byPair = new Map();
  for (const row of approved) {
    const [pair, aspect] = row.cell.split(":");
    if (!pair || !aspect) throw new Error(`Bad cell ${row.cell} in ${row.id}`);
    if (!pair.includes("chiron")) {
      throw new Error(`${row.id}: readings:apply synastry path only handles chiron pairs in batch 01 (${row.cell})`);
    }
    if (!byPair.has(pair)) byPair.set(pair, {});
    byPair.get(pair)[aspect] = { short: row.short, long: row.long };
  }
  const lines = ["  // ---- CHIRON SYNASTRY (Batch 01) ----"];
  for (const pair of [...byPair.keys()].sort()) {
    lines.push(`  "${pair}": {`);
    for (const aspect of ["conjunction", "sextile", "square", "trine", "opposition"]) {
      const reading = byPair.get(pair)[aspect];
      if (!reading) continue;
      lines.push(`    ${aspect}: {`);
      lines.push(`      short: "${escapeTsString(reading.short)}",`);
      lines.push(`      long: "${escapeTsString(reading.long)}",`);
      lines.push(`    },`);
    }
    lines.push(`  },`);
  }
  return lines.join("\n");
}

function applyChironSynastry(block) {
  const path = join(REPO_ROOT, "packages/astro/src/synastry-interpretations.ts");
  let src = readFileSync(path, "utf8");
  const marker = "  // ---- CHIRON SYNASTRY (Batch 01) ----";
  const endMarker = "\n};";
  const pairClose = src.indexOf(endMarker, src.lastIndexOf("north_node-pluto"));
  if (pairClose === -1) throw new Error("Could not locate SYNASTRY_PAIR closing brace");

  if (src.includes(marker)) {
    const start = src.indexOf(marker);
    const nextSection = src.indexOf("\n};", start);
    src = src.slice(0, start) + block + "\n" + src.slice(nextSection);
  } else {
    src = src.slice(0, pairClose) + "\n" + block + "\n" + src.slice(pairClose);
  }
  writeFileSync(path, src);
}

const allRows = parseBatch(raw);
const approved = allRows.filter((r) => r.approve === "yes");

console.log(`Parsed ${allRows.length} entries; ${approved.length} approved.`);

if (approved.length === 0) {
  console.log("Nothing to apply. Set **Approve:** yes on rows to ship.");
  process.exit(0);
}

const block = buildSynastryBlock(approved);

if (dryRun) {
  console.log("\n--- DRY RUN: would insert/update ---\n");
  console.log(block);
  process.exit(0);
}

applyChironSynastry(block);

const test = spawnSync("pnpm", ["--filter", "@galaxia/astro", "test"], {
  cwd: REPO_ROOT,
  stdio: "inherit",
});
if (test.status !== 0) process.exit(test.status ?? 1);
console.log("Applied and @galaxia/astro tests passed.");

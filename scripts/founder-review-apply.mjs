#!/usr/bin/env node
/**
 * Apply founder approvals from docs/founder-review-queue.md.
 * Strips FOUNDER-REVIEW markers for checked rows only; never changes string text.
 *
 * Usage:
 *   pnpm founder-review:apply --dry-run
 *   pnpm founder-review:apply
 */

import { readFileSync, writeFileSync } from "node:fs";
import {
  QUEUE_PATH,
  ROOT,
  applyTagRemoval,
  parseQueueRows,
  scanAllTags,
} from "./founder-review-lib.mjs";

const dryRun = process.argv.includes("--dry-run");

const queueMd = readFileSync(QUEUE_PATH, "utf8");
const approved = parseQueueRows(queueMd).filter((r) => r.approved);
if (approved.length === 0) {
  console.log("No approved rows ([x]) in docs/founder-review-queue.md");
  process.exit(0);
}

const allTags = scanAllTags();
const byFile = new Map();
for (const row of approved) {
  if (!byFile.has(row.file)) byFile.set(row.file, { tagLines: new Set(), ids: [] });
  const bucket = byFile.get(row.file);
  for (const ln of row.tagLines) bucket.tagLines.add(ln);
  bucket.ids.push(row.id);
}

let changeCount = 0;
for (const [file, { tagLines, ids }] of byFile.entries()) {
  const abs = `${ROOT}/${file}`;
  let source;
  try {
    source = readFileSync(abs, "utf8");
  } catch {
    console.warn(`Missing file ${file}`);
    continue;
  }

  for (const row of approved.filter((r) => r.file === file)) {
    for (const ln of row.tagLines) {
      const hit = allTags.find((t) => t.file === file && t.line === ln);
      if (!hit) {
        console.warn(`${row.id}: no tag at ${file}:${ln}`);
      }
    }
  }

  const next = applyTagRemoval(source, [...tagLines]);
  if (next === source) {
    console.log(`${file}: no textual change (${ids.join(", ")})`);
    continue;
  }

  changeCount += 1;
  console.log(`${dryRun ? "[dry-run] " : ""}${file}: remove tags at lines ${[...tagLines].sort((a, b) => a - b).join(", ")} (${ids.join(", ")})`);
  if (!dryRun) {
    writeFileSync(abs, next.endsWith("\n") ? next : `${next}\n`, "utf8");
  }
}

console.log(
  dryRun
    ? `Dry run complete. Would update ${changeCount} file(s).`
    : `Updated ${changeCount} file(s). Re-run pnpm founder-review:list to verify.`,
);
process.exit(0);

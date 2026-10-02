#!/usr/bin/env node
/**
 * Count FOUNDER-REVIEW tag line removals on main, grouped by month.
 */

import { execFileSync } from "node:child_process";
import { ROOT } from "./founder-review-lib.mjs";

function countRemovalsInPatch(patch) {
  let n = 0;
  for (const line of patch.split("\n")) {
    if (line.startsWith("-") && !line.startsWith("---") && line.includes("FOUNDER-REVIEW")) {
      n += 1;
    }
  }
  return n;
}

let log;
try {
  log = execFileSync(
    "git",
    ["log", "main", "--pretty=format:@@@%H %ai", "-GFOUNDER-REVIEW", "-p", "--", "apps", "packages", "supabase", "content"],
    { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  );
} catch (e) {
  console.error(e.message);
  process.exit(1);
}

const chunks = log.split("@@@").filter(Boolean);
/** @type {Map<string, number>} */
const byMonth = new Map();
let total = 0;

for (const chunk of chunks) {
  const headerEnd = chunk.indexOf("\n");
  const header = chunk.slice(0, headerEnd);
  const patch = chunk.slice(headerEnd + 1);
  const month = header.match(/\d{4}-\d{2}/)?.[0] ?? "unknown";
  const removed = countRemovalsInPatch(patch);
  if (removed === 0) continue;
  total += removed;
  byMonth.set(month, (byMonth.get(month) ?? 0) + removed);
}

const sorted = [...byMonth.entries()].sort((a, b) => a[0].localeCompare(b[0]));
console.log("FOUNDER-REVIEW tag lines removed on main (from git patch deletions):\n");
for (const [month, count] of sorted) {
  console.log(`${month}\t${count}`);
}
console.log(`\ntotal removed:\t${total}`);

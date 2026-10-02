#!/usr/bin/env node
/**
 * Regenerate docs/founder-review-queue.md from current FOUNDER-REVIEW tags on main.
 *
 * Usage: node scripts/founder-review-generate-queue.mjs
 *        pnpm founder-review:queue
 */

import { writeFileSync } from "node:fs";
import {
  QUEUE_PATH,
  aggregateUserVisibleQueue,
  gitIntroDate,
  scanAllTags,
} from "./founder-review-lib.mjs";

const hits = scanAllTags();
const rows = aggregateUserVisibleQueue(hits);

let id = 0;
const byFile = new Map();
for (const row of rows) {
  if (!byFile.has(row.file)) byFile.set(row.file, []);
  id += 1;
  const frId = `FR-${String(id).padStart(3, "0")}`;
  byFile.get(row.file).push({ ...row, id: frId });
}

const lines = [
  "# Founder review queue",
  "",
  "One sitting approval list for **user-visible** copy still marked `FOUNDER-REVIEW` on `main`.",
  "Tick `[x]` on rows you approve, then run `pnpm founder-review:apply` (use `--dry-run` first).",
  "The apply step removes only the tag markers; it never edits the string text.",
  "",
  `Generated: ${new Date().toISOString().slice(0, 10)} · **${rows.length}** strings · **${hits.length}** total tag lines in repo`,
  "",
  "| ID | Approve | File | String |",
  "| --- | --- | --- | --- |",
];

for (const [file, fileRows] of [...byFile.entries()].sort((a, b) => {
  const pa = a[1][0]?.prominence ?? 999;
  const pb = b[1][0]?.prominence ?? 999;
  if (pa !== pb) return pa - pb;
  return a[0].localeCompare(b[0]);
})) {
  lines.push("");
  lines.push(`## ${file}`);
  lines.push("");
  for (const row of fileRows) {
    const tagMeta = row.tagLines.map((l) => `${l}`).join(", ");
    const escaped = row.display.replace(/\|/g, "\\|").replace(/\n/g, " ");
    lines.push(
      `| ${row.id} | [ ] | \`${file}:${tagMeta}\` | ${escaped} |`,
    );
  }
}

lines.push("");
lines.push("---");
lines.push("");
lines.push(
  "Internal-only tags (comments, migration notes, CSS notes) are omitted here but still appear in `pnpm founder-review:list`.",
);

writeFileSync(QUEUE_PATH, `${lines.join("\n")}\n`, "utf8");
console.log(`Wrote ${QUEUE_PATH} (${rows.length} user-visible strings)`);

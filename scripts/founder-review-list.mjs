#!/usr/bin/env node
/**
 * List every FOUNDER-REVIEW tag outside test files.
 *
 * Scans apps/, packages/, supabase/, and content/. Always exits 0.
 *
 * Usage:
 *   pnpm founder-review:list
 *   node scripts/founder-review-list.mjs
 */

import { coveredString, scanAllTags } from "./founder-review-lib.mjs";

const hits = scanAllTags();
for (const hit of hits) {
  console.log(`${hit.file}:${hit.line}\t${hit.cover}`);
}
console.log(`total: ${hits.length}`);
process.exit(0);

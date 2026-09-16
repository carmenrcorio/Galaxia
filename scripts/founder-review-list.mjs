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

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const SCAN_DIRS = ["apps", "packages", "supabase", "content"];
const SKIP_DIR_NAMES = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "coverage",
  "__tests__",
]);
const TEXT_EXT = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".md",
  ".sql",
  ".json",
  ".html",
  ".css",
]);

function isTestFile(relPath) {
  const parts = relPath.split(sep);
  if (parts.includes("__tests__") || parts.includes("test") || parts.includes("tests")) {
    return true;
  }
  const base = parts[parts.length - 1] ?? "";
  return /\.(test|spec)\.[cm]?[jt]sx?$/.test(base);
}

function walk(dir, acc) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.name.startsWith(".") && entry.name !== ".env.example") continue;
    if (SKIP_DIR_NAMES.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, acc);
      continue;
    }
    if (!entry.isFile()) continue;
    const dot = entry.name.lastIndexOf(".");
    const ext = dot >= 0 ? entry.name.slice(dot) : "";
    if (!TEXT_EXT.has(ext)) continue;
    acc.push(full);
  }
}

function coveredString(source, lineIndex) {
  const lines = source.split(/\r?\n/);
  const line = lines[lineIndex] ?? "";
  const quoteOnLine = line.match(/"([^"]{8,})"/);
  if (quoteOnLine) return quoteOnLine[1];
  const jsxText = line.match(/>([^<]{8,})</);
  if (jsxText) return jsxText[1].trim();

  for (let i = lineIndex + 1; i < Math.min(lineIndex + 6, lines.length); i++) {
    const next = lines[i] ?? "";
    if (!next.trim() || /FOUNDER-REVIEW/.test(next)) continue;
    const q = next.match(/"([^"]{8,})"/);
    if (q) return q[1];
    const jsx = next.match(/>([^<]{8,})</);
    if (jsx) return jsx[1].trim();
    const bare = next.trim();
    if (
      bare &&
      !bare.startsWith("{") &&
      !bare.startsWith("*") &&
      !bare.startsWith("//") &&
      !bare.startsWith("export ") &&
      !bare.startsWith("function ") &&
      !bare.startsWith("<") &&
      bare.length > 8
    ) {
      return bare.replace(/\s+/g, " ");
    }
  }

  const comment = line
    .replace(/.*FOUNDER-REVIEW:?\s*/, "")
    .replace(/\*\/.*/, "")
    .replace(/\s*\*\/\}?$/, "")
    .trim();
  return comment || line.trim();
}

const hits = [];

for (const dir of SCAN_DIRS) {
  const abs = join(ROOT, dir);
  try {
    statSync(abs);
  } catch {
    continue;
  }
  const files = [];
  walk(abs, files);
  for (const file of files) {
    const rel = relative(ROOT, file);
    if (isTestFile(rel)) continue;
    let source;
    try {
      source = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    if (!source.includes("FOUNDER-REVIEW")) continue;
    const lines = source.split(/\r?\n/);
    lines.forEach((line, index) => {
      if (!line.includes("FOUNDER-REVIEW")) return;
      hits.push({
        file: rel,
        line: index + 1,
        cover: coveredString(source, index),
      });
    });
  }
}

for (const hit of hits) {
  console.log(`${hit.file}:${hit.line}\t${hit.cover}`);
}
console.log(`total: ${hits.length}`);
process.exit(0);

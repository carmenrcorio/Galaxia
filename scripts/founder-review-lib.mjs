#!/usr/bin/env node
/**
 * Shared scan + classification for FOUNDER-REVIEW tooling.
 */

import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
export const SCAN_DIRS = ["apps", "packages", "supabase", "content"];
export const QUEUE_PATH = join(ROOT, "docs/founder-review-queue.md");

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

export function isTestFile(relPath) {
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

export function coveredString(source, lineIndex) {
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

/** User-facing copy tied to this tag line (may differ from list-only cover heuristic). */
export function resolveDisplayString(source, lineIndex) {
  const lines = source.split(/\r?\n/);
  const line = lines[lineIndex] ?? "";

  const quotedInTag =
    line.match(/FOUNDER-REVIEW:[^"']*"([^"]+)"/) ??
    line.match(/FOUNDER-REVIEW:[^"']*'([^']+)'/);
  if (quotedInTag?.[1] && quotedInTag[1].length >= 2) return quotedInTag[1];

  for (let i = lineIndex; i <= Math.min(lineIndex + 10, lines.length - 1); i++) {
    const row = lines[i] ?? "";
    if (i > lineIndex && /FOUNDER-REVIEW/.test(row)) break;
    if (!/className=|style=\{\{|href=/.test(row)) {
      const exportStr = row.match(/^(?:export\s+)?(?:const|let)\s+\w+\s*=\s*"([^"]+)"/);
      if (exportStr) return exportStr[1];
      const assignStr = row.match(/=\s*"([^"]{12,})"/);
      if (assignStr) return assignStr[1];
    }
    const template = row.match(/=\s*`([^`]+)`/);
    if (template && template[1].length >= 8 && !template[1].includes("${")) return template[1];
    const jsxInner = row.match(/>\s*([^<{]+?)\s*<\//);
    if (jsxInner && jsxInner[1].trim().length >= 2) return jsxInner[1].trim();
    const plainJsx = row.match(/^\s{2,}([A-Za-z0-9"'][^<{]*[A-Za-z0-9.?!'"…])\s*$/);
    if (plainJsx && plainJsx[1].trim().length >= 8) return plainJsx[1].trim();
    const setError = row.match(/setError\(\s*"([^"]+)"/);
    if (setError) return setError[1];
    const fallback = row.match(/\?\?\s*"([^"]+)"/);
    if (fallback) return fallback[1];
    const title = row.match(/title:\s*"([^"]+)"/);
    if (title) return title[1];
    const label = row.match(/label:\s*"([^"]+)"/);
    if (label) return label[1];
    const placeholder = row.match(/placeholder=\{\s*"([^"]+)"/) ?? row.match(/placeholder="([^"]+)"/);
    if (placeholder) return placeholder[1];
  }

  return coveredString(source, lineIndex);
}

function looksLikeCodeFragment(text) {
  const t = text.trim();
  if (!t) return true;
  if (/^[\w.-]+:\s*[\[{"]/.test(t)) return true;
  if (/^(const |export |import |return |update public|insert into|\.[\w-]+|\? `)/.test(t)) return true;
  if (/^(flow:|friction:|fusion:)/.test(t)) return true;
  if (/^(id:|label:|title:|north_node:)/.test(t)) return true;
  if (/^\/[\w-]+/.test(t) && !t.includes(" ")) return true;
  if (/^(element-significance|metal-significance|birthstone-significance|sign-metadata-card__)/.test(t))
    return true;
  if (t === "RETROGRADE_BADGE_ARIA_LABEL," || t === "@galaxia/core" || t === "../bodies") return true;
  if (t.includes("var(--") || t.includes("style={{") || t.includes("glyph-sq-wrap")) return true;
  if (/^(muted|sr-only|pill-link|glass-card|fade-in)(\s|$|--)/.test(t)) return true;
  if (
    /^[a-z0-9-]+(?:\s+[a-z0-9-]+){0,4}$/.test(t) &&
    !/[.?!']/.test(t) &&
    t.includes("-") &&
    t.length < 48
  ) {
    return true;
  }
  if (/^[\w-]+:\s*"[\w-]+"/.test(t)) return true;
  if (/^[\w]+:\s*\{/.test(t)) return true;
  if (t === "const COMPARE_FREE: BlogClosingCta = {" || t === "const shapes = [") return true;
  if (t === "Actually" && t.length < 12) return true;
  if (/^--\s/.test(t)) return true;
  if (/^## Title/.test(t)) return true;
  return false;
}

function isMigrationMetaComment(line, file) {
  if (!file.endsWith(".sql")) return false;
  const t = line.trim();
  if (!t.startsWith("--")) return false;
  if (!/FOUNDER-REVIEW/.test(t)) return false;
  return (
    /rewritten|Applied migrations|never edited|Front-matter|links from existing|was written before/i.test(
      t,
    ) || /^-- FOUNDER-REVIEW:\s*$/.test(t)
  );
}

/** @returns {'user-visible' | 'internal'} */
export function classifyVisibility(hit, source) {
  const { file, line: lineNum } = hit;
  const lines = source.split(/\r?\n/);
  const line = lines[lineNum - 1] ?? "";
  const trimmed = line.trim();

  if (isMigrationMetaComment(trimmed, file)) return "internal";

  if (file.endsWith(".css") && trimmed.startsWith("/*") && /FOUNDER-REVIEW/.test(trimmed)) {
    return "internal";
  }

  if (
    trimmed.startsWith("/**") ||
    (trimmed.startsWith("*") && /FOUNDER-REVIEW/.test(trimmed) && !/"[^"]{8,}"/.test(trimmed))
  ) {
    return "internal";
  }

  if (/^\s*\{\/\*\s*FOUNDER-REVIEW:/.test(line) && !/"[^"]{4,}"/.test(line)) {
    const desc = trimmed.replace(/^.*FOUNDER-REVIEW:\s*/, "").replace(/\*\/\}\s*$/, "");
    if (/bridge|promise line|glyph|position|section heading|label\.|checkbox/i.test(desc)) {
      const display = resolveDisplayString(source, lineNum - 1);
      if (looksLikeCodeFragment(display)) return "internal";
    }
  }

  if (file.endsWith(".sql")) {
    const display = resolveDisplayString(source, lineNum - 1);
    if (display.length >= 12 && !looksLikeCodeFragment(display)) return "user-visible";
    if (/^\s*'[^']+'\s*,?\s*$/.test(trimmed.replace(/--.*FOUNDER-REVIEW[^']*'([^']+)'.*$/, "'$1'"))) {
      return "user-visible";
    }
    const slug = trimmed.match(/'([a-z0-9-]{8,})'/);
    if (slug && /FOUNDER-REVIEW/.test(trimmed)) return "user-visible";
    if (/FOUNDER-REVIEW/.test(trimmed) && /Transits|Synastry|Signs & Planets/.test(trimmed))
      return "user-visible";
    return "internal";
  }

  const display = resolveDisplayString(source, lineNum - 1);
  if (looksLikeCodeFragment(display)) return "internal";

  if (display.length >= 2 && !looksLikeCodeFragment(display)) return "user-visible";

  return "internal";
}

export function scanAllTags() {
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
        const lineNo = index + 1;
        hits.push({
          file: rel,
          line: lineNo,
          cover: coveredString(source, index),
          display: resolveDisplayString(source, index),
          visibility: classifyVisibility(
            { file: rel, line: lineNo, cover: coveredString(source, index) },
            source,
          ),
          source,
        });
      });
    }
  }
  return hits;
}

/** Lower rank = more prominent product surface. */
export function fileProminenceRank(file) {
  const rules = [
    [/^apps\/web\/app\/(page\.tsx|login|welcome|pricing)/, 10],
    [/^apps\/web\/components\/login-form/, 15],
    [/^apps\/web\/app\/chart/, 20],
    [/^apps\/web\/components\/(chart-lead|chart-sharpen|marketing\/quick-chart)/, 25],
    [/^apps\/web\/lib\/(chart-lead|chart-reading|birth-form)/, 30],
    [/^apps\/web\/app\/app\//, 40],
    [/^apps\/web\/components\/(chart-wheel|flip-sign|element-balance|sign-metadata)/, 45],
    [/^apps\/web\/lib\/emails/, 50],
    [/^apps\/web\/(lib\/blog|components\/blog|app\/\[slug\])/, 55],
    [/^apps\/web\/lib\/(method|blog-index|blog-cta)/, 60],
    [/^apps\/mobile\/app\/(index|login|\(app\))/, 70],
    [/^apps\/mobile\//, 75],
    [/^packages\/core\//, 85],
    [/^packages\/astro\//, 90],
    [/^content\/store/, 95],
    [/^supabase\/migrations/, 100],
  ];
  for (const [re, rank] of rules) {
    if (re.test(file)) return rank;
  }
  return 80;
}

export function gitIntroDate(file, line) {
  try {
    const out = execFileSync(
      "git",
      ["blame", "-L", `${line},${line}`, "--format=%ai", "--", file],
      { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    );
    const m = out.match(/^(\d{4}-\d{2}-\d{2})/m);
    return m?.[1] ?? "unknown";
  } catch {
    return "unknown";
  }
}

export function tagsOnMainOnlySet() {
  try {
    const out = execFileSync("git", ["grep", "-n", "FOUNDER-REVIEW", "main", "--", ...SCAN_DIRS], {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return new Set(
      out
        .trim()
        .split("\n")
        .filter(Boolean)
        .map((row) => {
          const after = row.replace(/^main:/, "");
          const idx = after.indexOf(":");
          const file = after.slice(0, idx);
          const rest = after.slice(idx + 1);
          const line = rest.split(":")[0];
          return `${file}:${line}`;
        }),
    );
  } catch {
    return new Set();
  }
}

export function branchOnlyTagKeys(currentHits) {
  const onMain = tagsOnMainOnlySet();
  const branchOnly = [];
  let remoteBranches = [];
  try {
    remoteBranches = execFileSync("git", ["branch", "-r", "--format=%(refname:short)"], {
      cwd: ROOT,
      encoding: "utf8",
    })
      .trim()
      .split("\n")
      .filter((b) => b && b !== "origin/HEAD" && !b.endsWith("/main") && !b.endsWith("/master"));
  } catch {
    return branchOnly;
  }

  const mainKeys = new Set(currentHits.map((h) => `${h.file}:${h.line}`));
  for (const branch of remoteBranches.slice(0, 40)) {
    try {
      const out = execFileSync(
        "git",
        ["grep", "-n", "FOUNDER-REVIEW", branch, "--", ...SCAN_DIRS],
        { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
      );
      for (const row of out.trim().split("\n").filter(Boolean)) {
        const after = row.replace(/^[^:]+:/, "");
        const idx = after.indexOf(":");
        const file = after.slice(0, idx);
        const line = after.split(":")[0];
        const key = `${file}:${line}`;
        if (!onMain.has(key) && !mainKeys.has(key)) {
          branchOnly.push({ key, branch });
        }
      }
    } catch {
      // no matches on branch
    }
  }
  return branchOnly;
}

export function aggregateUserVisibleQueue(hits) {
  /** @type {Map<string, { file: string, display: string, tagLines: number[], prominence: number }>} */
  const map = new Map();
  for (const hit of hits) {
    if (hit.visibility !== "user-visible") continue;
    const display = hit.display.trim();
    const key = `${hit.file}\0${display}`;
    const existing = map.get(key);
    if (existing) {
      existing.tagLines.push(hit.line);
    } else {
      map.set(key, {
        file: hit.file,
        display,
        tagLines: [hit.line],
        prominence: fileProminenceRank(hit.file),
      });
    }
  }
  const rows = [...map.values()].map((row) => ({
    ...row,
    tagLines: [...new Set(row.tagLines)].sort((a, b) => a - b),
  }));
  rows.sort((a, b) => {
    if (a.prominence !== b.prominence) return a.prominence - b.prominence;
    if (a.file !== b.file) return a.file.localeCompare(b.file);
    return a.display.localeCompare(b.display);
  });
  return rows;
}

export function stripFounderReviewFromLine(line) {
  if (/^\s*\/\/\s*FOUNDER-REVIEW/.test(line)) {
    return null;
  }
  if (/^\s*\/\*\s*FOUNDER-REVIEW/.test(line) && /\*\/\s*$/.test(line.trim())) {
    return null;
  }
  const jsxOnly = line.match(/^(\s*)\{\/\*\s*FOUNDER-REVIEW:[\s\S]*?\*\/\}\s*$/);
  if (jsxOnly) return null;
  if (line.includes("FOUNDER-REVIEW")) {
    return line
      .replace(/\s*\{\/\*\s*FOUNDER-REVIEW:[^*]*\*\/\}\s*/g, "")
      .replace(/\s*\/\/\s*FOUNDER-REVIEW[^\n]*/g, "")
      .replace(/FOUNDER-REVIEW:?\s*/g, "");
  }
  return line;
}

export function parseQueueRows(markdown) {
  /** @type {{ id: string, file: string, tagLines: number[], display: string, approved: boolean }[]} */
  const rows = [];
  for (const line of markdown.split(/\r?\n/)) {
    if (!line.startsWith("| FR-")) continue;
    const cols = line.split("|").map((c) => c.trim());
    if (cols.length < 5) continue;
    const id = cols[1];
    const approve = cols[2];
    const loc = cols[3].replace(/^`|`$/g, "");
    const display = cols[4];
    const fileMatch = loc.match(/^([^:]+):([\d,\s]+)$/);
    if (!fileMatch) continue;
    const file = fileMatch[1];
    const tagLines = fileMatch[2]
      .split(",")
      .map((n) => parseInt(n.trim(), 10))
      .filter(Boolean);
    rows.push({
      id,
      file,
      tagLines,
      display,
      approved: /^\[x\]$/i.test(approve),
    });
  }
  return rows;
}

export function applyTagRemoval(source, tagLines) {
  const lines = source.split(/\r?\n/);
  const toRemove = new Set(tagLines);
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const lineNo = i + 1;
    if (!toRemove.has(lineNo)) {
      out.push(lines[i]);
      continue;
    }
    const stripped = stripFounderReviewFromLine(lines[i]);
    if (stripped !== null && stripped.trim() !== "") {
      out.push(stripped);
    }
  }
  return out.join("\n");
}

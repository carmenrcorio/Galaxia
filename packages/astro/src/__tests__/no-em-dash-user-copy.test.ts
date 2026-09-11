/**
 * PERMANENT GATE: U+2014 (em dash) must not appear in authored user-visible copy.
 *
 * Scope matches ENGINEERING.md §15: string literals and JSX in apps/, packages/,
 * and supabase/functions/. Comments, tests, fixtures, docs, and changelogs
 * are exempt. The compare-only scanner in no-em-dash-in-compare-copy.test.ts
 * stays; this gate is the broader copy check.
 */
import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "../../../..");
const EM_DASH = "\u2014";

const SCAN_ROOTS = ["apps", "packages", "supabase/functions"];
const EXTENSIONS = new Set([".ts", ".tsx", ".js", ".mjs", ".jsx"]);
const SKIP_DIR_NAMES = new Set([
  "node_modules",
  ".next",
  "dist",
  "coverage",
  "__tests__",
  "test",
]);

export function stripComments(src: string): string {
  let out = "";
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i]!;
    if (c === "/" && src[i + 1] === "/") {
      while (i < n && src[i] !== "\n") i += 1;
      continue;
    }
    if (c === "/" && src[i + 1] === "*") {
      i += 2;
      while (i + 1 < n && !(src[i] === "*" && src[i + 1] === "/")) {
        if (src[i] === "\n") out += "\n";
        i += 1;
      }
      i += 2;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      const q = c;
      out += c;
      i += 1;
      while (i < n) {
        out += src[i];
        if (src[i] === "\\" && i + 1 < n) {
          out += src[i + 1];
          i += 2;
          continue;
        }
        if (src[i] === q) {
          i += 1;
          break;
        }
        i += 1;
      }
      continue;
    }
    out += c;
    i += 1;
  }
  return out;
}

function isCommentLine(original: string): boolean {
  const t = original.trim();
  return (
    t.startsWith("//") ||
    t.startsWith("*") ||
    t.startsWith("/*") ||
    t.startsWith("{/*")
  );
}

function isTestOrFixturePath(rel: string): boolean {
  const base = path.basename(rel);
  if (base.includes(".test.") || base.includes(".spec.")) return true;
  if (rel.includes("/__tests__/") || rel.includes("/test/")) return true;
  if (rel.includes("/fixtures/")) return true;
  return false;
}

export function emDashHitsInSource(src: string): { line: number; excerpt: string }[] {
  const originalLines = src.split("\n");
  const stripped = stripComments(src);
  const hits: { line: number; excerpt: string }[] = [];
  stripped.split("\n").forEach((line, idx) => {
    if (!line.includes(EM_DASH)) return;
    const original = originalLines[idx] ?? "";
    if (isCommentLine(original)) return;
    hits.push({ line: idx + 1, excerpt: line.trim().slice(0, 160) });
  });
  return hits;
}

export function walkUserCopyFiles(repoRoot: string): string[] {
  const files: string[] = [];
  for (const root of SCAN_ROOTS) {
    const absRoot = path.join(repoRoot, root);
    if (!fs.existsSync(absRoot)) continue;
    const stack = [absRoot];
    while (stack.length) {
      const dir = stack.pop()!;
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const abs = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (SKIP_DIR_NAMES.has(entry.name)) continue;
          stack.push(abs);
          continue;
        }
        const ext = path.extname(entry.name);
        if (!EXTENSIONS.has(ext)) continue;
        const rel = path.relative(repoRoot, abs).split(path.sep).join("/");
        if (isTestOrFixturePath(rel)) continue;
        files.push(rel);
      }
    }
  }
  return files.sort();
}

describe("no U+2014 in authored user-visible copy", () => {
  it("fails on a planted em dash in a string literal", () => {
    const planted = path.join(__dirname, "fixtures/em-dash/planted-em-dash.ts");
    const hits = emDashHitsInSource(fs.readFileSync(planted, "utf8"));
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.some((h) => h.excerpt.includes(EM_DASH))).toBe(true);
  });

  it("passes on a clean file (colon, comma, parentheses only)", () => {
    const clean = path.join(__dirname, "fixtures/em-dash/clean-copy.ts");
    expect(emDashHitsInSource(fs.readFileSync(clean, "utf8"))).toEqual([]);
  });

  it("exempts comments that still use an em dash", () => {
    const commented = path.join(__dirname, "fixtures/em-dash/comment-exempt.ts");
    expect(emDashHitsInSource(fs.readFileSync(commented, "utf8"))).toEqual([]);
  });

  it("fails on any remaining user-visible em dash under apps/, packages/, supabase/functions/", () => {
    const hits: string[] = [];
    for (const rel of walkUserCopyFiles(REPO_ROOT)) {
      const abs = path.join(REPO_ROOT, rel);
      for (const h of emDashHitsInSource(fs.readFileSync(abs, "utf8"))) {
        hits.push(`${rel}:${h.line}: ${h.excerpt}`);
      }
    }
    expect(hits, hits.join("\n")).toEqual([]);
  });
});

describe("posts em-dash rewrite migration", () => {
  it("payloads contain no U+2014", () => {
    const mig = path.join(
      REPO_ROOT,
      "supabase/migrations/20260911161000_posts_rewrite_em_dash.sql",
    );
    expect(fs.existsSync(mig), mig).toBe(true);
    const sql = fs.readFileSync(mig, "utf8");
    const payloads = [...sql.matchAll(/\$POST_(?:DEK|BODY)\$(.*?)\$POST_(?:DEK|BODY)\$/gs)].map(
      (m) => m[1]!,
    );
    expect(payloads.length).toBeGreaterThanOrEqual(5);
    const dirty = payloads.filter((p) => p.includes(EM_DASH));
    expect(dirty, `${dirty.length} payloads still contain U+2014`).toEqual([]);
  });
});

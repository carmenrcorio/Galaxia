import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..", "..", "..");
const INSERT_RE = /\.from\(\s*["']people["']\s*\)[\s\S]{0,400}?\.insert\s*\(/g;

const SKIP_DIR = new Set([
  "node_modules",
  "dist",
  ".next",
  ".git",
  "coverage",
  ".turbo"
]);

function walk(dir: string, files: string[]): void {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIR.has(name)) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      walk(full, files);
      continue;
    }
    if (!/\.(ts|tsx|js|jsx)$/.test(name)) continue;
    // Live tests and unit tests may seed rows; production code may not.
    if (/\.test\.(ts|tsx)$/.test(name)) continue;
    files.push(full);
  }
}

describe("exactly one people insert", () => {
  it("production TypeScript has a single from(\"people\").insert, in createPerson", () => {
    const files: string[] = [];
    walk(ROOT, files);
    const hits: string[] = [];
    for (const file of files) {
      const src = readFileSync(file, "utf8");
      if (!INSERT_RE.test(src) && !src.includes('.from("people")')) continue;
      INSERT_RE.lastIndex = 0;
      if (INSERT_RE.test(src)) {
        hits.push(file.slice(ROOT.length + 1));
      }
      INSERT_RE.lastIndex = 0;
    }
    expect(hits).toEqual(["packages/core/src/create-person.ts"]);
  });
});

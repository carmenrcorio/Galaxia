/**
 * PERMANENT GATE: U+2014 (em dash) must not appear in authored Compare copy.
 * It shipped on three surfaces (readings, tactics/guidance, compare UI).
 * Comments may still use it; this scanner strips comments, then fails on any
 * remaining U+2014 in string literals or JSX text.
 */
import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "../../../..");
const EM_DASH = "\u2014";

const COMPARE_COPY_FILES = [
  "packages/astro/src/compare-guidance.ts",
  "packages/astro/src/synastry-interpretations.ts",
  "apps/web/components/flows-and-catches-section.tsx",
  "apps/web/components/quick-check-modal.tsx",
  "apps/web/app/app/compare/page.tsx",
  "apps/web/app/chart/compare/page.tsx",
  "apps/web/app/chart/compare/layout.tsx",
  "apps/mobile/app/(app)/compare.tsx",
];

/** Strip // and /* * / comments without touching string or template contents. */
function stripComments(src: string): string {
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

describe("no U+2014 in authored Compare copy", () => {
  it("fails on any em dash left in string literals or JSX of the compare surfaces", () => {
    const hits: string[] = [];
    for (const rel of COMPARE_COPY_FILES) {
      const abs = path.join(REPO_ROOT, rel);
      expect(fs.existsSync(abs), rel).toBe(true);
      const stripped = stripComments(fs.readFileSync(abs, "utf8"));
      stripped.split("\n").forEach((line, idx) => {
        if (line.includes(EM_DASH)) hits.push(`${rel}:${idx + 1}: ${line.trim().slice(0, 140)}`);
      });
    }
    expect(hits, hits.join("\n")).toEqual([]);
  });
});

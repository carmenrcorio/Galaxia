/**
 * Drift guard for EXPORT_COLOR_LITERALS (see lib/design.ts doc comment).
 * These values are copied by hand from globals.css `:root` because an
 * html-to-image raster capture of an <svg> subtree never resolves var()
 * against the live stylesheet. If a `:root` token changes, this test fails
 * until EXPORT_COLOR_LITERALS is updated to match.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { EXPORT_COLOR_LITERALS } from "./design";

function rootTokens(): Record<string, string> {
  const css = readFileSync(resolve(__dirname, "../app/globals.css"), "utf8");
  const rootBlock = css.match(/:root\s*{([^}]*)}/);
  if (!rootBlock) throw new Error("design.test.ts: no :root block found in globals.css");
  const tokens: Record<string, string> = {};
  const re = /--([a-z0-9-]+):\s*(#[0-9a-fA-F]{3,8})\s*;/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(rootBlock[1]!)) !== null) {
    tokens[match[1]!] = match[2]!.toLowerCase();
  }
  return tokens;
}

describe("EXPORT_COLOR_LITERALS drift guard", () => {
  const tokens = rootTokens();

  it("every literal matches its globals.css :root token exactly", () => {
    for (const [name, literal] of Object.entries(EXPORT_COLOR_LITERALS)) {
      expect(tokens[name], `--${name} missing from globals.css :root`).toBeDefined();
      expect(literal.toLowerCase()).toBe(tokens[name]);
    }
  });

  it("covers every colour token ChartWheel swaps under exportSafe", () => {
    const used = ["gold", "rose", "teal", "mist", "mist2", "cream", "fire", "earth", "air", "water"];
    for (const name of used) {
      expect(EXPORT_COLOR_LITERALS[name]).toBeDefined();
    }
  });
});

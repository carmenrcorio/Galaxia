import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";
import { EXPORT_COLOR_LITERALS } from "./design";

describe("EXPORT_COLOR_LITERALS drift guard", () => {
  const css = readFileSync(resolve(__dirname, "../app/globals.css"), "utf8");
  const rootBlock = css.match(/:root\s*\{([\s\S]*?)\}/)?.[1] ?? "";

  it("matches globals.css :root exactly for every token it swaps", () => {
    for (const [name, literal] of Object.entries(EXPORT_COLOR_LITERALS)) {
      const declared = rootBlock.match(new RegExp(`--${name}:\\s*([^;]+);`))?.[1]?.trim();
      expect(declared, `--${name} should be declared in globals.css :root`).toBeTruthy();
      expect(literal.toLowerCase()).toBe(declared!.toLowerCase());
    }
  });

  it("covers every colour token ChartWheel swaps under exportSafe", () => {
    const swapped = ["gold", "cream", "mist2", "teal", "rose", "mist", "fire", "earth", "air", "water"];
    for (const name of swapped) {
      expect(EXPORT_COLOR_LITERALS[name], `EXPORT_COLOR_LITERALS is missing ${name}`).toBeTruthy();
    }
  });
});

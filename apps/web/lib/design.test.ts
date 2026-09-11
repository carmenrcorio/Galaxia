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

function srgbChannel(value: number): number {
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex: string): number {
  const n = hex.replace("#", "");
  const r = srgbChannel(parseInt(n.slice(0, 2), 16) / 255);
  const g = srgbChannel(parseInt(n.slice(2, 4), 16) / 255);
  const b = srgbChannel(parseInt(n.slice(4, 6), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(a: string, b: string): number {
  const L1 = relativeLuminance(a);
  const L2 = relativeLuminance(b);
  const [hi, lo] = L1 > L2 ? [L1, L2] : [L2, L1];
  return (hi + 0.05) / (lo + 0.05);
}

describe("mist2 body-text contrast on ink2", () => {
  const css = readFileSync(resolve(__dirname, "../app/globals.css"), "utf8");
  const rootBlock = css.match(/:root\s*\{([\s\S]*?)\}/)?.[1] ?? "";
  const token = (name: string) => rootBlock.match(new RegExp(`--${name}:\\s*([^;]+);`))?.[1]?.trim();

  it("keeps global --mist2 for the footer-on-ink pair (4.79)", () => {
    expect(token("mist2")?.toLowerCase()).toBe("#8076a6");
    expect(contrastRatio("#8076a6", "#0a0717")).toBeGreaterThanOrEqual(4.5);
  });

  it("uses a dedicated --mist2-on-ink2 that clears 4.5:1 on --ink2", () => {
    const body = token("mist2-on-ink2");
    const ink2 = token("ink2");
    expect(body?.toLowerCase()).toBe("#8278a7");
    expect(ink2?.toLowerCase()).toBe("#16102e");
    expect(contrastRatio(body!, ink2!)).toBeGreaterThanOrEqual(4.5);
  });

  it("applies --mist2-on-ink2 to .pl-desc body copy", () => {
    expect(css).toMatch(/\.pl-desc\s*\{[^}]*color:\s*var\(--mist2-on-ink2\)/);
  });
});

describe(".sign-chip__label size", () => {
  it("is above 12px (0.8125rem at a 16px root)", () => {
    const css = readFileSync(resolve(__dirname, "../app/globals.css"), "utf8");
    const match = css.match(/\.sign-chip__label\s*\{[^}]*font-size:\s*([^;]+);/);
    expect(match?.[1]?.trim()).toBe("0.8125rem");
  });
});

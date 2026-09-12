import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const home = readFileSync(resolve(__dirname, "../app/app/page.tsx"), "utf8");

describe("source wiring — galaxy share captures this account's settled sky", () => {
  it("shows Share sky image as soon as people have loaded, not after entranceSettled", () => {
    expect(home).toContain('label="Share sky image"');
    expect(home).toMatch(/!loading && people\.length > 0 \? \(\s*[\s\S]*ChartImageExportButton/);
    expect(home).not.toMatch(/entranceSettled\s*&&/);
    expect(home).not.toMatch(/\{entranceSettled\s*&&/);
    expect(home).not.toContain("setEntranceSettled");
  });

  it("redraws the loaded people/links onto offscreen canvases, never a fixture", () => {
    expect(home).toContain("galaxyCaptureRef");
    expect(home).toContain("exportSettled: true");
    expect(home).toContain("lowPerf = false");
    expect(home).toContain("willReadFrequently");
    expect(home).toContain("composeGalaxySharePng(atmOff, motionOff");
    expect(home).not.toContain("paintConstellationFixture");
    expect(home).not.toContain("composeGalaxySharePng(atmCanvas");
    expect(home).not.toContain("composeGalaxySharePng(atmCanvasRef");
  });
});

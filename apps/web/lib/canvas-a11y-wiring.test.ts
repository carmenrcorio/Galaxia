import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = join(__dirname, "..", "..", "..");

describe("decorative canvases are hidden from assistive tech", () => {
  it("CosmicBackground canvas is aria-hidden", () => {
    const src = readFileSync(join(REPO_ROOT, "apps/web/components/cosmic-background.tsx"), "utf8");
    expect(src).toMatch(/<canvas ref=\{starsRef\} aria-hidden="true"/);
  });

  it("HeroGraph canvas is aria-hidden", () => {
    const src = readFileSync(join(REPO_ROOT, "apps/web/components/marketing/hero-graph.tsx"), "utf8");
    expect(src).toMatch(/<canvas ref=\{canvasRef\}[^>]*aria-hidden="true"/);
  });
});

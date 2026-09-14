import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = join(__dirname, "..", "..", "..");
const home = readFileSync(join(REPO_ROOT, "apps/web/app/app/page.tsx"), "utf8");
const coreGeom = readFileSync(join(REPO_ROOT, "packages/core/src/galaxy-seat.ts"), "utf8");
const coreVisual = readFileSync(join(REPO_ROOT, "packages/core/src/galaxy-visual.ts"), "utf8");
const editPanel = readFileSync(join(REPO_ROOT, "apps/web/components/edit-person-panel.tsx"), "utf8");
const mobileHome = readFileSync(join(REPO_ROOT, "apps/mobile/app/(app)/home.tsx"), "utf8");
const migration = readFileSync(
  join(REPO_ROOT, "supabase/migrations/20260914270000_people_star_scale_and_free_seat.sql"),
  "utf8",
);

describe("galaxy geometry / glyph scale / free placement wiring", () => {
  it("keeps galaxyGeometry as the only geometry source in web and mobile", () => {
    expect(coreGeom).toContain("export function galaxyGeometry");
    expect(home).toContain("galaxyGeometry");
    expect(home).not.toContain("function constellationRad");
    expect(mobileHome).toContain("galaxyGeometry");
    expect(mobileHome).not.toMatch(/radX:\s*120/);
  });

  it("inverts the ellipse in pointerToCustomPosition, not radX alone", () => {
    expect(coreGeom).toContain("dx / (geom.radX || 1)");
    expect(coreGeom).toContain("dy / (geom.radY || 1)");
    expect(coreGeom).not.toMatch(/Math\.hypot\(dx, dy\) \/ maxR/);
  });

  it("does not cap live radius_pct at 1", () => {
    expect(coreGeom).toContain("CUSTOM_RADIUS_SANITY_MAX = 2.5");
    expect(coreGeom).toContain("export function maxSeatRadius");
    expect(home).toContain("clampSeatRn");
    expect(migration).toContain("<= 2.5");
    expect(migration).toContain("add column if not exists star_scale");
    expect(migration).toContain("people_star_scale_range");
  });

  it("exports named glyph bases and equal binary/self cores", () => {
    expect(coreVisual).toContain("export const GLYPH_BASE_PX = 34");
    expect(coreVisual).toContain("export const GLYPH_BASE_PX_LITE = 26");
    expect(coreVisual).toContain("binary: 7");
    expect(coreVisual).toContain("self: 7");
    expect(home).toContain("glyphRadiusPx");
    expect(home).toContain("starCoreRadius");
    expect(home).not.toContain("lowPerf ? 18 : 21");
  });

  it("applies star_scale in the editor beside star_color", () => {
    expect(editPanel).toContain("Star color");
    expect(editPanel).toContain("Star size");
    expect(editPanel).toContain("star_scale: normalizeStarScale(starScale)");
    expect(editPanel).toContain("Reset position");
    expect(home).toContain("star_scale");
    expect(mobileHome).toContain("star_scale");
  });

  it("uses grabbing cursor while dragging", () => {
    expect(home).toContain('canvas.style.cursor = "grabbing"');
    expect(home).not.toContain('hit.is_self ? "pointer" : "grab"');
  });

  it("does not retune label font, offset, or collision solver", () => {
    expect(home).toContain("11px Inter, sans-serif");
    expect(coreGeom).toContain("GALAXY_LABEL_JOIN_PX = 36");
    expect(coreGeom).toContain("passes = opts?.passes ?? 6");
  });

  it("does not change ring fractions or GALAXY_GUIDE_RINGS", () => {
    expect(coreGeom).toContain("export const GALAXY_GUIDE_RINGS = [2, 3, 4, 5]");
    expect(coreGeom).toContain("2: 0.58");
    expect(coreGeom).toContain("5: 0.93");
  });
});

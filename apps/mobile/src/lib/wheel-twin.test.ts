import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const mobileRoot = resolve(__dirname, "../..");

function readMobile(rel: string): string {
  return readFileSync(resolve(mobileRoot, rel), "utf8");
}

describe("Phase 3 wheel twin: shared geometry, natal SVG, compare bi-wheel", () => {
  it("pins react-native-svg and loads ZodiacGlyphs for sign/planet codepoints", () => {
    const pkg = JSON.parse(readFileSync(resolve(mobileRoot, "package.json"), "utf8")) as {
      dependencies: Record<string, string>;
    };
    expect(pkg.dependencies["react-native-svg"]).toBeTruthy();
    expect(existsSync(resolve(mobileRoot, "assets/fonts/ZodiacGlyphs-Regular.ttf"))).toBe(true);
    const wheel = readMobile("src/components/chart-wheel.tsx");
    expect(wheel).toContain('from "react-native-svg"');
    expect(wheel).toContain("layoutChartWheel");
    expect(wheel).toContain("fonts.zodiac");
    expect(wheel).not.toContain("computeSynastry");
  });

  it("person profile paints the natal wheel with houseSystem label and geometry aspects", () => {
    const src = readMobile("app/(app)/profile/[personId].tsx");
    expect(src).toContain("ChartWheel");
    expect(src).toContain("houseSystemLabelForChart");
    expect(src).toContain("selectNatalAspectGeometry");
    expect(src).toContain("Natal wheel");
    expect(src).toContain('select("data, house_system, engine_version")');
    expect(src).not.toContain("elementForSign");
    expect(src).not.toContain("Sign strip");
  });

  it("Compare orients self as inner A and gates the bi-wheel on houses", () => {
    const src = readMobile("app/(app)/(tabs)/compare.tsx");
    expect(src).toContain("orientSynastryWheel");
    expect(src).toContain("overlayChart={wheel.overlayChart}");
    expect(src).toContain("COMPARE_WHEEL_NEEDS_HOUSES");
    expect(src).toContain("chartA: natalA");
    expect(src).toContain("wheel.chart.cusps");
  });
});

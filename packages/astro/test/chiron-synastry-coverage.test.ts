import { describe, expect, it } from "vitest";
import {
  CHIRON_SYNASTRY_PARTNERS,
  chironSynastryCoverage,
  interpretationLibraryCoverageSummary,
} from "../src/reading-coverage";

describe("chironSynastryCoverage", () => {
  it("defines 11 partners x 5 majors = 55 cells", () => {
    expect(CHIRON_SYNASTRY_PARTNERS).toHaveLength(11);
    const coverage = chironSynastryCoverage();
    expect(coverage.possible).toBe(55);
    expect(coverage.authored + coverage.unauthored.length).toBe(55);
    expect(coverage.unauthored.every((k) => k.startsWith("chiron-") || k.includes("-chiron:"))).toBe(true);
  });

  it("summary matches live tables (Batch 01 target still in review until applied)", () => {
    const summary = interpretationLibraryCoverageSummary();
    expect(summary.chironSynastry.possible).toBe(55);
    expect(summary.natalAspect.possible).toBe(270);
    expect(summary.synastryTable.authored + summary.synastryTable.unauthored.length).toBe(
      summary.synastryTable.possible
    );
  });
});

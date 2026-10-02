import { describe, expect, it } from "vitest";
import { ASPECT_NATURE } from "../src/interpretations";
import { interpretSynastryAspect } from "../src/synastry-interpretations";
import {
  CHIRON_SYNASTRY_PARTNERS,
  chironSynastryCoverage,
  interpretationLibraryCoverageSummary,
} from "../src/reading-coverage";

const CHIRON_MAJORS = ["conjunction", "sextile", "square", "trine", "opposition"] as const;

describe("chironSynastryCoverage", () => {
  it("defines 11 partners x 5 majors = 55 cells", () => {
    expect(CHIRON_SYNASTRY_PARTNERS).toHaveLength(11);
    const coverage = chironSynastryCoverage();
    expect(coverage.possible).toBe(55);
    expect(coverage.authored).toBe(55);
    expect(coverage.unauthored).toHaveLength(0);
    expect(coverage.authored + coverage.unauthored.length).toBe(55);
  });

  it("never falls back to ASPECT_NATURE for authored Chiron synastry cells", () => {
    for (const body of CHIRON_SYNASTRY_PARTNERS) {
      for (const aspect of CHIRON_MAJORS) {
        const reading = interpretSynastryAspect("chiron", body, aspect);
        expect(reading.short).not.toBe(ASPECT_NATURE[aspect].short);
        expect(reading.long).not.toBe(ASPECT_NATURE[aspect].long);
        const flipped = interpretSynastryAspect(body, "chiron", aspect);
        expect(flipped.short).toBe(reading.short);
      }
    }
  });

  it("summary matches live tables", () => {
    const summary = interpretationLibraryCoverageSummary();
    expect(summary.chironSynastry.possible).toBe(55);
    expect(summary.chironSynastry.authored).toBe(55);
    expect(summary.chironSynastry.unauthored).toHaveLength(0);
    expect(summary.natalAspect.possible).toBe(270);
    expect(summary.synastryTable.authored + summary.synastryTable.unauthored.length).toBe(
      summary.synastryTable.possible
    );
  });
});

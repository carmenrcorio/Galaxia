import { describe, expect, it } from "vitest";
import { computeNatalChart, computeSynastry } from "../src/index";

/**
 * computeSynastry takes two natal charts and nothing else — no date, no
 * transits. The score between two fixed birth charts is therefore a CONSTANT.
 *
 * This locks that invariant so no future edit can quietly make synastry
 * time-varying and tempt the UI into showing a fake "warmth moved from Charged
 * to Tender" trend. A saved Compare reading is a dated snapshot, never a trend;
 * the only thing that legitimately moves is transits-against-natal + notes.
 */
describe("computeSynastry is deterministic (time-invariant)", () => {
  const a = computeNatalChart({ dateUTC: "1990-05-04T14:20:00.000Z", precision: "exact", lat: 41.8781, lng: -87.6298, tzOffsetMin: -300 });
  const b = computeNatalChart({ dateUTC: "1988-07-22T16:00:00.000Z", precision: "exact", lat: 37.7749, lng: -122.4194, tzOffsetMin: -420 });

  it("returns identical output regardless of when it is called", () => {
    const first = computeSynastry(a, b);
    // Simulate "a different day": recompute the same inputs later. There is no
    // date parameter, so the result must be byte-identical.
    const later = computeSynastry(a, b);
    expect(JSON.stringify(later)).toBe(JSON.stringify(first));
  });

  it("produces the same scores across repeated runs", () => {
    const runs = Array.from({ length: 5 }, () => computeSynastry(a, b).scores.overall);
    expect(new Set(runs).size).toBe(1);
  });

  it("takes no temporal argument (signature guard)", () => {
    // computeSynastry.length is the count of declared parameters (2: a, b).
    // If someone adds a `whenUTC` param, this fails and forces a review of the
    // no-fake-trend guarantee before any time-varying synastry ships.
    expect(computeSynastry.length).toBe(2);
  });
});

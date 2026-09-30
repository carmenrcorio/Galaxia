import { describe, expect, it } from "vitest";
import { relationalPushSafetySkip } from "./relational-transit-push-safety";

const NOW = new Date("2026-07-11T00:00:00.000Z");
const ADULT = { isMinor: false, birthDate: "1990-01-01", birthPrecision: "exact" as const };
const FLAGGED_MINOR = { isMinor: true, birthDate: "1990-01-01", birthPrecision: "exact" as const };
const UNFLAGGED_CHILD = { isMinor: false, birthDate: "2017-04-03", birthPrecision: "exact" as const };
const NOW_LINK: readonly [number, number] = [10, 10.8];
const NO_LINK: readonly [number, number] = [10, 25];

function skip(
  people: Array<typeof ADULT | null>,
  longitudes: readonly [number | null, number | null]
) {
  return relationalPushSafetySkip({ people, longitudes, now: NOW });
}

describe("relational push safety", () => {
  it("sends two adults whose natal points still aspect", () => {
    expect(skip([ADULT, ADULT], NOW_LINK)).toBeNull();
  });

  it("sends no push when either person is a minor, including an unflagged child", () => {
    expect(skip([ADULT, FLAGGED_MINOR], NOW_LINK)).toBe("minor");
    expect(skip([FLAGGED_MINOR, ADULT], NOW_LINK)).toBe("minor");
    expect(skip([ADULT, UNFLAGGED_CHILD], NOW_LINK)).toBe("minor");
    expect(skip([UNFLAGGED_CHILD, UNFLAGGED_CHILD], NOW_LINK)).toBe("minor");
  });

  it("sends no push when a person row is missing", () => {
    expect(skip([ADULT, null], NOW_LINK)).toBe("minor");
  });

  it("sends no push when the current charts fail the synastry gate", () => {
    expect(skip([ADULT, ADULT], NO_LINK)).toBe("stale");
    expect(skip([ADULT, ADULT], [null, 10])).toBe("stale");
  });

  it("checks the minor before the synastry gate", () => {
    expect(skip([ADULT, FLAGGED_MINOR], NO_LINK)).toBe("minor");
  });
});

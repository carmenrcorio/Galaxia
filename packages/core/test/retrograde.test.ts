import { describe, expect, it } from "vitest";
import {
  isPlacementRetrograde,
  RETROGRADE_BADGE_ARIA_LABEL,
  RETROGRADE_BADGE_LABEL
} from "../src/retrograde";

describe("retrograde badge copy", () => {
  it("uses the conventional Rx abbreviation", () => {
    expect(RETROGRADE_BADGE_LABEL).toBe("Rx");
    expect(RETROGRADE_BADGE_ARIA_LABEL).toBe("Retrograde");
  });

  it("reads Placement.retro and ignores a missing or false flag", () => {
    expect(isPlacementRetrograde({ retro: true })).toBe(true);
    expect(isPlacementRetrograde({ retro: false })).toBe(false);
    expect(isPlacementRetrograde({})).toBe(false);
  });
});

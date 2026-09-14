import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const home = readFileSync(resolve(__dirname, "../../app/(app)/home.tsx"), "utf8");

describe("source wiring — mobile constellation loading / empty / error", () => {
  it("uses the shared skeleton seats on the same glance geometry as live nodes", () => {
    expect(home).toContain("constellationSkeletonSeats");
    expect(home).toContain("CONSTELLATION_GEOM");
    expect(home).toContain("SKELETON_SEATS");
    expect(home).toContain("CONSTELLATION_BOX_HEIGHT");
  });

  it("does not leave the skeleton running on empty or error", () => {
    expect(home).toContain("CONSTELLATION_EMPTY");
    expect(home).toContain("CONSTELLATION_EMPTY_ACTION");
    expect(home).toContain("CONSTELLATION_LOAD_ERROR");
    expect(home).toContain("CONSTELLATION_RETRY");
    expect(home).toContain("setConstellationFailed(true)");
    expect(home).toContain('href="/onboarding"');
  });

  it("cross-fades over 250ms and holds points static when reduceMotion is on", () => {
    expect(home).toContain("CONSTELLATION_CROSSFADE_MS = 250");
    expect(home).toContain("if (reduceMotion)");
    expect(home).toContain("skeletonFade.setValue(0.28)");
    expect(home).not.toMatch(/framer-motion|lottie|react-native-reanimated/i);
  });
});

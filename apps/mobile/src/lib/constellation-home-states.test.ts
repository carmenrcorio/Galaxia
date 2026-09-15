import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const home = readFileSync(resolve(__dirname, "../../app/(app)/home.tsx"), "utf8");

describe("source wiring — mobile constellation loading / empty / error", () => {
  it("uses the shared skeleton seats on the same glance geometry as live nodes", () => {
    expect(home).toContain("constellationSkeletonSeats");
    expect(home).toContain("galaxyGeometry");
    expect(home).toContain("SKELETON_SEATS");
    expect(home).toContain("CONSTELLATION_BOX_HEIGHT");
    expect(home).not.toContain("CONSTELLATION_GEOM");
  });

  it("does not leave the skeleton running on empty or error", () => {
    expect(home).toContain("CONSTELLATION_EMPTY");
    expect(home).toContain("CONSTELLATION_EMPTY_ACTION");
    expect(home).toContain("CONSTELLATION_LOAD_ERROR");
    expect(home).toContain("CONSTELLATION_RETRY");
    expect(home).toContain("setConstellationFailed(true)");
    expect(home).toContain('href="/onboarding"');
    expect(home).toContain("withTimeout");
    expect(home).toContain("DEFAULT_FETCH_TIMEOUT_MS");
  });

  it("cross-fades over 250ms and holds points static when reduceMotion is on", () => {
    expect(home).toContain("CONSTELLATION_CROSSFADE_MS = 250");
    expect(home).toContain("if (reduceMotion)");
    expect(home).toContain("skeletonFade.setValue(0.28)");
    expect(home).not.toMatch(/framer-motion|lottie|react-native-reanimated/i);
  });

  it("puts the compact This Week card after the greeting and before the constellation", () => {
    const greeting = home.indexOf("Welcome back");
    const thisWeek = home.indexOf("<ThisWeekCard");
    const canvas = home.indexOf(">Constellation</Text>");
    const today = home.indexOf(">Today in your sky</Text>");
    expect(greeting).toBeGreaterThan(0);
    expect(thisWeek).toBeGreaterThan(greeting);
    expect(canvas).toBeGreaterThan(thisWeek);
    expect(today).toBeGreaterThan(canvas);
    expect(home).toContain("compact");
    expect(home).not.toMatch(/relationalTransits\.length > 0 \?/);
  });
});

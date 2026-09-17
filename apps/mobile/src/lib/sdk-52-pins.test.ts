import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const mobileRoot = resolve(__dirname, "../..");

describe("Expo SDK 52 pins (Phase 0, no Skia)", () => {
  it("locks Expo 52 / RN 0.76 / Router 4, not a later SDK", () => {
    const pkg = JSON.parse(readFileSync(resolve(mobileRoot, "package.json"), "utf8")) as {
      dependencies: Record<string, string>;
    };
    const deps = pkg.dependencies;
    expect(deps.expo).toMatch(/^~52\./);
    expect(deps["expo-router"]).toMatch(/^~4\./);
    expect(deps["react-native"]).toBe("0.76.9");
    expect(deps["expo-linking"]).toMatch(/^~7\./);
    expect(deps["react-native-screens"]).toMatch(/^~4\./);
    expect(deps["react-native-gesture-handler"]).toBeDefined();
    expect(deps["query-string"]).toMatch(/^7\./);
    expect(deps["@shopify/react-native-skia"]).toBeUndefined();
    expect(deps.react).toMatch(/18\.3/);
  });

  it("leaves New Architecture off until the 52 old-arch cut is proven", () => {
    const app = JSON.parse(readFileSync(resolve(mobileRoot, "app.json"), "utf8")) as {
      expo: { newArchEnabled?: boolean };
    };
    expect(app.expo.newArchEnabled).toBe(false);
  });

  it("uses SDK 52 auto Metro monorepo config, not the SDK 51 manual watchFolders block", () => {
    const metro = readFileSync(resolve(mobileRoot, "metro.config.js"), "utf8");
    expect(metro).toContain("getDefaultConfig");
    expect(metro).not.toMatch(/\bwatchFolders\b/);
    expect(metro).not.toMatch(/\bnodeModulesPaths\b/);
    expect(metro).not.toMatch(/\bunstable_enableSymlinks\b/);
  });

  it("wraps the root layout in GestureHandlerRootView (React Navigation 7)", () => {
    const src = readFileSync(resolve(mobileRoot, "app/_layout.tsx"), "utf8");
    expect(src).toContain('from "react-native-gesture-handler"');
    expect(src).toContain("GestureHandlerRootView");
  });
});

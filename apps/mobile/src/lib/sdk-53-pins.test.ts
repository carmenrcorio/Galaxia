import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const mobileRoot = resolve(__dirname, "../..");
const repoRoot = resolve(mobileRoot, "../..");

describe("Expo SDK 53 pins (Phase 0, no Skia)", () => {
  it("locks Expo 53 / RN 0.79 / Router 5 / React 19, not a later SDK", () => {
    const pkg = JSON.parse(readFileSync(resolve(mobileRoot, "package.json"), "utf8")) as {
      dependencies: Record<string, string>;
    };
    const deps = pkg.dependencies;
    expect(deps.expo).toMatch(/^~53\./);
    expect(deps["expo-router"]).toMatch(/^~5\./);
    expect(deps["react-native"]).toBe("0.79.6");
    expect(deps.react).toBe("19.0.0");
    expect(deps["react-dom"]).toBe("19.0.0");
    expect(deps["expo-linking"]).toMatch(/^~7\./);
    expect(deps["react-native-screens"]).toMatch(/^~4\./);
    expect(deps["react-native-gesture-handler"]).toBeDefined();
    expect(deps["query-string"]).toMatch(/^7\./);
    expect(deps["@shopify/react-native-skia"]).toBeUndefined();
  });

  it("turns New Architecture on (SDK 53 default; required for later Skia)", () => {
    const app = JSON.parse(readFileSync(resolve(mobileRoot, "app.json"), "utf8")) as {
      expo: { newArchEnabled?: boolean };
    };
    expect(app.expo.newArchEnabled).toBe(true);
  });

  it("hoists React 19 for the whole workspace so web and mobile share one copy", () => {
    const root = JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8")) as {
      pnpm: { overrides: Record<string, string> };
    };
    const web = JSON.parse(readFileSync(resolve(repoRoot, "apps/web/package.json"), "utf8")) as {
      dependencies: Record<string, string>;
    };
    expect(root.pnpm.overrides.react).toBe("19.0.0");
    expect(root.pnpm.overrides["react-dom"]).toBe("19.0.0");
    expect(web.dependencies.react).toBe("19.0.0");
    expect(web.dependencies["react-dom"]).toBe("19.0.0");
  });

  it("uses SDK 52+ auto Metro monorepo config, not the SDK 51 manual watchFolders block", () => {
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

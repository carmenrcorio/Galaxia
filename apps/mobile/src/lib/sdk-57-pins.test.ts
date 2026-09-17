import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const mobileRoot = resolve(__dirname, "../..");
const repoRoot = resolve(mobileRoot, "../..");

describe("Expo SDK 57 pins (Phase 0 complete; Phase 2 uses bundled Skia 2.6.2)", () => {
  it("locks Expo 57 / RN 0.86 / Router 57 / React 19.2, not a later SDK", () => {
    const pkg = JSON.parse(readFileSync(resolve(mobileRoot, "package.json"), "utf8")) as {
      dependencies: Record<string, string>;
    };
    const deps = pkg.dependencies;
    expect(deps.expo).toMatch(/^~57\./);
    expect(deps["expo-router"]).toMatch(/^~57\./);
    expect(deps["react-native"]).toBe("0.86.3");
    expect(deps.react).toBe("19.2.3");
    expect(deps["react-dom"]).toBe("19.2.3");
    expect(deps["expo-linking"]).toMatch(/^~57\./);
    expect(deps["react-native-screens"]).toMatch(/^~4\./);
    expect(deps["react-native-gesture-handler"]).toBeDefined();
    expect(deps["react-native-reanimated"]).toBe("4.5.1");
    expect(deps["react-native-worklets"]).toBe("0.10.1");
    expect(deps["expo-splash-screen"]).toMatch(/^~57\./);
    expect(deps["query-string"]).toMatch(/^7\./);
    expect(deps["@shopify/react-native-skia"]).toBe("2.6.2");
    expect(deps["expo-font"]).toMatch(/^~57\./);
    expect(deps["expo-blur"]).toMatch(/^~57\./);
  });

  it("does not opt out of New Architecture (required from SDK 55; Skia uses it)", () => {
    const app = JSON.parse(readFileSync(resolve(mobileRoot, "app.json"), "utf8")) as {
      expo: { newArchEnabled?: boolean; plugins?: unknown };
    };
    expect(app.expo.newArchEnabled).toBeUndefined();
    expect(JSON.stringify(app.expo.plugins)).toContain("expo-splash-screen");
  });

  it("hoists React 19.2 for the whole workspace so web and mobile share one copy", () => {
    const root = JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8")) as {
      pnpm: { overrides: Record<string, string> };
    };
    const web = JSON.parse(readFileSync(resolve(repoRoot, "apps/web/package.json"), "utf8")) as {
      dependencies: Record<string, string>;
    };
    expect(root.pnpm.overrides.react).toBe("19.2.3");
    expect(root.pnpm.overrides["react-dom"]).toBe("19.2.3");
    expect(web.dependencies.react).toBe("19.2.3");
    expect(web.dependencies["react-dom"]).toBe("19.2.3");
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

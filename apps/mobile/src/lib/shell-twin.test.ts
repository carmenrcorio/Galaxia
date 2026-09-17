import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const mobileRoot = resolve(__dirname, "../..");

function readMobile(rel: string): string {
  return readFileSync(resolve(mobileRoot, rel), "utf8");
}

describe("Phase 2 shell twin: fonts, Skia sky, glass, tabs, trial banner", () => {
  it("pins current Skia 2.6.2 plus expo-font and expo-blur on Expo 57", () => {
    const pkg = JSON.parse(readFileSync(resolve(mobileRoot, "package.json"), "utf8")) as {
      dependencies: Record<string, string>;
    };
    expect(pkg.dependencies["@shopify/react-native-skia"]).toBe("2.6.2");
    expect(pkg.dependencies["expo-font"]).toMatch(/^~57\./);
    expect(pkg.dependencies["expo-blur"]).toMatch(/^~57\./);
    const app = JSON.parse(readMobile("app.json")) as { expo: { plugins: unknown } };
    expect(JSON.stringify(app.expo.plugins)).toContain("expo-font");
  });

  it("loads the same Fraunces and Inter TTFs web uses for OG, under OFL", () => {
    const fontsDir = resolve(mobileRoot, "assets/fonts");
    for (const name of ["Fraunces-Regular.ttf", "Fraunces-SemiBold.ttf", "Inter-Regular.ttf", "Inter-SemiBold.ttf", "OFL.txt", "NOTICE.md"]) {
      expect(existsSync(resolve(fontsDir, name)), name).toBe(true);
    }
    const root = readMobile("app/_layout.tsx");
    expect(root).toContain("useFonts");
    expect(root).toContain("galaxiaFontMap");
    expect(root).toContain("expo-splash-screen");
    const map = readMobile("src/lib/typography.ts");
    expect(map).toContain("Fraunces-Regular");
    expect(map).toContain("Fraunces-SemiBold");
    expect(map).toContain("Inter-Regular");
    expect(map).toContain("Inter-SemiBold");
    expect(map).toContain("assets/fonts/Fraunces-Regular.ttf");
  });

  it("mounts Skia CosmicBackground and the trial banner in the authed shell", () => {
    const layout = readMobile("app/(app)/_layout.tsx");
    expect(layout).toContain("CosmicBackground");
    expect(layout).toContain("TrialBanner");
    expect(layout).toContain("resolveAuthedRouteGate");
    expect(layout).toContain("hasAccess");
    const cosmic = readMobile("src/components/cosmic-background.tsx");
    expect(cosmic).toContain('from "@shopify/react-native-skia"');
    expect(cosmic).toContain("PictureRecorder");
    expect(cosmic).toContain("buildRuntimeLayers");
    expect(cosmic).toContain("reduceMotion");
    expect(cosmic).toContain("STAR_CREAM_HEX");
    expect(cosmic).not.toContain("expo-sensors");
    const banner = readMobile("src/components/trial-banner.tsx");
    expect(banner).toContain("useEntitlement");
    expect(banner).toContain('status !== "trialing"');
    expect(banner).toContain("Continue with Galaxia →");
    expect(banner).toContain('href="/subscribe"');
    expect(banner).toContain("trialDaysRemaining");
  });

  it("uses Expo tabs for Home Compare Groups Vela Settings and drops the home dump", () => {
    const tabs = readMobile("app/(app)/(tabs)/_layout.tsx");
    expect(tabs).toContain('from "expo-router"');
    expect(tabs).toContain("<Tabs");
    expect(tabs).toContain('name="home"');
    expect(tabs).toContain('name="compare"');
    expect(tabs).toContain('name="groups"');
    expect(tabs).toContain('name="vela"');
    expect(tabs).toContain('name="settings"');
    expect(tabs).toContain("BlurView");
    expect(tabs).toContain('backgroundColor: "transparent"');
    const home = readMobile("app/(app)/(tabs)/home.tsx");
    expect(home).toContain('href="/moment"');
    expect(home).toContain('href="/onboarding"');
    expect(home).toContain('href="/profile/self"');
    expect(home).not.toContain('href="/compare"');
    expect(home).not.toContain('href="/groups"');
    expect(home).not.toContain('href="/settings"');
    expect(home).not.toContain("signOut");
    expect(home).toContain("GlassCard");
    expect(home).toContain("fonts.frauncesSemi");
    expect(home).toContain("screenFill");
    expect(existsSync(resolve(mobileRoot, "app/(app)/home.tsx"))).toBe(false);
    expect(existsSync(resolve(mobileRoot, "app/(app)/subscribe.tsx"))).toBe(false);
  });

  it("keeps glass primitives on the landing recipe (blur, gold hairline, radius 22)", () => {
    const glass = readMobile("src/components/glass.tsx");
    expect(glass).toContain("expo-blur");
    expect(glass).toContain("BlurView");
    expect(glass).toContain("rgba(230,174,108,0.13)");
    expect(glass).toContain("tokens.radii.lg");
    expect(glass).toContain("export function GlassCard");
    expect(glass).toContain("export const Pill");
    expect(glass).toContain("export const Chip");
    const thisWeek = readMobile("src/components/this-week-card.tsx");
    expect(thisWeek).toContain("GlassCard");
  });
});

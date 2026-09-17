import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const mobileRoot = resolve(__dirname, "../..");
const repoRoot = resolve(mobileRoot, "../..");

function readMobile(rel: string): string {
  return readFileSync(resolve(mobileRoot, rel), "utf8");
}

describe("Phase 4 constellation twin: Skia Home map from shared geometry", () => {
  it("paints a Skia PictureRecorder map from galaxyGeometry / effectiveSeat", () => {
    const map = readMobile("src/components/constellation-map.tsx");
    expect(map).toContain('from "@shopify/react-native-skia"');
    expect(map).toContain("PictureRecorder");
    expect(map).toContain("buildConstellationModel");
    expect(map).toContain("RELATION_LINE_STYLE");
    expect(map).toContain("drawHonorLink");
    expect(map).not.toContain("radX: 120");
    const paint = readMobile("src/lib/constellation-paint.ts");
    expect(paint).toContain("galaxyGeometry");
    expect(paint).toContain("effectiveSeat");
    expect(paint).toContain("person.custom_position) return base");
  });

  it("Home is full-bleed, fetches star_color + un-narrowed relationships, taps to profile", () => {
    const home = readMobile("app/(app)/(tabs)/home.tsx");
    expect(home).toContain("ConstellationMap");
    expect(home).toContain("constellationStageHeight");
    expect(home).not.toContain("CONSTELLATION_BOX_HEIGHT");
    expect(home).not.toContain("at a glance");
    expect(home).toContain('select("id, display_name, relation, birth_precision, birth_date, is_self, is_minor, passed_at, star_color, memorial_constellation, custom_position, star_scale")');
    expect(home).toContain(
      'supabase.from("relationships").select("person_a, person_b, relation_type").eq("owner_id", session.user.id)',
    );
    expect(home).not.toContain('.eq("relation_type", HONOR_RELATION_TYPE)');
    expect(home).toContain("honorEdgesFromDeclaredRows");
    expect(home).toContain("elementFromRelation");
    expect(home).toContain('pathname: "/profile/[personId]"');
    expect(home).toContain("onSelectPerson");
    expect(home).toContain("reduceMotion");
  });

  it("keeps Inter 11px labels and the web ring / honor dash numbers", () => {
    const paint = readMobile("src/lib/constellation-paint.ts");
    const map = readMobile("src/components/constellation-map.tsx");
    expect(paint).toContain("LABEL_FONT_PX = 11");
    expect(paint).toContain("GALAXY_GUIDE_RINGS");
    expect(map).toContain("useFont(INTER_REGULAR, LABEL_FONT_PX)");
    expect(map).toContain("MakeDash([...style.dash]");
    expect(map).toContain("quadTo");
    expect(existsSync(resolve(mobileRoot, "assets/fonts/Inter-Regular.ttf"))).toBe(true);
  });

  it("does not treat synastry as honor and does not wrap Next.js in a WebView", () => {
    const map = readMobile("src/components/constellation-map.tsx");
    const home = readMobile("app/(app)/(tabs)/home.tsx");
    expect(map).toContain("drawSynastryLink");
    expect(map).toContain("drawHonorLink");
    expect(home).not.toContain("WebView");
    expect(home).not.toContain("react-native-webview");
    const webHonor = readFileSync(resolve(repoRoot, "apps/web/app/app/page.tsx"), "utf8");
    expect(webHonor).toContain("const style = RELATION_LINE_STYLE[edge.relationType]");
  });
});

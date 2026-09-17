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
    expect(home).toContain("Your constellation");
    expect(home).toContain("SETTING_SHOW_RINGS");
    expect(home).toContain("Hide orbital rings");
    expect(home).toContain("Tap a star to open · hold to move");
    expect(home).toContain("onCommitCustomPosition");
    expect(home).toContain("onDragActiveChange");
    expect(home).toContain("scrollEnabled={!draggingSeat}");
    expect(home).toContain('.eq("owner_id", owner)');
    expect(home).not.toContain("borderRadius: 16");
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
    expect(map).toContain("GALAXY_WASH_RADIUS");
    expect(map).toContain("MakeRadialGradient");
    expect(map).toContain("MEMORIAL_FLARE_R");
    expect(map).toContain("RING_GLOW_BLUR_MUL");
    expect(map).toContain("GALAXY_GRAIN_OPACITY");
    expect(map).toContain("BlendMode.Overlay");
    expect(map).toContain("DRAG_HOLD_MS");
    expect(map).toContain("if (!hit || hit.is_self)");
    expect(map).toContain("onCommitCustomPosition");
    expect(map).toContain("onStartShouldSetResponder");
    expect(map).toContain("return Boolean(hitAt(x, y))");
    expect(existsSync(resolve(mobileRoot, "assets/fonts/Inter-Regular.ttf"))).toBe(true);
  });

  it("wash, ring glow, grain, and memorial flare match the web paintFrame recipe", () => {
    const paint = readMobile("src/lib/constellation-paint.ts");
    const web = readFileSync(resolve(repoRoot, "apps/web/app/app/page.tsx"), "utf8");
    expect(paint).toContain('color: "rgba(22,16,46,0.34)"');
    expect(paint).toContain('color: "rgba(12,8,32,0.55)"');
    expect(paint).toContain('color: "rgba(6,4,18,0.82)"');
    expect(paint).toContain("GALAXY_WASH_RADIUS = 0.72");
    expect(paint).toContain("ATM_BAKE_MS = 240");
    expect(paint).toContain("RING_GLOW_BLUR_MUL = 5");
    expect(paint).toContain("MEMORIAL_FLARE_R = 2.2");
    expect(paint).toContain("GALAXY_GRAIN_OPACITY = 0.045");
    expect(web).toContain('wg.addColorStop(0,   "rgba(22,16,46,0.34)")');
    expect(web).toContain('wg.addColorStop(0.6, "rgba(12,8,32,0.55)")');
    expect(web).toContain('wg.addColorStop(1,   "rgba(6,4,18,0.82)")');
    expect(web).toContain("Math.max(cssW, cssH) * 0.72");
    expect(web).toContain("band.width * 5 * dpr");
    expect(web).toContain("R0 * 2.2 * (1.1 + 0.5 * ign.flare)");
    expect(web).toContain("opacity: 0.045, mixBlendMode: \"overlay\"");
    const map = readMobile("src/components/constellation-map.tsx");
    expect(map).toContain("Math.max(width, height) * GALAXY_WASH_RADIUS");
    expect(map).not.toContain("[0, 0.45, 1]");
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

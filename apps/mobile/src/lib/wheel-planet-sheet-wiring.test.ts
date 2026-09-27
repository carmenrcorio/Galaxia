/**
 * Mobile twin of the web wheel glyph card: tapping a planet opens a bottom
 * sheet with the same placement facts, and the same surfaces opt in (natal
 * profile yes, Compare bi-wheel no).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const mobileRoot = resolve(__dirname, "../..");

function readMobile(rel: string): string {
  return readFileSync(resolve(mobileRoot, rel), "utf8");
}

const sheet = readMobile("src/components/wheel-planet-sheet.tsx");
const wheel = readMobile("src/components/chart-wheel.tsx");
const profile = readMobile("app/(app)/profile/[personId].tsx");
const compare = readMobile("app/(app)/(tabs)/compare.tsx");

describe("wheel planet sheet", () => {
  it("reads the same content model and copy as the web card", () => {
    expect(sheet).toContain("planetTooltipSummary");
    expect(sheet).toContain("PLANET_TOOLTIP_FULL_READING_MOBILE");
    expect(sheet).toContain("PLANET_TOOLTIP_DISMISS_LABEL");
    expect(sheet).toContain("type PlanetTooltipContent");
    expect(sheet).toContain("content.houseLine");
    expect(sheet).toContain("content.domain");
    expect(sheet).toContain("<RetrogradeBadge retro={content.retroLabel != null} />");
  });

  it("dismisses on tap outside, on a downward swipe, and on the back gesture", () => {
    expect(sheet).toContain("onRequestClose={onClose}");
    expect(sheet).toContain("PanResponder.create");
    expect(sheet).toContain("gesture.dy > SWIPE_DISMISS_PX");
    expect(sheet).toContain("event.stopPropagation()");
  });
});

describe("mobile ChartWheel", () => {
  it("builds the sheet content from the shared core formatter", () => {
    expect(wheel).toContain("planetTooltipContent");
    expect(wheel).toContain("bodyDomain(");
    expect(wheel).not.toMatch(/BODY_DOMAIN\[/);
    expect(wheel).toContain("hasHouses: layout.hasHouses");
  });

  it("requires minorSafe and a reading target, and stays natal-only", () => {
    expect(wheel).toContain("minorSafe: boolean;");
    expect(wheel).toContain("onSeeFullReading: (body: string) => void;");
    expect(wheel).toContain("interactive && !layout.isOverlay && planetTooltips != null");
  });

  it("names the whole placement for a screen reader on the glyph itself", () => {
    expect(wheel).toContain("accessibilityLabel={glyphContent ? planetTooltipSummary(glyphContent) : `${body} glyph`}");
  });
});

describe("mobile surfaces", () => {
  it("the natal profile wheel opts in and scrolls to the right card", () => {
    expect(profile).toContain("planetTooltips={{ minorSafe: personIsMinor, onSeeFullReading: revealPlacementCard }}");
    expect(profile).toContain('body === "sun" || body === "moon" ? bigThreeY.current : placementsY.current');
    expect(profile).toContain("scrollRef.current?.scrollTo(");
    expect(profile).toContain("bigThreeY.current = event.nativeEvent.layout.y");
    expect(profile).toContain("placementsY.current = event.nativeEvent.layout.y");
    expect(profile).toContain("<ScrollView ref={scrollRef}");
  });

  it("the Compare bi-wheel stays sheet-free", () => {
    expect(compare).not.toContain("planetTooltips");
  });
});

/**
 * Which wheel surfaces carry planet glyph cards, and which deliberately do
 * not. Source-text checks, because these are page compositions rather than
 * units: the person page and Quick Chart pull in `server-only` neighbours and
 * a Supabase client, so importing them here is not an option.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { placementAnchorId } from "@galaxia/core";

function read(rel: string): string {
  return readFileSync(resolve(__dirname, "..", rel), "utf8");
}

const personPage = read("app/app/person/[id]/page.tsx");
const quickChart = read("app/chart/quick-chart-page.tsx");
const wheel = read("components/chart-wheel.tsx");

describe("ChartWheel tooltip opt-in shape", () => {
  it("requires minorSafe and a reading target rather than accepting a bare flag", () => {
    expect(wheel).toContain("planetTooltips?: {");
    expect(wheel).toContain("minorSafe: boolean;");
    expect(wheel).toContain("onSeeFullReading: (body: string) => void;");
    // Venus copy is chosen through bodyDomain, never read off BODY_DOMAIN.
    expect(wheel).toContain("bodyDomain(");
    expect(wheel).not.toMatch(/BODY_DOMAIN\[/);
  });

  it("gates the card on a natal, interactive wheel", () => {
    expect(wheel).toContain("interactive && !layout.isOverlay && planetTooltips != null");
  });
});

describe("/app/person/[id] wheel", () => {
  it("opts in with the person's own minor-safety flag", () => {
    expect(personPage).toContain("planetTooltips={{ minorSafe: personIsMinor, onSeeFullReading: revealPlacementCard }}");
  });

  it("opens the row, shows the Them panel, then scrolls to the placement anchor", () => {
    expect(personPage).toContain("const revealPlacementCard = useCallback((body: string)");
    expect(personPage).toContain('body === "sun" || body === "moon" ? body : `pl-${body}`');
    expect(personPage).toContain('setActiveGroup("them")');
    expect(personPage).toContain("new Set(prev).add(rowKey)");
    expect(personPage).toContain("document.getElementById(placementAnchorId(body))?.scrollIntoView");
  });

  it("gives every placement card the anchor the link targets", () => {
    expect(personPage).toContain("anchorId={placementAnchorId(p.body)}");
    expect(personPage).toContain("id={anchorId}");
    // Sun and Moon live in Big Three, so their chips carry the anchor too.
    expect(personPage).toContain("id={body ? placementAnchorId(body) : undefined}");
  });
});

describe("/chart (Quick Chart) wheel", () => {
  it("opts in with the computed chart's minor-safety flag", () => {
    expect(quickChart).toContain("planetTooltips={{ minorSafe: chartMinorSafe, onSeeFullReading: revealPlacementRow }}");
  });

  it("expands the collapsed full-chart list before scrolling to the row", () => {
    expect(quickChart).toContain("const revealPlacementRow = useCallback((body: string)");
    expect(quickChart).toContain("setExpanded(true)");
    expect(quickChart).toContain("document.getElementById(placementAnchorId(body))?.scrollIntoView");
    expect(quickChart).toContain("id={placementAnchorId(p.body)}");
  });
});

describe("surfaces that must stay card-free", () => {
  it("the Compare bi-wheels and the share snapshot never opt in", () => {
    for (const rel of [
      "app/app/compare/page.tsx",
      "app/chart/compare/page.tsx",
      "components/share-snapshot-view.tsx",
    ]) {
      expect(read(rel)).not.toContain("planetTooltips");
    }
  });

  it("the PDF export wheel stays static", () => {
    const pdf = read("components/chart-pdf-export.tsx");
    expect(pdf).toContain("interactive={false}");
    expect(pdf).not.toContain("planetTooltips");
  });
});

describe("anchor ids", () => {
  it("are the shared core helper, so a rename cannot orphan the link", () => {
    expect(placementAnchorId("venus")).toBe("placement-venus");
    expect(personPage).not.toContain('id="placement-');
    expect(quickChart).not.toContain('id="placement-');
  });
});

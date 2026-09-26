import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function read(rel: string): string {
  return readFileSync(resolve(__dirname, rel), "utf8");
}

describe("natal Rx badge wiring", () => {
  it("person placement rows pin Rx to the planet glyph", () => {
    const src = read("../app/app/person/[id]/page.tsx");
    expect(src).toContain('import { RetrogradeBadge } from "../../../../components/retrograde-badge"');
    expect(src).toContain("<RetrogradeBadge retro={Boolean(retro)} corner />");
    expect(src).toContain("retro={p.retro}");
  });

  it("quick chart and share lists place Rx after the sign", () => {
    const quick = read("../app/chart/quick-chart-page.tsx");
    const share = read("../components/share-snapshot-view.tsx");
    const pdf = read("../components/chart-pdf-export.tsx");
    expect(quick).toContain("<RetrogradeBadge retro={p.retro} />");
    expect(share).toContain("<RetrogradeBadge retro={p.retro} />");
    expect(pdf).toContain("<RetrogradeBadge retro={p.retro} />");
  });

  it("flip cards read Placement.retro", () => {
    const src = read("../components/flip-sign-cards.tsx");
    expect(src).toContain("retro: sun.retro");
    expect(src).toContain("retro: moon.retro");
    expect(src).toContain("<RetrogradeBadge retro={tile.retro} corner />");
  });
});

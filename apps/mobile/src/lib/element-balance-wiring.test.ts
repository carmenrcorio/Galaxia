import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const mobileRoot = resolve(__dirname, "../..");

describe("mobile Compare element balance", () => {
  it("renders the shared computed balance with both person bars and interpretation", () => {
    const compare = readFileSync(resolve(mobileRoot, "app/(app)/(tabs)/compare.tsx"), "utf8");
    const component = readFileSync(resolve(mobileRoot, "src/components/element-balance-card.tsx"), "utf8");

    expect(compare).toContain('import { ElementBalanceCard } from "../../../src/components/element-balance-card"');
    expect(compare).toContain("balance={result.synastry.elementBalance}");
    expect(component).toContain("CHART_ELEMENTS.map");
    expect(component).toContain("interpretPairElementBalance(balance)");
    expect(component).toContain("tokens.elementBalance[element]");
    expect(component).toContain("Sun through Pluto, ten planets each.");
  });
});

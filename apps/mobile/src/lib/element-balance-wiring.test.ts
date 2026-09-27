import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("mobile Compare element balance wiring", () => {
  it("renders both per-person bars from the computed synastry result", () => {
    const compare = readFileSync(
      resolve(__dirname, "../../app/(app)/(tabs)/compare.tsx"),
      "utf8"
    );
    const section = readFileSync(
      resolve(__dirname, "../components/element-balance-section.tsx"),
      "utf8"
    );

    expect(compare).toContain("<ElementBalanceSection");
    expect(compare).toContain("balance={result.synastry.elementBalance}");
    expect(section).toContain("CHART_ELEMENTS.map");
    expect(section).toContain("pairElementBalanceInterpretation(balance)");
    expect(section).toContain('fire: "#DD7651"');
    expect(section).not.toContain("\u2014");
  });
});

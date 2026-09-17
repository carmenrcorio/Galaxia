import { personChipColor } from "@galaxia/core";
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("mobile InitialAvatar uses the shared helper", () => {
  it("imports personChipColor and does not invent a local palette", () => {
    const src = readFileSync(resolve(__dirname, "../components/initial-avatar.tsx"), "utf8");
    expect(src).toContain('from "@galaxia/core"');
    expect(src).toContain("personChipColor");
    expect(src).toContain("personInitials");
    expect(src).not.toContain("#ff00");
  });

  it("compare / groups / profile / home / vela / this-week import InitialAvatar", () => {
    const files = [
      "../../app/(app)/(tabs)/compare.tsx",
      "../../app/(app)/(tabs)/groups.tsx",
      "../../app/(app)/profile/[personId].tsx",
      "../../app/(app)/(tabs)/home.tsx",
      "../../app/(app)/(tabs)/vela.tsx",
      "../components/this-week-card.tsx",
    ];
    for (const rel of files) {
      const src = readFileSync(resolve(__dirname, rel), "utf8");
      expect(src, rel).toContain("InitialAvatar");
      expect(src, rel).toContain("personId=");
    }
  });

  it("two water signs stay distinct through the same helper mobile will call", () => {
    const a = personChipColor({ id: "1", sunSign: "Cancer" });
    const b = personChipColor({ id: "2", sunSign: "Scorpio" });
    expect(a.element).toBe("water");
    expect(b.element).toBe("water");
    expect(a.fill).not.toBe(b.fill);
  });
});

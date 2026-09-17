import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { genFrame, genHeadline, genPlacement } from "@galaxia/astro";
import { describe, expect, it } from "vitest";
import {
  GENERIC_SHARED,
  buildGenerationalCallout
} from "./generational-callout";

const ANCESTRAL_DUP =
  "This connection spans different eras. The generational layer is the headline.";

describe("mobile generational call-out model", () => {
  it("builds one diverged card per planet with domain, watch-for, and You:/Them: proof", () => {
    const model = buildGenerationalCallout({
      shared: [],
      diverged: [
        { planet: "pluto", signA: "Scorpio", signB: "Sagittarius" },
        { planet: "neptune", signA: "Sagittarius", signB: "Capricorn" },
        { planet: "uranus", signA: "Libra", signB: "Scorpio" }
      ]
    });

    expect(model.headline).toBe(genHeadline(0, 3));
    expect(model.shared).toHaveLength(0);
    expect(model.diverged).toHaveLength(3);
    expect(model.leads.map((lead) => lead.sign)).toEqual(["Scorpio", "Sagittarius"]);
    expect(model.leads[0]!.source).toContain("Pluto in Scorpio");

    const pluto = model.diverged[0]!;
    const frame = genFrame("pluto");
    const you = genPlacement("pluto", "Scorpio");
    const them = genPlacement("pluto", "Sagittarius");
    expect(pluto.domain).toBe(frame.domain);
    expect(pluto.watchFor).toBe(frame.diverged);
    expect(pluto.proof).toContain("You: Pluto in Scorpio");
    expect(pluto.proof).toContain("Them: Pluto in Sagittarius");
    expect(pluto.proof).toContain(you!.essence.replace(/\.\s*$/, ""));
    expect(pluto.proof).toContain(them!.essence.replace(/\.\s*$/, ""));
    expect(pluto.proof.startsWith("You:")).toBe(true);
    expect(pluto.proof).toContain("Them:");
  });

  it("builds shared cards from library essence + shared guidance, not engine theme", () => {
    const model = buildGenerationalCallout({
      shared: [{ planet: "pluto", sign: "Scorpio" }],
      diverged: [{ planet: "uranus", signA: "Libra", signB: "Scorpio" }]
    });
    expect(model.headline).toBe(genHeadline(1, 1));
    expect(model.shared).toHaveLength(1);
    const reading = genPlacement("pluto", "Scorpio");
    expect(model.shared[0]!.essence).toBe(reading!.essence);
    expect(model.shared[0]!.guidance).toBe(reading!.shared);
    expect(model.shared[0]!.proof).toBe("Pluto in Scorpio");
  });

  it("falls back to the generic shared line when a placement is missing, never fabricates", () => {
    const model = buildGenerationalCallout({
      shared: [{ planet: "pluto", sign: "NotASign" }],
      diverged: []
    });
    expect(model.shared[0]!.essence).toBe(GENERIC_SHARED);
    expect(model.shared[0]!.guidance).toBeNull();
    expect(GENERIC_SHARED.includes("\u2014")).toBe(false);
  });

  it("skips unknown diverged planets instead of inventing a card", () => {
    const model = buildGenerationalCallout({
      shared: [],
      diverged: [{ planet: "saturn", signA: "Capricorn", signB: "Aquarius" }]
    });
    expect(model.diverged).toHaveLength(0);
  });
});

describe("mobile Compare wiring", () => {
  const compareSrc = readFileSync(resolve(__dirname, "../../app/(app)/(tabs)/compare.tsx"), "utf8");
  const sectionSrc = readFileSync(
    resolve(__dirname, "../components/generational-section.tsx"),
    "utf8"
  );

  it("renders GenerationalSection and does not keep the compact ancestralHeadline block", () => {
    expect(compareSrc).toContain("GenerationalSection");
    expect(compareSrc).toContain('from "../../../src/components/generational-section"');
    expect(compareSrc).not.toContain("ancestralHeadline");
    expect(compareSrc).not.toContain(ANCESTRAL_DUP);
    expect(compareSrc).not.toMatch(/Generational fault lines:/);
  });

  it("does not emit the duplicate ancestral headline anywhere in the native section", () => {
    expect(sectionSrc).not.toContain(ANCESTRAL_DUP);
    expect(sectionSrc).not.toContain("ancestralHeadline");
    expect(sectionSrc).toContain("model.diverged");
    expect(sectionSrc).toContain("card.watchFor");
    expect(sectionSrc).toContain("card.proof");
    expect(sectionSrc).toContain("WORK_VIEW_HEADING");
    expect(sectionSrc).toContain("ERA_READING_HEADING");
    expect(sectionSrc).toContain("lead.source");
  });
});

import { describe, expect, it } from "vitest";
import {
  ASPECT_GLOSSARY_SLUGS,
  GLOSSARY_SEE_FULL_DEFINITION,
  GLOSSARY_TERMS,
  aspectGlossarySlug,
  getGlossaryTerm,
  glossaryPreview,
} from "../src/glossary-terms";

describe("shared glossary terms", () => {
  it("looks up orb and previews the first two sentences", () => {
    const orb = getGlossaryTerm("orb");
    expect(orb?.id).toBe("orb");
    expect(orb?.term).toBe("Orb");
    expect(glossaryPreview(orb!.definition)).toBe(
      "The distance in degrees between an exact aspect. A tighter orb means a stronger connection.",
    );
    expect(orb!.definition).not.toContain("\u2014");
    expect(GLOSSARY_SEE_FULL_DEFINITION).toBe("See full definition");
    expect(GLOSSARY_SEE_FULL_DEFINITION).not.toContain("\u2014");
  });

  it("maps the supported aspect types to glossary slugs", () => {
    expect(ASPECT_GLOSSARY_SLUGS).toEqual([
      "conjunction",
      "opposition",
      "quincunx",
      "sextile",
      "square",
      "trine",
    ]);
    expect(aspectGlossarySlug("Trine")).toBe("trine");
    expect(aspectGlossarySlug("Quincunx")).toBe("quincunx");
    expect(aspectGlossarySlug("applying")).toBeUndefined();
    expect(GLOSSARY_TERMS).toHaveLength(38);
  });

  it("defines the adjusts and quincunx relationship terms", () => {
    expect(getGlossaryTerm("adjusts")?.definition).toContain(
      "persistent mismatches that ask for a different angle",
    );
    expect(getGlossaryTerm("quincunx")?.definition).toContain(
      "Galaxia uses a 2.5-degree orb",
    );
  });
});

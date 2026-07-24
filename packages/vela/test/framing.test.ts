import { describe, expect, it } from "vitest";
import {
  groupFramingBlock,
  parentingFramingBlock,
  resolveVelaFramingMode,
  thirdPersonMinorFramingBlock,
  velaFramingBlock
} from "../src/index";

describe("resolveVelaFramingMode — exactly one mode", () => {
  it("GROUP: QATEST Group1 shape (two grandmothers + grandchild minor) → group, not parenting", () => {
    const mode = resolveVelaFramingMode({
      isGroupScope: true,
      groupName: "QATEST Group1",
      // Subject would be irrelevant — group wins even if a child-tagged minor were passed.
      subject: {
        name: "Gabriel",
        relation: "grandchild",
        isMinor: true
      }
    });
    expect(mode).toEqual({ kind: "group", groupName: "QATEST Group1" });
    const block = velaFramingBlock(mode);
    expect(block).toBe(groupFramingBlock("QATEST Group1"));
    expect(block).toContain("Speak about all of them by name");
    expect(block).not.toContain("Coach the user as their parent");
    expect(block).not.toContain("Do not assume the user is their parent");
  });

  it("GROUP: adults-only group still uses group framing", () => {
    const mode = resolveVelaFramingMode({
      isGroupScope: true,
      groupName: "Siblings",
      subject: null
    });
    expect(mode.kind).toBe("group");
    expect(velaFramingBlock(mode)).toBe(groupFramingBlock("Siblings"));
  });

  it("THIRD_PERSON_MINOR: 1:1 grandmother asking about grandchild (no child tag)", () => {
    const mode = resolveVelaFramingMode({
      isGroupScope: false,
      groupName: null,
      subject: {
        name: "Gabriel",
        relation: "grandchild",
        isMinor: true
      }
    });
    expect(mode).toEqual({ kind: "third_person_minor", subjectName: "Gabriel" });
    const block = velaFramingBlock(mode);
    expect(block).toBe(thirdPersonMinorFramingBlock("Gabriel"));
    expect(block).toContain("third person");
    expect(block).toContain("Do not assume the user is their parent");
    expect(block).not.toContain("Coach the user as their parent");
    expect(block).not.toContain("Speak about all of them by name");
  });

  it("PARENTING: 1:1 parent to own child (subject tagged child)", () => {
    const mode = resolveVelaFramingMode({
      isGroupScope: false,
      groupName: null,
      subject: {
        name: "Gabriel",
        relation: "child",
        isMinor: true
      }
    });
    expect(mode).toEqual({ kind: "parenting", subjectName: "Gabriel" });
    const block = velaFramingBlock(mode);
    expect(block).toBe(parentingFramingBlock("Gabriel"));
    expect(block).toContain("Coach the user as their parent");
    expect(block).toContain("Never address Gabriel directly");
    expect(block).not.toContain("Do not assume the user is their parent");
    expect(block).not.toContain("Speak about all of them by name");
  });

  it("tag direction: subject tagged parent (user's parent) never triggers parenting mode", () => {
    const mode = resolveVelaFramingMode({
      isGroupScope: false,
      groupName: null,
      subject: {
        name: "Abuelita Rosa",
        relation: "parent",
        // Even if somehow marked minor, "parent" tag must not invert into parenting mode.
        isMinor: true
      }
    });
    expect(mode.kind).toBe("third_person_minor");
    expect(velaFramingBlock(mode)).toBe(thirdPersonMinorFramingBlock("Abuelita Rosa"));
    expect(velaFramingBlock(mode)).not.toContain("Coach the user as their parent");
  });

  it("DEFAULT: adult 1:1 — empty framing block", () => {
    const mode = resolveVelaFramingMode({
      isGroupScope: false,
      groupName: null,
      subject: {
        name: "Frankie",
        relation: "friend",
        isMinor: false
      }
    });
    expect(mode).toEqual({ kind: "default" });
    expect(velaFramingBlock(mode)).toBe("");
  });
});

describe("velaFramingBlock — dual instruction unconstructable", () => {
  it("each mode injects exactly one non-empty block family (or none)", () => {
    const blocks = [
      velaFramingBlock({ kind: "group", groupName: "G" }),
      velaFramingBlock({ kind: "parenting", subjectName: "Kid" }),
      velaFramingBlock({ kind: "third_person_minor", subjectName: "Kid" }),
      velaFramingBlock({ kind: "default" })
    ];
    const nonempty = blocks.filter(Boolean);
    expect(nonempty).toHaveLength(3);
    // No block contains both group and parenting coaching.
    for (const b of nonempty) {
      const hasGroup = b.includes("Speak about all of them by name");
      const hasParenting = b.includes("Coach the user as their parent");
      const hasThird = b.includes("Do not assume the user is their parent");
      expect([hasGroup, hasParenting, hasThird].filter(Boolean)).toHaveLength(1);
    }
  });
});

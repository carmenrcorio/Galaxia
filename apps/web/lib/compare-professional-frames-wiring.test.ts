import { isMinorForSafety } from "@galaxia/core";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  COMPARE_RELATION_LABEL,
  COMPARE_RELATION_TYPES,
  PROFESSIONAL_RELATION_TYPES,
  availableCompareRelationTypes,
  compareRelationLabel,
  defaultCompareRelationType,
  isProfessionalRelation,
  isRomanticRelation,
  suggestCompareRelationType,
  type RelationType,
} from "@galaxia/astro";
import {
  SAFE_VELA_RELATIONSHIP_TYPES_WITH_MINOR,
  resolveVelaRelationshipType,
} from "@galaxia/vela";

/**
 * Cross-surface wiring for the working (professional) Compare frames. The
 * copy and the derivation rules are unit-tested in
 * `packages/astro/test/professional-frames.test.ts`; this file proves the two
 * Compare surfaces and the Vela handoff actually carry them, and that adding
 * three frames did not open a romantic path anywhere a minor can be present.
 */

const REPO_ROOT = join(__dirname, "..", "..", "..");
const WEB_COMPARE = "apps/web/app/app/compare/page.tsx";
const MOBILE_COMPARE = "apps/mobile/app/(app)/(tabs)/compare.tsx";
const OG_ROUTE = "apps/web/app/s/[token]/opengraph-image.tsx";
const read = (path: string) => readFileSync(join(REPO_ROOT, path), "utf8");

const PRO: RelationType[] = [...PROFESSIONAL_RELATION_TYPES];
const NOW = new Date("2026-07-11T00:00:00.000Z");

describe("the picker shows a human label, never the raw relationship identifier", () => {
  it("every selectable frame has a label that is not its identifier", () => {
    for (const relType of COMPARE_RELATION_TYPES) {
      const label = compareRelationLabel(relType);
      expect(label, relType).toBe(COMPARE_RELATION_LABEL[relType]);
      expect(label.length, relType).toBeGreaterThan(0);
      expect(label, relType).not.toContain("-");
      expect(label[0], relType).toBe(label[0]!.toUpperCase());
    }
    // The frames that would have printed as raw kebab-case identifiers.
    expect(compareRelationLabel("manager-report")).toBe("Manager and report");
    expect(compareRelationLabel("mentor-mentee")).toBe("Mentor and mentee");
    expect(compareRelationLabel("parent-child")).toBe("Parent and child");
  });

  it("both Compare surfaces render pills through the shared label helper", () => {
    for (const path of [WEB_COMPARE, MOBILE_COMPARE]) {
      const src = read(path);
      expect(src, path).toContain("compareRelationLabel");
      // No surface may print the relType straight into the pill again.
      expect(src, path).not.toMatch(/>\s*\{type\}\s*</);
    }
  });

  it("both Compare surfaces pass the professional flag into the generational section", () => {
    for (const path of [WEB_COMPARE, MOBILE_COMPARE]) {
      const src = read(path);
      expect(src, path).toContain("professional={isProfessionalRelation(relationType)}");
    }
  });

  it("the OG share card labels every frame, including the working ones", () => {
    const src = read(OG_ROUTE);
    expect(src).toMatch(/colleagues:\s*"COLLEAGUES"/);
    expect(src).toMatch(/"manager-report":\s*"MANAGER & REPORT"/);
    expect(src).toMatch(/"mentor-mentee":\s*"MENTOR & MENTEE"/);
  });
});

describe("a recorded working relationship preselects the working frame on both surfaces", () => {
  /** The two effects both Compare pages run, in page order. */
  function frameForPair(
    tagA: string | null,
    tagB: string | null,
    pairHasMinor: boolean,
    userChose: RelationType | null = null
  ): RelationType {
    const suggested = suggestCompareRelationType(tagA, tagB);
    let relationType = userChose ?? suggested ?? defaultCompareRelationType(false);
    if (pairHasMinor) {
      if (isRomanticRelation(relationType)) return defaultCompareRelationType(true);
      if (!userChose) {
        relationType = suggested && !isRomanticRelation(suggested) ? suggested : defaultCompareRelationType(true);
      }
    }
    return relationType;
  }

  it("a saved colleague, coworker, boss, or professor lands on a working frame", () => {
    expect(frameForPair("self", "colleague", false)).toBe("colleagues");
    expect(frameForPair("self", "coworker", false)).toBe("colleagues");
    expect(frameForPair("self", "boss", false)).toBe("manager-report");
    expect(frameForPair("self", "manager", false)).toBe("manager-report");
    expect(frameForPair("self", "professor", false)).toBe("mentor-mentee");
    expect(frameForPair("self", "mentor", false)).toBe("mentor-mentee");
    // The point of the branch: none of these silently reads as a friendship.
    for (const tag of ["colleague", "coworker", "boss", "manager", "professor", "mentor"]) {
      const frame = frameForPair("self", tag, false);
      expect(isProfessionalRelation(frame), tag).toBe(true);
      expect(frame, tag).not.toBe("friends");
    }
  });

  it("the user override still wins over the suggestion", () => {
    expect(frameForPair("self", "colleague", false, "friends")).toBe("friends");
    expect(frameForPair("self", "colleague", false, "siblings")).toBe("siblings");
  });

  it("a minor keeps the recorded teaching frame instead of being reframed as a parent", () => {
    // A professor or mentor of a minor is the case Phase 3 calls out.
    const child = { isMinor: true, birthDate: "2013-04-02", birthPrecision: "exact" as const };
    const adult = { isMinor: false, birthDate: "1979-01-30", birthPrecision: "exact" as const };
    const pairHasMinor = isMinorForSafety(child, NOW) || isMinorForSafety(adult, NOW);
    expect(pairHasMinor).toBe(true);

    for (const [tag, expected] of [
      ["professor", "mentor-mentee"],
      ["mentor", "mentor-mentee"],
      ["colleague", "colleagues"],
      ["boss", "manager-report"],
    ] as const) {
      const frame = frameForPair("self", tag, pairHasMinor);
      expect(frame, tag).toBe(expected);
      expect(isRomanticRelation(frame), tag).toBe(false);
    }
    // Nothing recorded still falls to the age-appropriate default.
    expect(frameForPair(null, null, pairHasMinor)).toBe("parent-child");
    // A romantic suggestion is still clamped, unchanged.
    expect(frameForPair("self", "partner", pairHasMinor)).toBe("parent-child");
  });

  it("both surfaces keep a non-romantic suggestion through the minor branch", () => {
    for (const path of [WEB_COMPARE, MOBILE_COMPARE]) {
      const src = read(path);
      expect(src, path).toMatch(/suggestedRelationType && !isRomanticRelation\(suggestedRelationType\)/);
      expect(src, path).toContain("defaultCompareRelationType(true)");
    }
  });
});

describe("PHASE 3: the Vela handoff cannot romanticise a working frame", () => {
  it("passes a working frame straight through for an adults-only scope", () => {
    for (const relType of PRO) {
      expect(resolveVelaRelationshipType(relType, false), relType).toBe(relType);
    }
  });

  it("coerces every working frame to the neutral 'general' when a minor is in scope", () => {
    // Deliberate: the working frames are NOT added to Vela's minor allowlist.
    // Coercing to "general" is the safe outcome (no romantic framing, and no
    // personal frame applied to a working relationship either), and it keeps
    // this package's allowlist identical to the `vela-chat` edge function's
    // copy, which `safe-relationship-types-parity.test.ts` pins.
    for (const relType of PRO) {
      const resolved = resolveVelaRelationshipType(relType, true);
      expect(resolved, relType).toBe("general");
      expect(SAFE_VELA_RELATIONSHIP_TYPES_WITH_MINOR, relType).toContain(resolved);
      expect(isRomanticRelation(resolved as RelationType), relType).toBe(false);
    }
  });

  it("no selectable frame resolves to a romantic label for a minor scope", () => {
    for (const relType of availableCompareRelationTypes(true)) {
      const resolved = resolveVelaRelationshipType(relType, true);
      expect(SAFE_VELA_RELATIONSHIP_TYPES_WITH_MINOR, relType).toContain(resolved);
    }
  });
});

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readyMembersForCohortOverlay } from "@galaxia/core";

const groupsSrc = readFileSync(join(__dirname, "../../app/(app)/groups.tsx"), "utf8");

describe("mobile Groups overlay guard", () => {
  it("buildOverlay goes through readyMembersForCohortOverlay before cohortOverlay", () => {
    expect(groupsSrc).toContain("readyMembersForCohortOverlay");
    expect(groupsSrc).toContain("cohortOverlay(");
    const readyIdx = groupsSrc.indexOf("readyMembersForCohortOverlay");
    const overlayIdx = groupsSrc.indexOf("const overlay = cohortOverlay");
    expect(readyIdx).toBeGreaterThan(-1);
    expect(overlayIdx).toBeGreaterThan(readyIdx);
  });

  it("does not wrap cohortOverlay in try/catch", () => {
    // Control-flow guard only — empty input must be unreachable, not caught.
    expect(groupsSrc).not.toMatch(/try\s*\{[\s\S]*?cohortOverlay\s*\(/);
  });

  it("readyMembersForCohortOverlay rejects empty input (runtime)", () => {
    expect(readyMembersForCohortOverlay([])).toBeNull();
  });
});

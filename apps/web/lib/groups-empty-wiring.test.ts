import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("source wiring — Groups empty example", () => {
  it("renders the empty state from computed example data, never user rows", () => {
    const page = readFileSync(resolve(__dirname, "../app/app/groups/page.tsx"), "utf8");
    const empty = readFileSync(resolve(__dirname, "../components/groups/groups-empty-state.tsx"), "utf8");
    const example = readFileSync(resolve(__dirname, "./groups-example.ts"), "utf8");

    expect(page).toContain("GroupsEmptyState");
    expect(page).toContain("buildFromExistingPeople");
    expect(page).toContain("isExampleId");
    expect(page).toContain("GROUPS_EXAMPLE_CANNOT_SAVE");
    expect(page).toContain("GROUPS_EMPTY_PREFILL_MAX");
    expect(page).toContain("showEmptyLanding");
    expect(page).not.toContain("exampleGroupReading");
    expect(page).not.toContain("Build your first group");
    expect(page).not.toContain("autoOpenEmptyRef");

    expect(empty).toContain("exampleGroupReading");
    expect(empty).not.toContain("buildExampleGroupReading");
    expect(empty).toContain("GROUPS_EXAMPLE_NOTICE");
    expect(empty).toContain("EMPTY_STATE_WELCOME_HREF");
    expect(empty).toContain("allowShare={false}");
    expect(empty).toContain("resolvePairPersonId={() => null}");
    expect(empty).toContain("groupsEmptyPrefillPeople");

    expect(example).toContain("computeNatalChart");
    expect(example).toContain("cohortOverlay");
    expect(example).toContain("EXAMPLE_ID_PREFIX");
    expect(example).toContain("groups-example-reading.json");
    expect(example).not.toMatch(/from\("people"\)|from\("groups"\)|from\("charts"\)/);
  });
});

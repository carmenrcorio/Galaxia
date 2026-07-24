import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { SAFE_VELA_RELATIONSHIP_TYPES_WITH_MINOR } from "../src/index";

/**
 * Edge cannot import the workspace, so it mirrors the allowlist by hand.
 * This test reads the edge source as text and fails CI if the arrays diverge.
 */
function extractEdgeSafeRelationshipTypes(): string[] {
  const edgePath = resolve(
    __dirname,
    "../../../supabase/functions/vela-chat/index.ts"
  );
  const src = readFileSync(edgePath, "utf8");
  const match = src.match(
    /const SAFE_VELA_RELATIONSHIP_TYPES_WITH_MINOR = \[([\s\S]*?)\] as const;/
  );
  if (!match) {
    throw new Error(
      "Could not find SAFE_VELA_RELATIONSHIP_TYPES_WITH_MINOR in vela-chat/index.ts"
    );
  }
  const literals = [...match[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  if (literals.length === 0) {
    throw new Error("SAFE_VELA_RELATIONSHIP_TYPES_WITH_MINOR array was empty in edge source");
  }
  return literals;
}

describe("SAFE_VELA_RELATIONSHIP_TYPES_WITH_MINOR parity (workspace ↔ edge)", () => {
  it("edge mirror deep-equals the exported workspace constant", () => {
    expect(extractEdgeSafeRelationshipTypes()).toEqual([
      ...SAFE_VELA_RELATIONSHIP_TYPES_WITH_MINOR
    ]);
  });

  it("includes grandparent and grandchild", () => {
    expect(SAFE_VELA_RELATIONSHIP_TYPES_WITH_MINOR).toContain("grandparent");
    expect(SAFE_VELA_RELATIONSHIP_TYPES_WITH_MINOR).toContain("grandchild");
  });
});

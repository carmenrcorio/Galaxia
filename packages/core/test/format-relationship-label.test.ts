import { describe, expect, it } from "vitest";
import { formatRelationshipLabel } from "../src/index";

describe("formatRelationshipLabel", () => {
  it("renders stored relationship labels in lowercase", () => {
    expect(formatRelationshipLabel("Daughter")).toBe("daughter");
    expect(formatRelationshipLabel("Cousin")).toBe("cousin");
    expect(formatRelationshipLabel("partner")).toBe("partner");
    expect(formatRelationshipLabel("friend")).toBe("friend");
    expect(formatRelationshipLabel("In-law")).toBe("in-law");
  });
});

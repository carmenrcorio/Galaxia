import { describe, expect, it } from "vitest";
import {
  ADD_PERSON_PATH,
  COMPARE_PATH,
  compareAddPersonHref,
  comparePathAfterAddPerson,
  emptyCompareSlot
} from "./compare-add-person";

describe("emptyCompareSlot", () => {
  it("fills Person A when A is empty, otherwise Person B", () => {
    expect(emptyCompareSlot(null, null)).toBe("a");
    expect(emptyCompareSlot(null, "b-id")).toBe("a");
    expect(emptyCompareSlot("a-id", null)).toBe("b");
    expect(emptyCompareSlot("a-id", "b-id")).toBe("b");
  });
});

describe("compareAddPersonHref", () => {
  it("routes to /app/add-person with a Compare return, not a second form", () => {
    const href = compareAddPersonHref({
      personAId: "self-1",
      personBId: null,
      fillSlot: "b"
    });
    expect(href.startsWith(`${ADD_PERSON_PATH}?`)).toBe(true);
    const params = new URLSearchParams(href.slice(ADD_PERSON_PATH.length + 1));
    expect(params.get("next")).toBe(COMPARE_PATH);
    expect(params.get("slot")).toBe("b");
    expect(params.get("a")).toBe("self-1");
    expect(params.get("b")).toBeNull();
  });
});

describe("comparePathAfterAddPerson", () => {
  it("puts the new person in the empty slot and keeps the other selection", () => {
    expect(
      comparePathAfterAddPerson({
        next: COMPARE_PATH,
        slot: "b",
        personAId: "self-1",
        personBId: null,
        newPersonId: "new-9"
      })
    ).toBe("/app/compare?a=self-1&b=new-9");
  });

  it("fills Person A when that slot was empty", () => {
    expect(
      comparePathAfterAddPerson({
        next: COMPARE_PATH,
        slot: "a",
        personAId: null,
        personBId: "b-1",
        newPersonId: "new-9"
      })
    ).toBe("/app/compare?a=new-9&b=b-1");
  });

  it("does not follow an unsafe next", () => {
    expect(
      comparePathAfterAddPerson({
        next: "https://evil.com",
        slot: "b",
        personAId: "self-1",
        personBId: null,
        newPersonId: "new-9"
      })
    ).toBeNull();
    expect(
      comparePathAfterAddPerson({
        next: "/app/compare-not",
        slot: "b",
        personAId: "self-1",
        personBId: null,
        newPersonId: "new-9"
      })
    ).toBeNull();
  });

  it("returns null when this was not a Compare hand-off", () => {
    expect(
      comparePathAfterAddPerson({
        next: null,
        slot: "b",
        personAId: null,
        personBId: null,
        newPersonId: "new-9"
      })
    ).toBeNull();
  });
});

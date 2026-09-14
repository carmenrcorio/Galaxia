import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("source wiring: The Moment reuses notes and never fabricates a sky", () => {
  it("home and person profile both enter the same flow", () => {
    const home = readFileSync(resolve(__dirname, "../app/app/page.tsx"), "utf8");
    const person = readFileSync(resolve(__dirname, "../app/app/person/[id]/page.tsx"), "utf8");
    expect(home).toContain("CAPTURE_MOMENT_HREF");
    expect(home).toContain("CAPTURE_MOMENT");
    expect(person).toContain("captureMomentHref(person.id)");
    expect(person).toContain("CAPTURE_MOMENT");
    expect(person).toContain("personName={person.display_name}");
  });

  it("the flow page attaches a stored snapshot and a deterministic reflection, not an LLM", () => {
    const src = readFileSync(resolve(__dirname, "../app/app/moment/page.tsx"), "utf8");
    expect(src).toContain("captureMomentSnapshot(");
    expect(src).toContain("reflectMoment(");
    expect(src).toContain("saveMoment(");
    expect(src).toContain("pinMomentReflection(");
    expect(src).not.toContain("vela-chat");
    expect(src).not.toContain("ANTHROPIC");
  });

  it("saveMoment writes kind moment with owner_id, tags, and transit_snapshot", () => {
    const src = readFileSync(resolve(__dirname, "./record.ts"), "utf8");
    expect(src).toContain('kind: "moment"');
    expect(src).toContain("transit_snapshot: input.snapshot");
    expect(src).toContain("owner_id: input.ownerId");
    expect(src).toContain("about_person: input.personId");
    expect(src).toContain('kind: "vela_pin"');
    expect(src).toContain("suggestPinTheme(input.reflection)");
    expect(src).toContain('.eq("owner_id", ownerId)');
    expect(src).not.toContain("drop policy");
  });
});

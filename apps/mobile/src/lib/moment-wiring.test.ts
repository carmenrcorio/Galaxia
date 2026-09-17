import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("mobile The Moment wiring", () => {
  it("home and person profile enter /moment, and the screen stores a snapshot", () => {
    const home = readFileSync(resolve(__dirname, "../../app/(app)/(tabs)/home.tsx"), "utf8");
    const profile = readFileSync(resolve(__dirname, "../../app/(app)/profile/[personId].tsx"), "utf8");
    const moment = readFileSync(resolve(__dirname, "../../app/(app)/moment.tsx"), "utf8");
    expect(home).toContain('href="/moment"');
    expect(profile).toContain('pathname: "/moment"');
    expect(moment).toContain('kind: "moment"');
    expect(moment).toContain("transit_snapshot: snapshot");
    expect(moment).toContain("captureMomentSnapshot(");
    expect(moment).toContain("reflectMoment(");
    expect(moment).toContain('kind: "vela_pin"');
    expect(moment).not.toContain("ANTHROPIC");
  });
});

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = join(__dirname, "..", "..", "..");

function read(path: string): string {
  return readFileSync(join(REPO_ROOT, path), "utf8");
}

const DUPLICATE_HEADLINE = "This connection spans different eras. The generational layer is the headline.";

describe("/app/compare mounts the shared GenerationalSection", () => {
  it("uses the same GenerationalSection invocation as /chart/compare", () => {
    const appCompare = read("apps/web/app/app/compare/page.tsx");
    const quickCompare = read("apps/web/app/chart/compare/page.tsx");
    const share = read("apps/web/components/share-snapshot-view.tsx");

    expect(appCompare).toContain('from "../../../components/generational-section"');
    expect(appCompare).toContain("<GenerationalSection generational={result.generational} professional={isProfessionalRelation(relationType)} />");

    expect(quickCompare).toContain("<GenerationalSection generational={result.generational} />");
    expect(share).toContain("professional={isProfessionalRelation(relationType)}");
  });

  it("does not keep the compact Fault-line call-out or ancestralHeadline duplicate", () => {
    const src = read("apps/web/app/app/compare/page.tsx");
    expect(src).not.toContain("ancestralHeadline");
    expect(src).not.toContain(DUPLICATE_HEADLINE);
    expect(src).not.toContain("Fault line:");
    expect(src).not.toContain("Shared sky:");
  });
});

describe("mobile Compare mounts its native GenerationalSection", () => {
  it("no longer constructs or renders the duplicate era headline", () => {
    const src = read("apps/mobile/app/(app)/compare.tsx");
    expect(src).not.toContain("ancestralHeadline");
    expect(src).not.toContain(DUPLICATE_HEADLINE);
  });

  it("mounts the native GenerationalSection, wired to the shared curated lookup", () => {
    const src = read("apps/mobile/app/(app)/compare.tsx");
    expect(src).toContain('from "../../src/components/generational-section"');
    expect(src).toContain("<GenerationalSection");
    expect(src).toContain("professional={isProfessionalRelation(relationType)}");

    const section = read("apps/mobile/src/components/generational-section.tsx");
    expect(section).toContain('from "../lib/generational-callout"');
    expect(section).toContain("buildGenerationalCallout");

    const callout = read("apps/mobile/src/lib/generational-callout.ts");
    expect(callout).toContain("genFrame");
    expect(callout).toContain("genPlacement");
    expect(callout).toContain("generationalLeadForPair");
  });
});

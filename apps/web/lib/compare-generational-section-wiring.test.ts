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
    expect(appCompare).toContain("<GenerationalSection generational={result.generational} />");

    expect(quickCompare).toContain("<GenerationalSection generational={result.generational} />");
    expect(share).toContain("<GenerationalSection generational={payload.generational} />");
  });

  it("does not keep the compact Fault-line call-out or ancestralHeadline duplicate", () => {
    const src = read("apps/web/app/app/compare/page.tsx");
    expect(src).not.toContain("ancestralHeadline");
    expect(src).not.toContain(DUPLICATE_HEADLINE);
    expect(src).not.toContain("Fault line:");
    expect(src).not.toContain("Shared sky:");
  });
});

describe("mobile Compare drops the ancestralHeadline duplicate", () => {
  it("no longer constructs or renders the duplicate era headline", () => {
    const src = read("apps/mobile/app/(app)/compare.tsx");
    expect(src).not.toContain("ancestralHeadline");
    expect(src).not.toContain(DUPLICATE_HEADLINE);
  });

  it("does not yet have a native GenerationalSection (deferred port)", () => {
    const src = read("apps/mobile/app/(app)/compare.tsx");
    expect(src).not.toContain("GenerationalSection");
    expect(src).not.toContain("genFrame");
    expect(src).not.toContain("genPlacement");
    expect(src).not.toContain("genHeadline");
  });
});

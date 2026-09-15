import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..", "..", "..");

function read(path: string): string {
  return readFileSync(join(ROOT, path), "utf8");
}

describe("person creation is one path", () => {
  it("onboarding and /app/add-person both persist through persistPerson", () => {
    const form = read("apps/web/components/add-person-form.tsx");
    const firstRun = read("apps/web/components/first-run-flow.tsx");
    const persist = read("apps/web/lib/persist-person.ts");
    expect(form).toContain("persistPerson");
    expect(firstRun).toContain("persistPerson");
    expect(persist).toContain("createPerson");
    expect(persist).not.toMatch(/from\("people"\)/);
  });

  it("Quick Chart save and Quick Check persist through persistPerson, not their own insert", () => {
    const save = read("apps/web/components/save-to-galaxy-button.tsx");
    const quick = read("apps/web/components/quick-check-modal.tsx");
    expect(save).toContain("persistPerson");
    expect(quick).toContain("persistPerson");
    expect(save).not.toMatch(/from\("people"\)\.insert/);
    expect(quick).not.toMatch(/from\("people"\)\.insert/);
  });

  it("mobile onboarding persists through the same createPerson helper", () => {
    const onboarding = read("apps/mobile/app/(app)/onboarding.tsx");
    const persist = read("apps/mobile/src/lib/persist-person.ts");
    expect(onboarding).toContain("persistPerson");
    expect(persist).toContain("createPerson");
    expect(onboarding).not.toMatch(/from\("people"\)\.insert/);
  });

  it("web and mobile persistPerson pass the same fields to createPerson", () => {
    const web = read("apps/web/lib/persist-person.ts");
    const mobile = read("apps/mobile/src/lib/persist-person.ts");
    const sliceCall = (src: string) => {
      const start = src.indexOf("await createPerson");
      const end = src.indexOf("});", start);
      return src.slice(start, end + 3).replace(/\s+/g, " ");
    };
    expect(sliceCall(web)).toBe(sliceCall(mobile));
  });
});

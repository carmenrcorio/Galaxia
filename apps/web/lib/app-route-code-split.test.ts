import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const web = (rel: string) => readFileSync(join(__dirname, "..", rel), "utf8");

describe("app route code-splitting (INP / first-load JS)", () => {
  it("person and vela routes dynamic-import their heavy client modules", () => {
    const personRoute = web("app/app/person/[id]/page.tsx");
    const velaRoute = web("app/app/vela/page.tsx");
    expect(personRoute).toContain('import("./person-profile-page")');
    expect(velaRoute).toContain('import("./vela-chat-page")');
    expect(personRoute).toContain("app-content--loading");
    expect(velaRoute).toContain("app-content--loading");
  });

  it("person profile defers tab panels and group switches with transitions", () => {
    const page = web("app/app/person/[id]/person-profile-page.tsx");
    expect(page).toContain("useTransition");
    expect(page).toContain("mountedGroups");
    expect(page).toContain("dynamic(");
    expect(page).toContain("edit-person-panel");
  });

  it("vela chat marks mode/scope toggles as transitions", () => {
    const page = web("app/app/vela/vela-chat-page.tsx");
    expect(page).toContain("useTransition");
    expect(page).toContain("startUiTransition");
  });
});

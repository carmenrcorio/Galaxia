import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = join(__dirname, "..", "..", "..");
const read = (path: string) => readFileSync(join(REPO_ROOT, path), "utf8");
const WEB_VELA = "apps/web/app/app/vela/page.tsx";

describe("Vela selection UI uses shared picker slots", () => {
  it("loads relation on people and maps through velaPeople / velaGroups", () => {
    const src = read(WEB_VELA);
    expect(src).toContain('select("id, display_name, relation, is_minor, birth_date, birth_precision, passed_at")');
    expect(src).toContain("toVelaPeople");
    expect(src).toContain("toVelaGroups");
    expect(src).toContain("velaPeople");
    expect(src).toContain("velaGroups");
    expect(src).toContain("group_members");
  });

  it("seeds slot A via velaDefaultSubjectId and does not fill pairId on a fresh session", () => {
    const src = read(WEB_VELA);
    expect(src).toContain("velaDefaultSubjectId");
    expect(src).toContain("subjectSeededRef");
    expect(src).not.toMatch(/if \(allPeople\[1\]\) setPairId/);
    expect(src).not.toMatch(/setPairId\(allPeople/);
  });

  it("renders PersonPickerField / GroupPickerField slots, not chip maps or a native group select", () => {
    const src = read(WEB_VELA);
    expect(src).toContain("VelaFocusPickers");
    expect(src).not.toContain("group-member-chip");
    expect(src).not.toMatch(/people\.map\(/);
    expect(src).not.toMatch(/<select className="field"/);
  });
});

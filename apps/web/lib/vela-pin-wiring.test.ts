import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("source wiring: pinned Vela insights stay owner-only and the pin control stays put", () => {
  it("person page loads the person's pins, mounts search/group UI, and keeps Ask Vela more", () => {
    const src = readFileSync(
      resolve(__dirname, "../app/app/person/[id]/page.tsx"),
      "utf8"
    );
    expect(src).toContain("VelaPinsPanel");
    expect(src).toContain("fetchVelaPins(supabase, uid, actualId, 200)");
    expect(src).toContain("fetchVelaPins(supabase, userId, person.id, 200, { q })");
    expect(src).toContain("updateNoteTheme");
    expect(src).toContain("savePinTheme");
    expect(src).toContain("Ask Vela more");
    expect(src).not.toContain("fetchVelaPins(supabase, uid, actualId, 2)");
  });

  it("Vela pin control still lives on the answer bubble and still writes kind vela_pin", () => {
    const src = readFileSync(
      resolve(__dirname, "../app/app/vela/page.tsx"),
      "utf8"
    );
    expect(src).toContain("＋ Pin to record");
    expect(src).toContain("✓ Pinned to their record");
    expect(src).toContain('kind: "vela_pin"');
    expect(src).toContain("suggestPinTheme(text)");
    expect(src).toContain("PinThemePicker");
    expect(src).toContain("onClick={() => void pinInsight(idx, line.text)}");
  });

  it("fetchVelaPins and theme writes always filter by owner_id", () => {
    const src = readFileSync(resolve(__dirname, "./record.ts"), "utf8");
    expect(src).toContain('.eq("owner_id", ownerId)');
    expect(src).toContain('.eq("kind", "vela_pin")');
    expect(src).toContain("update({ theme: sanitizePinTheme(theme) })");
    expect(src).toContain('textSearch("body", fts, { type: "plain", config: "english" })');
    expect(src).not.toContain("drop policy");
  });
});

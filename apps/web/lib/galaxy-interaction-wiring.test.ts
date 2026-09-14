import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = join(__dirname, "..", "..", "..");
const home = readFileSync(join(REPO_ROOT, "apps/web/app/app/page.tsx"), "utf8");
const settings = readFileSync(join(REPO_ROOT, "apps/web/lib/ui-settings.ts"), "utf8");
const migration = readFileSync(
  join(REPO_ROOT, "supabase/migrations/20260914150000_people_custom_position.sql"),
  "utf8",
);
const editPanel = readFileSync(join(REPO_ROOT, "apps/web/components/edit-person-panel.tsx"), "utf8");
const mobileHome = readFileSync(join(REPO_ROOT, "apps/mobile/app/(app)/home.tsx"), "utf8");

describe("galaxy interaction — rings toggle + custom_position", () => {
  it("persists the rings pref through ui-settings, not a new hook", () => {
    expect(settings).toContain('export const SETTING_SHOW_RINGS = "showRings"');
    expect(home).toContain("SETTING_SHOW_RINGS");
    expect(home).toContain("showRingsRef");
    expect(home).toContain("Hide orbital rings");
    expect(home).toContain("if (showRingsRef.current)");
    expect(home).not.toContain("useLocalStorage");
  });

  it("share-image paintFrame reads the same showRingsRef as the live loop", () => {
    expect(home).toContain("galaxyCaptureRef");
    expect(home).toContain("paintFrame");
    expect(home).toContain("if (showRingsRef.current)");
  });

  it("writes custom_position with owner_id, never user_id", () => {
    expect(migration).toContain("add column if not exists custom_position jsonb");
    expect(migration).toContain("people_custom_position_shape");
    expect(migration).not.toContain("create policy");
    expect(home).toContain('.eq("owner_id", owner)');
    expect(home).toMatch(/update\(\s*\{\s*custom_position/);
    expect(home).not.toMatch(/custom_position[\s\S]{0,400}\.eq\(['"]user_id['"]/);
    expect(editPanel).toContain('.eq("owner_id", userId)');
    expect(editPanel).toContain("custom_position: null");
    expect(editPanel).toContain("Reset position");
  });

  it("does not ship drag debug logs", () => {
    expect(home).not.toContain("[DRAG]");
    expect(home).not.toContain("console.log");
  });

  it("mobile home selects and applies custom_position", () => {
    expect(mobileHome).toContain("custom_position");
    expect(mobileHome).toContain("effectiveSeat");
  });

  it("skips self for drag and freezes drift on custom seats", () => {
    expect(home).toContain("if (!hit || hit.is_self) return");
    expect(home).toContain("overlay.custom_position) return base");
  });
});

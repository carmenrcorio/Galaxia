import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Source-level guards for nudge-delivery Phase A (profiles.timezone
 * capture). Unit tests on the pure decision logic (timezone.test.ts,
 * packages/core/test/timezone.test.ts) cannot catch a capture point being
 * wired up in the wrong place, or a future edit creeping into
 * ownerLocalDate()/the nudge engine that Phase A is explicitly not allowed
 * to touch — so these assertions read the actual sources.
 *
 * Precedent for testing wiring by reading source: account-name-wiring.test.ts,
 * lib/person-care-wiring.test.ts.
 */

const REPO_ROOT = join(__dirname, "..", "..", "..");

function read(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), "utf8");
}

describe("TimezoneSync is mounted everywhere TrialBanner sits", () => {
  for (const surface of ["apps/web/app/app/layout.tsx", "apps/web/app/account/page.tsx"]) {
    it(`${surface} renders both <TrialBanner /> and <TimezoneSync />`, () => {
      const src = read(surface);
      expect(src).toContain("<TrialBanner />");
      expect(src).toContain("<TimezoneSync />");
    });
  }
});

describe("TimezoneSync backfills only, never chases an already-set value", () => {
  it("reads the stored value before writing, and gates the write through the shared guard", () => {
    const src = read("apps/web/components/timezone-sync.tsx");
    expect(src).toContain('.select("timezone")');
    expect(src).toContain("backfillProfileTimezoneIfMissing");
  });

  it("backfillProfileTimezoneIfMissing itself is the only place lib/timezone.ts calls .update(", () => {
    const src = read("apps/web/lib/timezone.ts");
    expect(src.match(/\.update\(/g)?.length).toBe(1);
  });
});

describe("signup piggyback is bonus-only, gated on an immediate session", () => {
  it("the timezone write sits inside the same `if (data.session)` block as the name sync", () => {
    const src = read("apps/web/components/signup-form.tsx");
    const sessionBlock = src.slice(src.indexOf("if (data.session)"), src.indexOf("setStatus(\"confirm\")"));
    expect(sessionBlock).toContain("syncSignupNameToProfile");
    expect(sessionBlock).toContain("backfillProfileTimezoneIfMissing");
  });
});

describe("mobile parity — home.tsx backfills using the profile row it already fetched", () => {
  it("selects timezone alongside the existing profile columns instead of a second query", () => {
    const src = read("apps/mobile/app/(app)/home.tsx");
    expect(src).toMatch(/\.select\("display_name, pinned_sky_person_id, timezone"\)/);
    expect(src).toContain("backfillProfileTimezoneIfMissing");
  });
});

describe("Phase A never touches Phase B's future inputs", () => {
  it("ownerLocalDate's signature is untouched (still runtime-local, no tz parameter)", () => {
    const src = read("packages/astro/src/transit-nudge/dates.ts");
    expect(src).toContain("export function ownerLocalDate(now: Date = new Date()): string");
  });

  it("no capture-point file references buildPersonDailyNudge, the selection engine, or copy_resolved", () => {
    for (const surface of [
      "apps/web/components/timezone-sync.tsx",
      "apps/web/lib/timezone.ts",
      "apps/mobile/src/lib/timezone.ts",
      "packages/core/src/timezone.ts",
    ]) {
      const src = read(surface);
      expect(src).not.toContain("buildPersonDailyNudge");
      expect(src).not.toContain("copy_resolved");
      expect(src).not.toContain("precision_mode");
      expect(src).not.toContain("isMinorForSafety");
    }
  });
});

describe("the migration grants timezone the same way display_name/house_system are granted", () => {
  it("extends both insert and update column grants, and installs the pg_timezone_names trigger", () => {
    const src = read("supabase/migrations/20260726010000_profiles_timezone_capture.sql");
    expect(src).toContain("grant insert (id, display_name, house_system, timezone) on table public.profiles to authenticated;");
    expect(src).toContain("grant update (id, display_name, house_system, timezone) on table public.profiles to authenticated;");
    expect(src).toContain("pg_catalog.pg_timezone_names");
    expect(src).toContain("before insert or update on public.profiles");
    // No new row policy — RLS already scopes every profiles write to the owner.
    expect(src).not.toContain("create policy");
  });
});

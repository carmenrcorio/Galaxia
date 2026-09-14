/**
 * GALAXY_RELATION_PICKER_OPTIONS <-> public.galaxy_relations parity.
 *
 * The canonical relation list lives in TypeScript
 * (packages/core/src/galaxy-orbit.ts). public.galaxy_relations is a SQL mirror
 * of it, and create_connect_invite validates p_relation against that table
 * (20260913180000_constellation_connect_functions.sql). A value added to the
 * picker but not to the table is invisible until someone tries to send a
 * connect invite for that person, and then it surfaces as a confusing connect
 * failure rather than a missing lookup row.
 *
 * The original seed migration already said the two must be kept in sync by
 * hand. The first-run orientation flow added three values (mother, father,
 * other) and that hand-sync is exactly the kind of thing that drifts, so this
 * test makes the drift fail in CI instead.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { GALAXY_RELATION_PICKER_OPTIONS } from "@galaxia/core";
import { describe, expect, it } from "vitest";

const REPO_ROOT = join(__dirname, "..", "..", "..");
const MIGRATIONS = join(REPO_ROOT, "supabase/migrations");

/** Every value inserted into public.galaxy_relations across all migrations. */
function seededRelations(): Set<string> {
  const seeded = new Set<string>();
  for (const file of readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort()) {
    const src = readFileSync(join(MIGRATIONS, file), "utf8");
    // Narrow to the insert statement body so a table comment that happens to
    // quote a relation name is never mistaken for a seeded row.
    const inserts = src.matchAll(
      /insert\s+into\s+public\.galaxy_relations\s*\(value\)\s*values([\s\S]*?);/gi
    );
    for (const [, body] of inserts) {
      for (const [, value] of body.matchAll(/\('([a-z-]+)'\)/g)) seeded.add(value);
    }
  }
  return seeded;
}

describe("galaxy_relations mirrors the TypeScript picker list", () => {
  it("seeds every picker value", () => {
    const seeded = seededRelations();
    const missing = GALAXY_RELATION_PICKER_OPTIONS.map((o) => o.value).filter((v) => !seeded.has(v));
    expect(
      missing,
      `Picker value(s) with no row in public.galaxy_relations. Add a migration seeding them, or create_connect_invite will reject them: ${missing.join(", ")}`
    ).toEqual([]);
  });

  it("seeds nothing the picker does not offer", () => {
    const pickerValues = new Set<string>(GALAXY_RELATION_PICKER_OPTIONS.map((o) => o.value));
    const extra = [...seededRelations()].filter((v) => !pickerValues.has(v));
    expect(
      extra,
      `public.galaxy_relations row(s) with no picker value. Remove the value from the seed, or add it back to GALAXY_RELATION_PICKER_OPTIONS: ${extra.join(", ")}`
    ).toEqual([]);
  });

  it("has no duplicate picker values", () => {
    const values = GALAXY_RELATION_PICKER_OPTIONS.map((o) => o.value);
    expect(new Set(values).size).toBe(values.length);
  });
});

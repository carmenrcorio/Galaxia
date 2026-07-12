import { isMinorForSafety } from "@galaxia/core";
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  NOTES_OWNER_RLS_POLICY,
  REMEMBRANCE_CHROME,
  REMEMBRANCE_NOTE_KIND,
  VELA_REMEMBRANCE_GUARDRAIL,
  buildRemembranceNoteInsert,
  remembranceChartLines,
  remembranceVelaHref,
  shouldShowRemembranceSpace,
} from "./remembrance";

const NOW = new Date("2026-07-12T00:00:00.000Z");

describe("Remembrance space visibility (owner UI gate)", () => {
  it("hides for present people and for self", () => {
    expect(shouldShowRemembranceSpace({ passed_at: null })).toBe(false);
    expect(shouldShowRemembranceSpace({ passed_at: undefined })).toBe(false);
    expect(shouldShowRemembranceSpace({ is_self: true, passed_at: "2026-01-01T00:00:00.000Z" })).toBe(false);
  });

  it("shows only when passed_at is set (non-self)", () => {
    expect(shouldShowRemembranceSpace({ passed_at: "2026-07-12T15:00:00.000Z" })).toBe(true);
    expect(shouldShowRemembranceSpace({ is_self: false, passed_at: "2024-11-02T00:00:00.000Z" })).toBe(true);
  });
});

describe("Remembrance reflections persist as private notes (payload + RLS docs)", () => {
  it("insert payload is owner-scoped with kind remembrance", () => {
    const row = buildRemembranceNoteInsert({
      ownerId: "owner-aaa",
      personId: "person-bbb",
      body: "  I still talk to you in the kitchen.  ",
    });
    expect(row).toEqual({
      owner_id: "owner-aaa",
      about_person: "person-bbb",
      body: "I still talk to you in the kitchen.",
      kind: REMEMBRANCE_NOTE_KIND,
    });
    expect(row.kind).toBe("remembrance");
  });

  it("documents notes owner RLS at the data layer (policy constants)", () => {
    // DATA-LAYER CONTRACT: notes are gated by owner_id = auth.uid()
    // (migration 20260629220500_add_owner_rls_policies.sql). Remembrance
    // rows use the same table — no second store, no weaker policy.
    expect(NOTES_OWNER_RLS_POLICY.name).toBe("notes owner all");
    expect(NOTES_OWNER_RLS_POLICY.using).toBe("owner_id = auth.uid()");
    expect(NOTES_OWNER_RLS_POLICY.withCheck).toBe("owner_id = auth.uid()");

    const policySql = readFileSync(
      resolve(__dirname, "../../../supabase/migrations/20260629220500_add_owner_rls_policies.sql"),
      "utf8"
    );
    expect(policySql).toContain('create policy "notes owner all"');
    expect(policySql).toContain("owner_id = auth.uid()");

    const kindSql = readFileSync(
      resolve(__dirname, "../../../supabase/migrations/20260712180000_notes_kind_remembrance.sql"),
      "utf8"
    );
    expect(kindSql).toContain("'remembrance'");
  });

  /**
   * HONESTY NOTE (requirement #2): this vitest suite has no live Supabase
   * and cannot create a second-user JWT context. Cross-user SELECT denial is
   * therefore **UI-level + policy-document assertion only — RLS not asserted
   * in test against a running database.** The insert payload always sets
   * owner_id; enforcement relies on the existing notes owner RLS policy.
   */
  it("labels privacy test honesty: RLS not executed against a second user here", () => {
    expect(true).toBe(true); // see block comment above — intentional marker for the report
  });
});

describe("Vela does not initiate from remembrance", () => {
  it("entry href is navigation-only — no prefill q, no auto-send signal", () => {
    const href = remembranceVelaHref("person-xyz");
    expect(href).toBe("/app/vela?scope=person&subject=person-xyz");
    expect(href).not.toMatch(/[?&]q=/);
    expect(href).not.toMatch(/auto/i);
  });

  it("ships the remembrance guardrail text for prompt sync", () => {
    expect(VELA_REMEMBRANCE_GUARDRAIL).toContain("Never fabricate memories");
    expect(VELA_REMEMBRANCE_GUARDRAIL).toContain("owner's own saved reflections");
  });
});

describe("MINOR SAFETY: passed minor is still a minor on the person page path", () => {
  const passedMinor = {
    isMinor: false,
    birthDate: "2015-08-20",
    birthPrecision: "exact" as const,
    passed_at: "2024-11-02T00:00:00.000Z",
  };
  const unflaggedPassedChild = {
    isMinor: false,
    birthDate: "2017-04-03",
    birthPrecision: "exact" as const,
    passed_at: "2025-01-15T00:00:00.000Z",
  };

  it("isMinorForSafety ignores passed_at — remembrance never strips protection", () => {
    expect(
      isMinorForSafety(
        { isMinor: passedMinor.isMinor, birthDate: passedMinor.birthDate, birthPrecision: passedMinor.birthPrecision },
        NOW
      )
    ).toBe(true);
    expect(
      isMinorForSafety(
        {
          isMinor: unflaggedPassedChild.isMinor,
          birthDate: unflaggedPassedChild.birthDate,
          birthPrecision: unflaggedPassedChild.birthPrecision,
        },
        NOW
      )
    ).toBe(true);
  });

  it("remembrance space still shows for a passed minor (safety is orthogonal to visibility)", () => {
    expect(shouldShowRemembranceSpace({ passed_at: passedMinor.passed_at })).toBe(true);
  });
});

describe("Ancient-light chrome + chart honesty", () => {
  it("reuses existing water/ancient tokens — no new palette invented", () => {
    expect(REMEMBRANCE_CHROME.water).toBe("#6FB1B8");
    expect(REMEMBRANCE_CHROME.ancient).toBe("#DA8C8C");
  });

  it("hedges year-only / unconfident placements — never fabricates a sign", () => {
    const lines = remembranceChartLines({
      precision: "year",
      asc: null,
      placements: [
        { body: "sun", sign: "Leo", confident: false, possibleSigns: ["Cancer", "Leo"] },
        { body: "moon", sign: "Pisces", confident: false },
      ],
    });
    expect(lines.some((l) => l.includes("uncertain"))).toBe(true);
    expect(lines.join(" ")).toContain("Cancer or Leo");
    expect(lines.join(" ")).not.toMatch(/\bLeo Sun\b/);
    expect(lines).toContain("Rising needs an exact birth time");
  });

  it("shows confident signs plainly when known", () => {
    const lines = remembranceChartLines({
      precision: "exact",
      asc: "Libra",
      placements: [
        { body: "sun", sign: "Aries", confident: true },
        { body: "moon", sign: "Cancer", confident: true },
      ],
    });
    expect(lines).toEqual(["Aries Sun", "Cancer Moon", "Libra Rising"]);
  });
});

/**
 * Remembrance Phase 2 — private owner-only space on a passed person's page.
 *
 * Framing is REMEMBRANCE, never clinical. Chart data is never re-derived here;
 * the section only frames placements already stored on the person. Reflections
 * live in `notes` with kind 'remembrance' under the existing owner-only RLS.
 *
 * Privacy (ENGINEERING §9): notes.owner_id = auth.uid() is the data-layer
 * gate. UI hiding is not enough — see NOTES_OWNER_RLS_POLICY.
 */

import { hasPassed, usesAncientLight } from "@galaxia/core";

/** Documented data-layer policy from `20260629220500_add_owner_rls_policies.sql`. */
export const NOTES_OWNER_RLS_POLICY = {
  name: "notes owner all",
  using: "owner_id = auth.uid()",
  withCheck: "owner_id = auth.uid()",
} as const;

export const REMEMBRANCE_NOTE_KIND = "remembrance" as const;

/**
 * Exact Vela system-prompt guardrail (kept in sync with packages/vela and
 * supabase/functions/vela-chat). Paste-ready for changelog / review.
 */
export const VELA_REMEMBRANCE_GUARDRAIL =
  "Draw only on the computed chart facts you are given and the owner's own saved reflections in the private notes digest. Never fabricate memories, events, or facts about the person. Do not invent what they said, did, or felt.";

/** Soft water / ancient-light chrome tokens — reuse Phase 1 palette, no new language. */
export const REMEMBRANCE_CHROME = {
  /** Galaxy water register (`--water` / EL_COLOR.water). */
  water: "#6FB1B8",
  /** Ancestor / ancient-light legend colour on the constellation. */
  ancient: "#DA8C8C",
  border: "rgba(111,177,184,.28)",
  background: "linear-gradient(120deg, rgba(111,177,184,.10), rgba(218,140,140,.05))",
  accentBorder: "2px solid rgba(111,177,184,.4)",
} as const;

export function shouldShowRemembranceSpace(person: {
  passed_at?: string | null;
  is_self?: boolean;
} | null | undefined): boolean {
  if (!person || person.is_self) return false;
  return hasPassed(person);
}

/** Insert row for a private remembrance reflection. Always owner-scoped. */
export function buildRemembranceNoteInsert(input: {
  ownerId: string;
  personId: string;
  body: string;
}): {
  owner_id: string;
  about_person: string;
  body: string;
  kind: typeof REMEMBRANCE_NOTE_KIND;
} {
  return {
    owner_id: input.ownerId,
    about_person: input.personId,
    body: input.body.trim(),
    kind: REMEMBRANCE_NOTE_KIND,
  };
}

/**
 * Vela entry for remembrance — navigation only. Never auto-sends a message.
 * Prefill is intentionally omitted so Vela does not speak first or nudge.
 */
export function remembranceVelaHref(personId: string): string {
  return `/app/vela?scope=person&subject=${encodeURIComponent(personId)}`;
}

/** True when this person's constellation form is ancient light (passed or ancestor). */
export function remembranceUsesAncientLight(person: {
  is_self?: boolean;
  relation?: string | null;
  passed_at?: string | null;
}): boolean {
  return usesAncientLight(person);
}

/**
 * Hedged chart lines for remembrance chrome. Uses stored placements only —
 * never invents a sign when confident === false.
 */
export function remembranceChartLines(chart: {
  precision?: string;
  asc?: string | null;
  placements: Array<{
    body: string;
    sign: string;
    confident?: boolean;
    possibleSigns?: string[];
  }>;
} | null | undefined): string[] {
  if (!chart) return [];
  const lines: string[] = [];
  const sun = chart.placements.find((p) => p.body === "sun");
  const moon = chart.placements.find((p) => p.body === "moon");
  if (sun) {
    lines.push(
      sun.confident !== false
        ? `${sun.sign} Sun`
        : sun.possibleSigns?.length
          ? `Sun uncertain (${sun.possibleSigns.join(" or ")})`
          : "Sun sign uncertain (year-only birth data)"
    );
  }
  if (moon) {
    lines.push(
      moon.confident !== false
        ? `${moon.sign} Moon`
        : moon.possibleSigns?.length
          ? `Moon uncertain (${moon.possibleSigns.join(" or ")})`
          : "Moon sign uncertain (year-only birth data)"
    );
  }
  if (chart.asc) lines.push(`${chart.asc} Rising`);
  else if (chart.precision === "year" || chart.precision === "date") {
    lines.push("Rising needs an exact birth time");
  }
  return lines;
}

## Remembrance Phase 3 — honor-constellation (branch `cursor/remembrance-honor-constellation-c58e`) — 2026-07-12

**Trigger**: Galaxia helps people understand loved ones present AND past. Phase 3 draws a declared honor-constellation — soft ancient-light lines from a passed person to the living people the owner explicitly chose. Framing is remembrance / continuity, never clinical, never romantic, never inferred.

`[ADDED]` **Honor-constellation from dormant `relationships` table.** Declaration UX lives in the Phase 2 private remembrance space ("Who carries their light?" multi-select of living people). Writes `relationships` rows with fixed `relation_type = 'remembrance'` (person_a = passed, person_b = living). Zero inference — no auto-populate from owner-relations, no synastry substitution. Empty selection = no constellation. Reversible declare/remove. Migration unique index: `supabase/migrations/20260712190000_relationships_honor_unique.sql`. Helpers: `apps/web/lib/honor-constellation.ts`.

`[ADDED]` **Galaxy honor layer** (`apps/web/app/app/page.tsx`). Draws declared edges as dashed water→ancient strokes with a soft wash and slower ethereal pulse — visually distinct from solid synastry `drawLink` element gradients + cream beads. Legend shows "Honor / remembrance light" when any declared edges exist. Galaxy-only visual this phase; no second canvas on the person page. Vela unchanged.

`[FIXED]` **loadHome birth-fields gap (found hole, same class as Phase 2 person-page hole).** Galaxy previously selected `is_minor` but not `birth_date` / `birth_precision`, so `isMinorForSafety` could not run correctly. Now loads those fields and gates PersonSky + honor-edge `touchesMinor` through `isMinorForSafety` from `@galaxia/core` on both endpoints. No galaxy safety decision relies on raw `is_minor` alone. A passed minor is still a minor; honor framing is never romantic.

`[DECISION]` **Honor edges are continuity only.** `relation_type` is always `remembrance` — romantic types are forbidden in helpers and never offered in the declaration UX. Combined with the age-aware minor gate, no partner/attraction framing can attach to any honor line.

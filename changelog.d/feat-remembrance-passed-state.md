## Remembrance Phase 1 — passed state (branch `feat/remembrance-passed-state`) — 2026-07-12

**Trigger**: Galaxia helps people understand loved ones present AND past — a comfort for processing grief and relationships with those who are gone. This is the foundation for Remembrance. Framing is remembrance, never clinical "deceased/dead."

`[ADDED]` **`people.passed_at` (nullable timestamptz).** Reversible remembrance marker — NULL means present; a timestamp means remembered. Clearing it restores present. Chart rows are never touched by this column. Migration: `supabase/migrations/20260712153000_people_passed_at.sql`.

`[ADDED]` **Tender edit-flow Remembrance section** (`edit-person-panel.tsx`). Separate from Minor (never a plain checkbox beside it). Warm confirmation language; reverse path ("Hold them as present again"). Updates only `passed_at`. Hidden for self.

`[CHANGED]` **Galaxy ancient-light reuse for passed people.** Orbit helpers extracted to `apps/web/lib/galaxy-orbit.ts`. A passed person adopts the existing ancestor/"ancient light" form, outer ring (7), and water register — no new visual language. They stay on the constellation, person page, and Compare.

`[DECISION]` **Passed people remain fully comparable.** Remembrance is not removal. Chart data, person page, and Compare inclusion are preserved by design — intentional and core to the feature.

`[DECISION]` **Minor safety is orthogonal to remembrance.** `isMinorForSafety` does not read `passed_at`. A minor who has passed is still a minor; Compare's romantic-framing block holds unchanged. Covered by `apps/web/lib/galaxy-orbit.test.ts`.

## Remembrance Phase 2 — private remembrance space (branch `cursor/remembrance-space-28ad`) — 2026-07-12

**Trigger**: Galaxia helps people understand loved ones present AND past. Phase 2 adds a private, owner-only remembrance space on a passed person's page — reflections the owner writes, chart framing in ancient light, Vela only on request. Framing is remembrance, never clinical.

`[ADDED]` **`notes.kind = 'remembrance'`.** Extends the Relationship Record store (same owner-only RLS). Migration: `supabase/migrations/20260712180000_notes_kind_remembrance.sql`. Owner writes free-text reflections; nothing is generated or filled in.

`[ADDED]` **`RemembranceSpace` on `/app/person/[id]`.** Mounts when `hasPassed(person)`. Ancient-light chrome reuses water (`#6FB1B8`) and ancestor (`#DA8C8C`) tokens — page chrome, not a second renderer. Chart lines show stored placements with the same confidence hedging; no new placements derived.

`[ADDED]` **Vela on request only.** Entry is `/app/vela?scope=person&subject=…` with no `q` prefill and no auto-send. Prompt guardrail (packages/vela + `vela-chat` edge): draws only on computed chart facts and the owner's saved reflections digest; never fabricates memories. Digest remains capped at five notes (not full recall); remembrance notes are preferred when present.

`[FIXED]` **Person-page minor safety hole.** `/app/person/[id]` previously passed raw `person.is_minor` into transit `minorSafe`. Now uses `isMinorForSafety` from `@galaxia/core` (same shape as Vela/Compare). A passed minor is still a minor; no romantic framing in the remembrance space when minor.

`[DECISION]` **Privacy is data-layer.** Reflections use `notes` under existing `notes owner all` RLS (`owner_id = auth.uid()`). Vitest cannot spin a second-user JWT — cross-user denial is documented as policy + insert-payload assertion, not a live RLS integration test.

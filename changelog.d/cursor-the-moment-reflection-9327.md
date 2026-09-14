## The Moment (branch `cursor/the-moment-reflection-9327`) — 2026-09-14

**Trigger**: The Record could collect notes after the fact, but there was no sixty-second way to mark a living event with the sky that was actually present, so history never became irreplaceable.

`[DECISION]` **Phase 0 against live `notes` (eigfvribtntbxyjutsma).** Reuse `notes`. No parallel store. Linked person is `about_person` (and `pair_low`/`pair_high` when a self row exists). The sky is `transit_snapshot` jsonb, already on the table. Moment type is the existing `tags` column (one curated id), not `theme` (that stays `vela_pin`). `kind='moment'` is the only new discriminator. RLS stays `"notes owner all"` `FOR ALL` `using (owner_id = (select auth.uid()))` `with check` the same. Synastry is not attached: it does not move with the hour.

`[DECISION]` **Store the transit snapshot. Never recompute it from the timestamp.** The point of the entry is what was true then. Hits are `computeTransits` against each honest natal at save, 1.5° orb (same gate as Active today). Year-only, missing chart, and remembrance profiles are skipped, never guessed. If nothing significant was active, the reflection says the moment stands on its own. The moment type is not an input to the reflection, so the sky cannot be made to explain the event.

`[DECISION]` **Moment types.** Offered: hard conversation, breakthrough, conflict, celebration, silence that needed filling, something they said. `pattern_noticed` stays a journal tag only. New tag id: `silence_needed_filling`.

`[DECISION]` **Vela's reflection is deterministic copy, not an LLM call.** `reflectMoment` names at most two stored hits, or says the sky was quiet. Pinning writes `kind='vela_pin'` with `suggestPinTheme` (existing theme field). User-initiated only. No calendar. No automatic detection.

`[ADDED]` **Entry on constellation home and every person profile.** Three taps: person, type, optional two sentences plus save. After save: reflection, pin or skip. Moments appear in the person Record with type and stored transit context, searchable and filterable with the existing controls.

`[ADDED]` **`20260914270000_notes_moment_kind.sql`.** Extends `notes_kind_check` with `moment` and `notes_tags_allowed` with `silence_needed_filling`. No RLS change. Applied to eigfvribtntbxyjutsma. A second-user JWT probe returned `notes_visible_to_B=0` and `moments_visible_to_B=0`. Single remaining policy: `"notes owner all"`. Retest script: `docs/notes-moment-rls-retest.sql`.

## Vela group focus: real cohort context (branch `cursor/fix-vela-group-context-6c18`) — 2026-07-23

**Trigger**: "Ask Vela about this group" selected Focus=group and the right group, but the header named a single member (`people[0]`) and the edge never attached group identity or shared-sky / fault-line cohort data, so Vela answered as if about one person and asked who "we" was.

`[DECISION]` **Path (a): persist overlay, edge reads it.** `POST /api/groups/cohort` computes with `@galaxia/astro` `cohortOverlay` (same engine as Groups) and upserts `notes.kind = cohort_reading` with `payload.source = "vela_cohort_current"`. `vela-chat` reads that row. No Deno reimplementation of shared-sky math; client-built chat `context` is not trusted.

`[FIXED]` **Group Ask Vela header names the group.** `scope === "group"` uses `groups.find(...).name`; it no longer falls through to `people[0]`. Person and pair headers unchanged.

`[FIXED]` **Group Vela context includes group name, all member people blobs, and cohort (`sharedSky`, `faultLines`, `members`).** Prompt frame tells Vela "we" means every listed member; no "who is we" default to one person.

`[FIXED]` **Group + minor clamps romantic `relationshipType`.** Edge mirrors Compare's `isRomanticRelation` (plus free-text `partner`) and forces `general` when any scoped group member is a minor via existing `isMinorForSafety`.

`[FIXED]` **Group threads include `group_id` notes in the private-notes digest** (ask mode), same filter pattern as person/pair.

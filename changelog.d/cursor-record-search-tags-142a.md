## Record search, dates, and curated tags (branch `cursor/record-search-tags-142a`) — 2026-09-14

**Trigger**: The Record on a person page was a flat, unsearchable list of the latest 40 entries. Dates existed as `toLocaleDateString()` but were not grouped, and there was no way to find a hard conversation months later.

`[DECISION]` **Phase 0 against live `notes` (eigfvribtntbxyjutsma).** `body` is plaintext `text not null` (not encrypted at rest). RLS is a single owner-only policy `"notes owner all"` `FOR ALL` `using (owner_id = (select auth.uid()))` `with check` the same. Indexes were `notes_pkey`, `notes_owner_id_idx`, `notes_about_person_created_at_idx`, and `notes_groups_current_roster_uidx`. Eight rows. Because body is plaintext, server-side Postgres FTS is possible and this branch uses it. Conversations still filter on the loaded preview (threads are not `notes.body`).

`[ADDED]` **Full-text search, month groups, date range, and six curated tags** on the person Record. Compose box (textarea + "Add to the record") is unchanged; tags attach to existing notes. The loaded set is filtered in the client so an unmatched search cannot hide the filters behind the empty Record state. Server FTS (`plainto_tsquery` on `notes.body`) widens the loaded set with older hits. Conversations match on the preview text. Tag ids: hard conversation, breakthrough, conflict, celebration, pattern noticed, something they said. Free-text tags are out of scope.

`[ADDED]` **Search index** `notes_body_fts_idx` (`GIN to_tsvector('english', body)`) plus `notes.tags text[]` and `notes_tags_gin_idx` in `20260914200000_notes_record_search_tags.sql`. No RLS change. A stranger JWT probe on production returned `notes_visible_to_stranger=0`. Retest script: `docs/notes-rls-cross-user-retest.sql`.

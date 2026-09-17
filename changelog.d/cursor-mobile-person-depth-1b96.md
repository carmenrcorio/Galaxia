## Phase 5 mobile person depth (branch `cursor/mobile-person-depth-1b96`) — 2026-09-17

**Trigger**: Twin spec Phase 5 after constellation (`#336`). Signed-in person page on Expo matches web tables, writes, and copy. Accept of Connect stays on web `/connect/[token]`.

`[ADDED]` **Today cards on profile.** Living people load `person_daily_nudges` with frozen `copy_resolved` (`buildPersonDailyNudge` / `ignoreDuplicates`). Year-only empty uses `DAILY_SKY_UNAVAILABLE_YEAR_*`. Vela pins (`notes.kind = vela_pin`) sit beside Right now, above the Them | Yours (or Remembrance) strip. Today is never a selected tab.

`[ADDED]` **EditPerson port.** Same people columns as web (birth, `star_color` / `star_scale`, `custom_position` reset). `searchPlaces` pick is required; no silent geocode. `passed_at` is a separate remembrance write that never touches the chart. Delete stays `delete_own_person`.

`[ADDED]` **Remembrance / timeline / honor / edges.** Reflections insert `notes` kind `remembrance`. Memorial constellation picker writes `people.memorial_constellation`. Timeline uses `memorial_milestones` + `died_on`. Honor and declared bonds use un-narrowed `relationships` selects and core insert helpers (`buildHonorRelationshipInsert`, `buildRelationshipInsert`).

`[ADDED]` **Connect send + pending list.** `create_connect_invite` + `siteUrlFor("connect/"+token)` + Share. Settings lists pending `constellation_connect` invites and `revoke_connect_invite`. Accept remains web.

`[TESTED]` Connect gates, person-depth wiring, safety-parity Today-above-strip. Typecheck + mobile Vitest. Device unverified (Cloud Agent cannot prove native UI).

`[OPEN]` Device unverified. Phase 6 is Store.

## Groups save/edit/preview: loaded-group source of truth (branch `cursor/groups-loaded-state-rebuild-0e5d`) — 2026-07-23

**Trigger**: Groups save/edit/preview had three compounding bugs from one root cause: form fields, selected id, and reading panel were disconnected `useState` slices with insert-only save, so load blanked name/type (duplicate risk), post-save kept the old reading, and dirty overlays were titled as the saved group.

`[DECISION]` **Single `loadedGroup` model.** Web and mobile Groups use `loadedGroup: { id, name, kind, memberIds } | null` plus working form state. Selection highlight, save create-vs-update, and preview titles all derive from it. No more scattered `selectedGroupId` coupling.

`[FIXED]` **Load populates name and kind**, not only members. Closing the blank-form path that created duplicate groups on Save.

`[FIXED]` **Save is explicit create vs update.** Loaded group → `UPDATE` same id and reconcile `group_members`. Create only when `loadedGroup` is null. **New group** clears the loaded model so create cannot happen silently while editing.

`[FIXED]` **Post-save reading sync.** After create or update, the cohort overlay rebuilds for the group just saved so the panel cannot show a previous group.

`[FIXED]` **Dirty preview labels (FOUNDER-REVIEW).** Unsaved composition titles: `Unsaved preview, based on {group name}` when a group is loaded and dirty; `Unsaved preview` with no loaded group; saved name when clean. Preview/overlay stay local-only; DB writes only on explicit save.

`[CHANGED]` **Same rebuild on web and mobile** (`apps/web/app/app/groups/page.tsx`, `apps/mobile/app/groups.tsx`). Mobile also auto-builds overlay on load (trivial parity). `isMinorForSafety` on group Ask-Vela / edge paths is unchanged.

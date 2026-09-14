## Person chip colors from sun sign (branch `cursor/person-chip-colors-8295`) — 2026-09-14

**Trigger**: Person initial chips hashed the display name into six unrelated gradients, so two water-sign people could match by accident and a chip on Compare would not agree with the same person on a transit card. Constellation nodes already had a single resolver; chips did not.

`[ADDED]` **`personChipColor` in `@galaxia/core`.** Derives fill from the confident tropical Sun first: element family (fire / earth / air / water) using the same hexes as `ELEMENT_NODE_COLORS` / constellation nodes, then a per-sign mix inside that family so Cancer and Pisces are not identical. No chart yet → stable `hash01(person id)` into the same 12-sign palette. Initial ink is chosen for ≥4.5:1 on the fill; every fill is ≥3:1 on `--ink` / `--ink2`.

`[CHANGED]` **Every person chip renders through that helper.** Web `InitialAvatar` and a new mobile `InitialAvatar` take `personId` + `sunSign` + `memorial`. Call sites: profiles, Compare selector, Vela focus, group selector / member chips / chart grid / generational map, transit cards (web `MemorialMark` stays beside the chip; mobile this-week overlays ✦ on the chip), home Today-in-your-sky and Resume-a-thread, marketing mocks. No component invents a local color. The old name-hash `avatarColorClass` / `.av-0`…`.av-5` path is gone.

`[DECISION]` **Canvas and chips share the palette, not the assignment.** Constellation nodes stay `resolveNodeColor` (user `star_color`, else self-gold, else `elementFromRelation`) so bond-type rings keep their existing visual language. Chips use the Sun so people of the same relation are still distinct. User-picked `star_color` remains a constellation override, not a chip override.

`[DECISION]` **Memorial is never color-only.** `InitialAvatar` can overlay the gold ✦; existing nearby marks (`MemorialMark`, chart-grid ✦, “remembered” copy) stay. The display name remains next to the chip wherever the layout already had it.

`[DECISION]` **No light theme to dual-check.** `globals.css` is navy-only (`--ink` `#0a0717`). Contrast is locked against that canvas and `--ink2` cards.

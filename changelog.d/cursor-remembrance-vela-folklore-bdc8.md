## Remembrance: one Vela entry + folklore in collapsed row (branch `cursor/remembrance-vela-folklore-bdc8`) — 2026-07-24

**Trigger**: Remembrance person pages still showed a second "Vela on {name}" card under RemembranceSpace (empty-state copy read as another Ask Vela entry). Collapsing the constellation picker (#110) also hid the chosen pattern's summary and myth — the whimsy of the feature.

`[FIXED]` **Single Vela entry on remembrance pages.** The empty "Vela on {name}" section no longer mounts when RemembranceSpace is present (`showVelaOnThem = !showRemembrance || velaPins.length > 0`). The sole Ask Vela CTA stays inside RemembranceSpace. Pins / reopen still render when pinned insights exist; living person pages unchanged.

`[CHANGED]` **Collapsed constellation row shows summary + myth.** Glyph, name, one-line sky description, and curated myth stay visible without expanding. Ancient light keeps noneHelper + noneMyth. Change still opens the full library.

`[CHANGED]` **Founder-approved Greco-Roman myths for all 16 library entries.** Static curated copy in `@galaxia/core` `MEMORIAL_CONSTELLATIONS` — never generated. Locked by unit test against the exact approved strings.

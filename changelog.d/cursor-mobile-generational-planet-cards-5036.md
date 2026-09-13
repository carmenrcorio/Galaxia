## Mobile Compare: per-planet generational cards (branch `cursor/mobile-generational-planet-cards-5036`) — 2026-09-13

**Trigger**: After the web `/app/compare` work, mobile Compare still rendered a single compact generational block and duplicated `generational.theme` inside an `ancestralHeadline` ("This connection spans different eras. The generational layer is the headline."). Parent-child and ancestor pairings never got the per-planet cards web's `GenerationalSection` already shows.

`[ADDED]` **Native `GenerationalSection` on mobile Compare.** For each diverged outer planet it renders the same lookup as web: `genFrame().domain` (theme), `frame.diverged` (watch-for / guidance), and the `You:` / `Them:` proof line from `genPlacement` essences. Shared placements get essence + shared guidance + planet-in-sign proof. Mix-selected `genHeadline` replaces the old `theme` ternary. Lookup only; `GEN_PLANET_FRAMES` / `GEN_PLACEMENTS` are not modified.

`[FIXED]` **Removed the duplicate ancestral headline on mobile.** `ancestralHeadline` is no longer constructed or rendered. The era sentence + appended `theme` cannot appear twice, because it is not authored on this surface at all.

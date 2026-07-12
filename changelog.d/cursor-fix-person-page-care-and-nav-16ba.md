## Person page care + nav: no live sky for passed (branch `cursor/fix-person-page-care-and-nav-16ba`) — 2026-07-12

**Trigger**: The person page showed "Active today" (live current transits) and present-tense "what's happening now" content for a passed person — devastating in a grief context and wrong; they are not having a current day. The same care hole appeared unbidden on home "Today in your sky". The page was also hard to navigate, and the Phase 3 "who carries their light?" box competed with the chart near the top.

`[FIXED]` **Two care holes closed — person page Active today + home Today in your sky.** For anyone with `passed_at` set, live transit machinery does not run and those surfaces do not render. Hide cleanly; no replacement "on this day" widget. Enduring natal chart (wheel, big three, placements, aspects, houses, generational) still renders, with light remembrance framing on section eyebrows (`· who they were`). Interpretation library copy was not rewritten to past tense (out of scope).

`[CHANGED]` **Honor-declaration box moved to the bottom of the person page.** Private Remembrance reflections stay in `RemembranceSpace` (higher up, easy to reach). Only "Who carries their light?" is last. A top pill jumps to `#honor-light`.

`[ADDED]` **Phone-first sticky chart quick-nav** (`ChartSectionNav`): horizontal wrapping chip rail (not a sidebar). Anchors only for sections that actually render for that person — a passed person's nav never lists "Active today"; honor box is included when shown. Nav and content stay in sync via `buildPersonPageNavSections`.

`[OPEN]` **Mobile home parallel care hole (follow-up, not fixed here).** `apps/mobile/app/index.tsx` still runs the same per-person transit loop for "Today in your sky" and has no `passed_at` wiring. The same grief-context bug will exist when remembrance reaches mobile — exclude passed people from that sky the same way as web home.

Safety: `isMinorForSafety` unchanged; a passed minor is still a minor. No fabrication; low-precision births stay hedged.

## Person page hero, flip tiles, exclude from dailies (branch `cursor/person-hero-exclude-dailies-e7a4`) — 2026-09-25

**Trigger**: Minor associates were always in Today / the morning note. The natal wheel sat inside Who they are, and constellation lines took a whole bar above Compare. Sign tiles did not say what the placement means.

`[ADDED]` **`people.exclude_from_dailies`** — boolean, default false. Owner opt-out for Today in your sky and the morning daily note only. This Week, the Sunday letter, and the constellation are unchanged. Remembered people stay out via `passed_at`. Toggle lives under name / relation / minor in Edit. Hidden once someone is remembered. FOUNDER-REVIEW copy: "Leave out of Today and the daily note."

`[CHANGED]` **`peopleForTodaySky`** now also drops `exclude_from_dailies === true`. Home (web + mobile) and `nudge-compute` already call this helper, so the filter is one place.

`[CHANGED]` **Person page hero.** Natal wheel + Sun / Moon / Rising tiles sit under Compare / Invite / Ask Vela / Edit. Right now stays under the hero. Ask about them moves to the end of the page (Ask Vela is already a header bubble). Lines on the constellation live inside Edit, not a top bar.

`[ADDED]` **Top sign cards flip.** The Sun / Moon / Rising cards under the name (and at the top of Quick Chart) flip on hover, focus, or tap to the curated `interpretPlacement` / `interpretRising` reading. The tiles under the wheel stay a static shareable graphic. `prefers-reduced-motion` swaps faces without a 3D rotate.

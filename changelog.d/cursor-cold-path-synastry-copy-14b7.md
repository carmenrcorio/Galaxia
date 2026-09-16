## Cold path reads as synastry, not compatibility (branch `cursor/cold-path-synastry-copy-14b7`) — 2026-09-16

**Trigger**: A GTM readiness audit scored the public chart cold path 3/10. A journalist landing on `/chart/compare` read "Check your compatibility, free," which contradicts the product thesis (a structural map of two people, not a score). The shared birth form also told visitors to "set tzOffsetMin."

`[CHANGED]` **Public chart copy now says synastry, not compatibility.** `/chart`, `/chart/compare`, the `/s` compare snapshot, related-link labels, and share disclosure strings no longer sell a compatibility score. Mode tab: "Compare two charts." Submit: "Compare our charts." Share title: "A shared synastry reading." PNG fallback: `synastry-chart.png`. Page metadata on `/chart/compare` is unchanged (layer two; ENGINEERING.md §17).

`[FIXED]` **Birth form no longer names `tzOffsetMin`.** Manual coordinates now say to search for the birth city first: coordinates alone do not set the time zone. Exact-time submit was already blocked by `buildBirthInput` (ENGINEERING.md §8/§12); this does not guess a zone.

`[CHANGED]` **`/chart` name field no longer clips at 375px.** Placeholder is "Name (optional)" with a helper line under the field: "Shown only to you. Never saved or shared."
